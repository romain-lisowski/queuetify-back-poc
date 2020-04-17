const express = require("express");
const helmet = require("helmet");
const socketIO = require("socket.io");
const admin = require("firebase-admin");
var { DateTime } = require('luxon');

// server
const PORT = process.env.PORT || 3000;
const app = express();
app.use(helmet);
const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// firebase
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://queue-1befa.firebaseio.com"
});
const db = admin.firestore();

// socket IO
const io = socketIO(server);
io.on("connection", (socket) => {
  io.emit("CONNECTED", socket.id);

  socket.on("disconnect", () => {
    io.emit("DISCONNECTED", socket.id);
  });

  socket.on("E_USER_CONNECTED", (data) => {
    console.log(`E_USER_CONNECTED : ${socket.id}-${data}`);
    io.emit("USER_CONNECTED", data);
  });

  socket.on("E_VOTE_TRACK", () => {
    io.emit("VOTE_TRACK");
  });

  socket.on("E_ADD_TRACK", () => {
    io.emit("ADD_TRACK");
  });

});

// main
let currentTrack = null; 
async function checkState() {
  if (currentTrack === null) {
    currentTrack = await getCurrentOrNextTrack();
    console.log(currentTrack);
  } else {
    // next track if current_track end
    let endTrackDate = DateTime.fromSeconds(currentTrack.played.seconds + (currentTrack.duration / 1000));
    if (DateTime.local().setZone("utc") >= endTrackDate) {
      currentTrack = null;
    }
  }
  setTimeout(checkState, 2000);
}
setTimeout(checkState, 2000);

// get track or go to next track
async function getCurrentOrNextTrack() {
  let track = await getCurrentTrack();
  if (track === null) {
    track = await getNextTrack();
  } 
  return track;
}

// get track playing
async function getCurrentTrack() {
  const querySnapshot = await db.collection("current_tracks").where("room", "==", "room1").limit(1).get();
  
  querySnapshot.forEach(doc => {
    const track = doc.data();
    return track;
  });
  return null;
}

// remove current track and add one from queue if not empty
async function getNextTrack() {
  let nextTrack = null;

  // check if a track is queued
  const tracks = await getTracks();
  if (tracks.length > 0) {
    nextTrack = tracks[0];
    await removeTrack(nextTrack);
  }

  // change current track
  await removeCurrentTrack();
  if (nextTrack) {
    // add new current track and add played timestamp
    await db.collection("current_tracks").add({
      ...nextTrack,
      played: admin.firestore.FieldValue.serverTimestamp()
    }).then(async ref => {
      const snapshot = await ref.get();
      nextTrack = snapshot.data();
      io.emit("NEXT_TRACK", nextTrack);
    });
  }

  return nextTrack;
}

// get tracks queued
async function getTracks() {
  const tracks = [];
  const querySnapshot = await db.collection("tracks").where("room", "==", "room1").orderBy("vote", "desc").orderBy("created", "asc").get();  
  querySnapshot.forEach(doc => {
    tracks.push(doc.data());
  });
  return tracks;
}

// remove current track
async function removeCurrentTrack() {
  const querySnapshot = await db.collection("current_tracks").where("room", "==", "room1").get();  
  querySnapshot.forEach(doc => {
    doc.ref.delete();
    io.emit("NEXT_TRACK");
  });
}

// remove track from queue
async function removeTrack(track) {
  const querySnapshot = await db.collection("tracks").where("room", "==", "room1").where("id", "==", track.id).get()
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}
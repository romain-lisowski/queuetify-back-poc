require("@firebase/firestore");
require("dotenv").config();
const { DateTime } = require("luxon");
const { firebase } = require("@firebase/app");

// firebase
const firebaseApp = firebase.initializeApp({
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  databaseURL: process.env.FIREBASE_DATABASEURL,
  projectId: process.env.FIREBASE_PROJECTID,
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
  appId: process.env.FIREBASE_APPID,
  measurementId: process.env.FIREBASE_MEASUREMENTID
});

const db = firebaseApp.firestore();

// get track or go to next track
async function getCurrentOrNextTrack(roomName) {
  let track = await getCurrentTrack(roomName);

  if (track === null) {
    track = await getNextTrack(roomName);
  } else {
    let endTrackDate = DateTime.fromSeconds(track.played.seconds + (track.duration / 1000));
    let now = DateTime.local().setZone("utc");
    if (now >= endTrackDate) {
      track = await getNextTrack(roomName);
    }
  }
  return track;
}

// get track playing
async function getCurrentTrack(roomName) {
  let track = null;
  const querySnapshot = await db.collection("current_tracks").where("room", "==", roomName).limit(1).get();
  querySnapshot.forEach(doc => {
    track = doc.data();
  });
  return track;
}

// remove current track
async function removeCurrentTrack(roomName) {
  const querySnapshot = await db.collection("current_tracks").where("room", "==", roomName).get();
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}

// remove current track and add one from queue if not empty
async function getNextTrack(roomName) {
  let track = null;

  // check if a track is queued
  const tracks = await getTracks(roomName);
  if (tracks.length > 0) {
    track = tracks[0];
    await removeTrack(roomName, track);
  }

  // change current track
  await removeCurrentTrack(roomName);
  if (track) {
    // add new current track and add played timestamp
    await db.collection("current_tracks").add({
      ...track,
      played: firebase.firestore.FieldValue.serverTimestamp()
    }).then(async ref => {
      const snapshot = await ref.get();
      track = snapshot.data();
    });
  }

  return track;
}

// get rooms available
async function getRooms() {
  const rooms = [];
  const querySnapshot = await db.collection("rooms").orderBy("name", "asc").orderBy("created", "asc").get();
  querySnapshot.forEach(doc => {
    rooms.push(doc.data());
  });
  return rooms;
}

// get tracks queued
async function getTracks(roomName) {
  const tracks = [];
  const querySnapshot = await db.collection("tracks").where("room", "==", roomName).orderBy("vote", "desc").orderBy("created", "asc").get();
  querySnapshot.forEach(doc => {
    tracks.push(doc.data());
  });
  return tracks;
}

// add track to queue
async function addTrack(roomName, track) {
  await db.collection("tracks").add({
    ...track,
    room: roomName,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// remove track
async function removeTrack(roomName, track) {
  const querySnapshot = await db.collection("tracks").where("room", "==", roomName).where("id", "==", track.id).get();
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}

// vote for a track
async function voteTrack(roomName, track, increment, spotifyUser) {
  const querySnapshot = await db
    .collection("tracks")
    .where("room", "==", roomName)
    .where("id", "==", track.id)
    .get();

  querySnapshot.forEach(async doc => {
    await doc.ref.update({
      vote: track.vote + increment,
      voters: firebase.firestore.FieldValue.arrayUnion({
        ...spotifyUser,
        increment: increment
      })
    });
  });
}

// get users of a room
async function getUsers(roomName) {
  const users = [];
  const querySnapshot = await db
    .collection("users")
    .where("room", "==", roomName)
    .get();

  querySnapshot.forEach(doc => {
    users.push(doc.data());
  });

  return users;
}

// add user in a room
async function addUser(roomName, user) {
  await db
    .collection("users")
    .doc(user.spotify_id)
    .set({
      ...user,
      room: roomName
    });
}

// remove user from room
async function removeUser(roomName, user) {
  const querySnapshot = await db
    .collection("users")
    .where("room", "==", roomName)
    .where("spotify_id", "==", user.spotify_id)
    .get();
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}

module.exports = {
  getRooms,
  getCurrentOrNextTrack,
  getCurrentTrack,
  getTracks,
  addTrack,
  removeTrack,
  voteTrack,
  getUsers,
  addUser,
  removeUser
};
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
async function getCurrentOrNextTrack() {
  let track = await getCurrentTrack();

  if (track === null) {
    track = await getNextTrack();
  } else {
    let endTrackDate = DateTime.fromSeconds(track.played.seconds + (track.duration / 1000));
    let now = DateTime.local().setZone("utc");
    if (now >= endTrackDate) {
      track = await getNextTrack();
    }
  }
  return track;
}

// get track playing
async function getCurrentTrack() {
  let track = null;
  const querySnapshot = await db.collection("current_tracks").where("room", "==", "room1").limit(1).get();
  querySnapshot.forEach(doc => {
    track = doc.data();
  });
  return track;
}

// remove current track
async function removeCurrentTrack() {
  const querySnapshot = await db.collection("current_tracks").where("room", "==", "room1").get();
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}

// remove current track and add one from queue if not empty
async function getNextTrack() {
  let track = null;

  // check if a track is queued
  const tracks = await getTracks();
  if (tracks.length > 0) {
    track = tracks[0];
    await removeTrack(track);
  }

  // change current track
  await removeCurrentTrack();
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

// get tracks queued
async function getTracks() {
  const tracks = [];
  const querySnapshot = await db.collection("tracks").where("room", "==", "room1").orderBy("vote", "desc").orderBy("created", "asc").get();
  querySnapshot.forEach(doc => {
    tracks.push(doc.data());
  });
  return tracks;
}

// remove track from queue
async function removeTrack(track) {
  const querySnapshot = await db.collection("tracks").where("room", "==", "room1").where("id", "==", track.id).get();
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}

async function addTrack(track) {
  await db.collection("tracks").add({
    ...track,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function voteTrack(track, increment, spotifyUser) {
  const querySnapshot = await db
    .collection("tracks")
    .where("room", "==", "room1")
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

async function getUsers() {
  const users = [];
  const querySnapshot = await db
    .collection("users")
    .where("room", "==", "room1")
    .get();

  querySnapshot.forEach(doc => {
    users.push(doc.data());
  });

  return users;
}

async function addUser(user) {
  await db
    .collection("users")
    .doc(user.spotify_id)
    .set({
      room: "room1",
      spotify_id: user.spotify_id,
      name: user.name,
      spotify_url: user.spotify_url,
      image: user.image
    });
}

async function removeUser(user) {
  const querySnapshot = await db
    .collection("users")
    .where("room", "==", "room1")
    .where("spotify_id", "==", user.spotify_id)
    .get();
  querySnapshot.forEach(doc => {
    doc.ref.delete();
  });
}

module.exports = {
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
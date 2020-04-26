const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const firebase = require("./firebase");

// init app
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Default headers
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE");
  next();
});

// Get current track
app.get('/current_track', async (req, res, next) => {
  const track = await firebase.getCurrentTrack();
  res.json(track);
  next();
})

// Get tracks
app.get('/tracks', async (req, res, next) => {
  const tracks = await firebase.getTracks();
  res.json(tracks);
  next();
})

// Add track
app.post('/tracks', async (req, res, next) => {
  const io = req.app.get('socketio');
  const track = req.body.track;
  await firebase.addTrack(track);

  res.json("Track added");
  io.emit("REFRESH_TRACKS");
  next();
})

// vote track
app.post('/tracks/vote', async (req, res, next) => {
  const io = req.app.get('socketio');
  const track = req.body.track;
  const increment = req.body.increment;
  const spotifyUser = req.body.spotifyUser;
  await firebase.voteTrack(track, increment, spotifyUser);

  res.json("Track voted");
  io.emit("REFRESH_TRACKS");
  next();
})

// users
app.get('/users', async (req, res, next) => {
  const users = await firebase.getUsers();
  res.json(users);
  next();
})

// add user
app.post('/users', async (req, res, next) => {
  const io = req.app.get('socketio');
  const user = req.body.user;
  await firebase.addUser(user);

  res.json("User added");
  io.emit("REFRESH_USERS");
  next();
})

// remove user
app.delete('/users', async (req, res, next) => {
  const io = req.app.get('socketio');
  const user = req.body.user;
  await firebase.removeUser(user);

  res.json("User removed");
  io.emit("REFRESH_USERS");
  next();
});

module.exports = app;
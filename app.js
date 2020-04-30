const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const firebase = require("./firebase");

// init app
const app = express();
app.set("trust proxy", 1);
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

// Get rooms
app.get("/rooms", async (req, res, next) => {
  const rooms = await firebase.getRooms();
  res.json(rooms);
  next();
});

// Get current track
app.get("/current_track/:room", async (req, res, next) => {
  const track = await firebase.getCurrentTrack(req.params.room);
  res.json(track);
  next();
});

// Get tracks
app.get("/tracks/:room", async (req, res, next) => {
  const tracks = await firebase.getTracks(req.params.room);
  res.json(tracks);
  next();
});

// Add track
app.post("/tracks/:room", async (req, res, next) => {
  const io = req.app.get("socketio");
  const track = req.body.track;
  await firebase.addTrack(req.params.room, track);

  res.json("Track added");
  io.to(req.params.room).emit("REFRESH_TRACKS");
  next();
});

// remove track
app.delete("/tracks/:room", async (req, res, next) => {
  const io = req.app.get("socketio");
  const track = req.body.track;
  await firebase.removeTrack(req.params.room, track);

  res.json("User removed");
  io.to(req.params.room).emit("REFRESH_TRACKS");
  next();
});

// vote track
app.post("/tracks/vote/:room", async (req, res, next) => {
  const io = req.app.get("socketio");
  const track = req.body.track;
  const increment = req.body.increment;
  const spotifyUser = req.body.spotifyUser;
  await firebase.voteTrack(req.params.room, track, increment, spotifyUser);

  res.json("Track voted");
  io.to(req.params.room).emit("REFRESH_TRACKS");
  next();
});

// users
app.get("/users/:room", async (req, res, next) => {
  const users = await firebase.getUsers(req.params.room);
  res.json(users);
  next();
});

// add user
app.post("/users/:room", async (req, res, next) => {
  const io = req.app.get("socketio");
  const user = req.body.user;
  await firebase.addUser(req.params.room, user);

  res.json("User added");
  io.to(req.params.room).emit("REFRESH_USERS");
  next();
});

// remove user
app.delete("/users/:room", async (req, res, next) => {
  const io = req.app.get("socketio");
  const user = req.body.user;
  await firebase.removeUser(req.params.room, user);

  res.json("User removed");
  io.to(req.params.room).emit("REFRESH_USERS");
  next();
});

module.exports = app;
const app = require("./app");
const socketIO = require("socket.io");
const { DateTime } = require("luxon");
const firebase = require("./firebase");

// server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// socket IO
const io = socketIO(server);
io.on("connection", (socket) => {
  io.emit("CONNECTED", socket.id);

  socket.on("disconnect", () => {
    io.emit("DISCONNECTED", socket.id);
  });
});

app.set("socketio", io);

let playingTrack = null;
const roomName = "Room1";
async function run() {
  if (playingTrack === null) {
    playingTrack = await firebase.getCurrentOrNextTrack(roomName);
    if (playingTrack) {
      console.log("> " + playingTrack.name);
      io.emit("REFRESH_CURRENT_TRACK");
      io.emit("REFRESH_TRACKS");
    }
    console.log(".");
  } else {
    // next track if current_track end
    let endTrackDate = DateTime.fromSeconds(playingTrack.played.seconds + (playingTrack.duration / 1000));
    let now = DateTime.local().setZone("utc");
    console.log(
      playingTrack.name + " - " +
      now.c.minute + ":" +
      now.c.second + "|" +
      endTrackDate.c.minute + ":" +
      endTrackDate.c.second
    );
    if (now >= endTrackDate) {
      playingTrack = null;
      io.emit("REFRESH_CURRENT_TRACK");
      io.emit("REFRESH_TRACKS");
    }
  }
  setTimeout(run, 2000);
}
setTimeout(run, 2000);
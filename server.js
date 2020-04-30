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

  socket.on("LEAVE", roomName => {
    socket.leave(roomName);
  });
  socket.on("JOIN", roomName => {
    socket.join(roomName);
  });

  socket.on("disconnect", () => {
    io.emit("DISCONNECTED", socket.id);
  });
});

app.set("socketio", io);

let playingTracks = {
  "Room1": null,
};

async function run() {
  for (let roomName in playingTracks) {
    if (playingTracks[roomName] === null) {
      playingTracks[roomName] = await firebase.getCurrentOrNextTrack(roomName);
      if (playingTracks[roomName]) {
        io.to(roomName).emit("REFRESH_CURRENT_TRACK");
        io.to(roomName).emit("REFRESH_TRACKS");
      }
    } else {
      // next track if current_track end
      let endTrackDate = DateTime.fromSeconds(playingTracks[roomName].played.seconds + (playingTracks[roomName].duration / 1000));
      let now = DateTime.local().setZone("utc");
      if (now >= endTrackDate) {
        playingTracks[roomName] = null;
        io.to(roomName).emit("REFRESH_CURRENT_TRACK");
        io.to(roomName).emit("REFRESH_TRACKS");
      }
    }
    setTimeout(run, 2000);
  }
}
setTimeout(run, 2000);

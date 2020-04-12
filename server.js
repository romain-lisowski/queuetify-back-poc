"use strict";

const express = require("express");
const socketIO = require("socket.io");

const PORT = process.env.PORT || 3000;

const server = express().listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

// eslint-disable-next-line no-unused-vars
io.on("connection", socket => {
  console.log("CONNECTED : ", socket.id);
  io.emit("CONNECTED", socket.id);

  socket.on("disconnect", () => {
    console.log("DISCONNECTED : ", socket.id);
    io.emit("DISCONNECTED", socket.id);
  });

  socket.on("E_USER_CONNECTED", data => {
    console.log("E_USER_CONNECTED : " + socket.id + "-" + data);
    io.emit("USER_CONNECTED", data);
  });

  socket.on("E_VOTE_TRACK", () => {
    console.log("E_VOTE_TRACK : ", socket.id);
    io.emit("VOTE_TRACK");
  });

  socket.on("E_ADD_TRACK", () => {
    console.log("E_ADD_TRACK : ", socket.id);
    io.emit("ADD_TRACK");
  });

  socket.on("E_NEXT_TRACK", data => {
    console.log("E_NEXT_TRACK : " + socket.id + "-" + data);
    io.emit("NEXT_TRACK", data);
  });
});
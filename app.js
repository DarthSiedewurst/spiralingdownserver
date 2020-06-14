const fs = require("fs");
const app = require("express")();

let options = {};
let https = null;
try {
  options = {
    key: fs.readFileSync("./certs/privkey1.pem"),
    cert: fs.readFileSync("./certs/fullchain1.pem"),
  };
  https = require("https");
} catch (e) {
  console.log(e);
  console.log("Zertifikate nicht erreichbar");
  https = require("http");
}

const server = https.createServer(options, app);
server.listen(3000);

let Players = [];

const io = require("socket.io").listen(server);
io.sockets.adapter.rooms.players = [];
io.sockets.adapter.rooms.ruleset = "";

io.sockets.on("connection", (gameRoom) => {
  console.log("Connected");

  gameRoom.on("joinLobby", (lobby) => {
    console.log("Lobby Joined: " + lobby);
    gameRoom.adapter.rooms.lobby = lobby;

    gameRoom.join(lobby);
    gameRoom.emit("lobbyJoined", "You have sucessfully joined: " + lobby);
    io.sockets.in(lobby).emit("playersUpdated", io.sockets.adapter.rooms[lobby].players);
    io.sockets.in(lobby).emit("rulesetUpdated", io.sockets.adapter.rooms[lobby].ruleset);

    gameRoom.on("startGame", () => {
      io.sockets.in(lobby).emit("gameStarted");
    });

    // Players
    gameRoom.on("addPlayerToSocket", (newPlayer) => {
      const lobby = gameRoom.adapter.rooms.lobby;
      let players = [];

      if (io.sockets.adapter.rooms[lobby].players !== undefined) {
        players = io.sockets.adapter.rooms[lobby].players;
      }
      const newPlayers = players;

      newPlayers.push(newPlayer);
      players = newPlayers;
      io.sockets.adapter.rooms[lobby].players = players;
      io.sockets.in(lobby).emit("playersUpdated", players);
    });

    gameRoom.on("getPlayerFromSocket", () => {
      io.sockets
        .in(gameRoom.adapter.rooms.lobby)
        .emit("playersUpdated", io.sockets.adapter.rooms[gameRoom.adapter.rooms.lobby].players);
    });

    // Ruleset
    gameRoom.on("setRulesetToSocket", (ruleset) => {
      const lobby = gameRoom.adapter.rooms.lobby;
      io.sockets.adapter.rooms[lobby].ruleset = ruleset;

      io.sockets.in(lobby).emit("rulesetUpdated", io.sockets.adapter.rooms[lobby].ruleset);
    });
    // Dice
    gameRoom.on("moveInSocket", (payload) => {
      const lobby = gameRoom.adapter.rooms.lobby;
      let players = payload.players;

      players[payload.playerId].tile = payload.players[payload.playerId].tile + payload.roll;

      io.sockets.adapter.rooms[lobby].players = players;

      io.sockets.in(lobby).emit("diceWasRolled", { roll: payload.roll, playerId: payload.playerId, players });
    });
    gameRoom.on("okClicked", () => {
      const lobby = gameRoom.adapter.rooms.lobby;
      io.sockets.in(lobby).emit("okHasBeenClicked");
    });
  });
});

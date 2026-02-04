// server.js
import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });
const MIN_PLAYERS = 2;

let players = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws) => {
  let username = null;

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString()); // important: raw is a Buffer

    if (msg.type === "join") {
      username = msg.username;
      players.add(username);

      console.log("Player joined:", username);

      broadcast({ type: "player_count", count: players.size });

      if (players.size >= MIN_PLAYERS) {
        broadcast({ type: "start_game" });
      }
    }
  });

  ws.on("close", () => {
    if (username) {
      players.delete(username);
      console.log("Player left:", username);
      broadcast({ type: "player_count", count: players.size });
    }
  });
});

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getWebSocketUrl } from "../utils/wsClient.js";

const MIN_PLAYERS = 2;

const GameWaitingRoom = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const username = localStorage.getItem("user");

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to lobby WS");
      ws.send(JSON.stringify({ type: "join", username }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "player_count":
          setPlayerCount(msg.count);
          break;

        case "start_game":
          console.log("Game starting!");
          navigate("/game");
          break;

        default:
          console.warn("Unknown message", msg);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    ws.onclose = () => {
      console.log("Lobby WS closed");
    };

    return () => {
      ws.close();
    };
  }, [navigate, username]);

  return (
    <div className="lobby-overlay">
      <h2>Waiting for players...</h2>
      <p>Players: {playerCount} / {MIN_PLAYERS}</p>
    </div>
  );
};

export default GameWaitingRoom;

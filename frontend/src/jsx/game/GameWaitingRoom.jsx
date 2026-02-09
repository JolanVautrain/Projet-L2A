import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getWebSocketUrl } from "../utils/wsClient.js";
import { getActiveUser } from "../utils/userSession.js";

const MIN_PLAYERS = 2;

const GameWaitingRoom = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const username = getActiveUser();

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let isUnmounting = false;
    let closeAfterOpen = false;

    ws.onopen = () => {
      if (closeAfterOpen) {
        ws.close();
        return;
      }
      console.log("Connected to lobby WS");
      ws.send(JSON.stringify({ type: "join_lobby", username }));
      ws.send(JSON.stringify({ type: "join", username }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "player_count":
          setPlayerCount(msg.count);
          break;

        case "start_game":
          if (msg.matchId) {
            sessionStorage.setItem("activeMatchId", msg.matchId);
            if (typeof msg.serverTime === "number") {
              const offset = msg.serverTime - Date.now();
              sessionStorage.setItem(
                "serverTimeOffsetMs",
                String(offset)
              );
            } else {
              sessionStorage.setItem("serverTimeOffsetMs", "0");
            }
          }
          console.log("Game starting!", msg.matchId);
          navigate("/game");
          break;

        default:
          console.warn("Unknown message", msg);
      }
    };

    ws.onerror = (err) => {
      if (isUnmounting) return;
      console.error("WebSocket error", err);
    };

    ws.onclose = () => {
      if (isUnmounting) return;
      console.log("Lobby WS closed");
    };

    return () => {
      isUnmounting = true;
      if (ws.readyState === WebSocket.CONNECTING) {
        closeAfterOpen = true;
      } else {
        ws.close();
      }
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

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getWebSocketUrl } from "../utils/wsClient.js";
import { getActiveUser } from "../utils/userSession.js";
import { useLanguage } from "../autres/Language.jsx";

const MIN_PLAYERS = 2;

const GameWaitingRoom = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const [opponentUsername, setOpponentUsername] = useState(null);
  const [matchReady, setMatchReady] = useState(false);
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const username = getActiveUser();
  const { t } = useLanguage();
  
  // Récupérer l'avatar de l'utilisateur actuel
  const getCurrentAvatar = (user) => {
    if (!user) return "businessman1.png";
    if (user === "admin") return "admin.jpg";
    const saved = localStorage.getItem(`avatar_${user}`);
    return (saved && saved !== "admin.jpg") ? saved : "businessman1.png";
  };
  
  const currentAvatar = getCurrentAvatar(username);
  const opponentAvatar = getCurrentAvatar(opponentUsername);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    const storedMatchId = sessionStorage.getItem("activeMatchId");
    const confirmedLeaving = sessionStorage.getItem("confirmedLeavingGame");
    if (storedMatchId && !confirmedLeaving) {
      navigate("/game");
      return;
    }
    if (confirmedLeaving) {
      sessionStorage.removeItem("confirmedLeavingGame");
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
      console.log("[!] Connected to lobby WS");
      ws.send(JSON.stringify({ type: "join_lobby", username }));
      ws.send(JSON.stringify({ type: "join", username }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "player_count":
          setPlayerCount(msg.count);
          break;
        
        case "match_found":
          // Nouveau cas: quand un match est trouvé, afficher les deux joueurs
          if (msg.opponent) {
            setOpponentUsername(msg.opponent);
            setMatchReady(true);
          }
          break;

        case "start_game":
          sessionStorage.removeItem("confirmedLeavingGame");
          const resolvedMatchId = msg.matchId || msg.match_id || msg.matchID;
          if (resolvedMatchId) {
            sessionStorage.setItem("activeMatchId", resolvedMatchId);
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
          console.log("[!] Game starting!", msg.matchId);
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
      console.log("[!] Lobby WS closed");
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
      <h2>{t("lobby.title")}</h2>
      <h3>{t("lobby.description")}</h3>
      <p>{t("lobby.players")}: {playerCount} / {MIN_PLAYERS}</p>      
      {matchReady && opponentUsername ? (
        <div className="versus-container">
          <div className="player-avatar-box">
            <img 
              src={`/assets/avatar/${currentAvatar}`} 
              alt={username}
              className="player-lobby-avatar"
            />
            <p className="player-name">{username}</p>
          </div>
          <div className="versus-text">VS</div>
          <div className="player-avatar-box">
            <img 
              src={`/assets/avatar/${opponentAvatar}`} 
              alt={opponentUsername}
              className="player-lobby-avatar"
            />
            <p className="player-name">{opponentUsername}</p>
          </div>
        </div>
      ) : (
        <div className="searching-container">
          <div className="player-avatar-searching">
            <img 
              src={`/assets/avatar/${currentAvatar}`} 
              alt={username}
              className="player-lobby-avatar pulse"
            />
            <p className="player-name">{username}</p>
            <p className="searching-text">Recherche en cours...</p>
          </div>
        </div>
      )}
      <div className="sea">
        <div className="circle-wrapper">
            <div className="bubble"></div>
            <div className="submarine-wrapper">
                <div className="submarine-body">
                    <div className="window"></div>
                    <div className="engine"></div>
                    <div className="light"></div>
                </div>
                <div className="helix"></div>
                <div className="hat">
                  <div className="leds-wrapper">
                      <div className="periscope"></div>
                      <div className="leds"></div>
                  </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameWaitingRoom;

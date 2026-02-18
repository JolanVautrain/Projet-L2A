import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getWebSocketUrl } from "../utils/wsClient.js";
import { getActiveUser } from "../utils/userSession.js";
import { useLanguage } from "../autres/Language.jsx";
import { getLevelFromXP } from "./utils/GameGamification.js";

const MIN_PLAYERS = 2;

const GameWaitingRoom = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const [opponentUsername, setOpponentUsername] = useState(null);
  const [matchReady, setMatchReady] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [opponentLevel, setOpponentLevel] = useState(1);
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const username = getActiveUser();
  const { t } = useLanguage();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Récupérer l'avatar de l'utilisateur actuel
  const getCurrentAvatar = (user) => {
    if (!user) return "businessman1.png";
    if (user === "admin") return "admin.jpg";
    const saved = localStorage.getItem(`avatar_${user}`);
    return saved && saved !== "admin.jpg" ? saved : "businessman1.png";
  };

  const currentAvatar = getCurrentAvatar(username);
  const opponentAvatar = getCurrentAvatar(opponentUsername);
  const tips = [
    t("lobby.tip1"),
    t("lobby.tip2"),
    t("lobby.tip3"),
    t("lobby.tip4"),
    t("lobby.tip5"),
    t("lobby.tip6"),
    t("lobby.tip7"),
    t("lobby.tip8"),
    t("lobby.tip9"),
    t("lobby.tip10"),
    t("lobby.tip11"),
    t("lobby.tip12"),
    t("lobby.tip13"),
    t("lobby.tip14"),
    t("lobby.tip15"),
    t("lobby.tip16"),
    t("lobby.tip17"),
    t("lobby.tip18"),
    t("lobby.tip19"),
    t("lobby.tip20"),
    t("lobby.quote1"),
    t("lobby.quote2"),
    t("lobby.quote3"),
    t("lobby.quote4"),
    t("lobby.quote5"),
    t("lobby.quote6"),
    t("lobby.quote7"),
    t("lobby.quote8"),
    t("lobby.quote9"),
    t("lobby.quote10"),
    t("lobby.quote11"),
    t("lobby.quote12"),
    t("lobby.quote13"),
    t("lobby.quote14"),
    t("lobby.quote15"),
    t("lobby.quote16"),
    t("lobby.quote17"),
    t("lobby.quote18"),
    t("lobby.quote19"),
    t("lobby.quote20"),
    t("lobby.quote21"),
    t("lobby.quote22"),
    t("lobby.quote23"),
    t("lobby.quote24"),
    t("lobby.quote25"),
    t("lobby.quote26"),
    t("lobby.quote27"),
    t("lobby.quote28"),
    t("lobby.quote29"),
    t("lobby.quote30"),
    t("lobby.quote31"),
    t("lobby.quote32"),
    t("lobby.quote33"),
    t("lobby.quote34"),
    t("lobby.quote35"),
  ].filter(Boolean);

  const resolveLevel = (data) => {
    if (!data) return 1;
    if (typeof data.level === "number" && data.level > 1) return data.level;
    if (typeof data.xp === "number") return getLevelFromXP(data.xp);
    return typeof data.level === "number" ? data.level : 1;
  };

  useEffect(() => {
    if (!username) return;
    fetch(`${apiBase}/api/user/xp/${username}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrentLevel(resolveLevel(data));
      })
      .catch(() => {});
  }, [username, apiBase]);

  useEffect(() => {
    if (!opponentUsername) return;
    fetch(`${apiBase}/api/user/xp/${opponentUsername}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setOpponentLevel(resolveLevel(data));
      })
      .catch(() => {});
  }, [opponentUsername, apiBase]);

  useEffect(() => {
    if (tips.length === 0) return undefined;
    const timer = setInterval(() => {
      setTipIndex((prev) => {
        if (tips.length <= 1) return 0;
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * tips.length);
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [tips.length]);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    const confirmedLeaving = sessionStorage.getItem("confirmedLeavingGame");

    // Nettoyer les données stales d'une session précédente
    if (!confirmedLeaving) {
      sessionStorage.removeItem("activeMatchId");
      sessionStorage.removeItem("serverTimeOffsetMs"); // Nettoyer aussi le WebSocket global s'il existe
      if (globalThis.gameWebSocket) {
        globalThis.gameWebSocket = null;
      }
    }

    if (confirmedLeaving) {
      sessionStorage.removeItem("confirmedLeavingGame");
    }

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let isUnmounting = false;
    let closeAfterOpen = false;
    let shouldCloseSocket = true; // Flag pour savoir si on doit fermer le socket

    ws.onopen = () => {
      if (closeAfterOpen) {
        ws.close();
        return;
      }
      console.log("[!] Connected to lobby WS");
      ws.send(JSON.stringify({ type: "join_lobby", username }));
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
            console.log("[GameWaitingRoom] Opponent found:", msg.opponent);
            setOpponentUsername(msg.opponent);
            // Stocker immédiatement dans sessionStorage
            sessionStorage.setItem("opponentUsername", msg.opponent);
            setMatchReady(true);
          }
          break;

        case "start_game":
          sessionStorage.removeItem("confirmedLeavingGame");
          const resolvedMatchId = msg.matchId || msg.match_id || msg.matchID;
          if (resolvedMatchId) {
            sessionStorage.setItem("activeMatchId", resolvedMatchId);
            // Stocker l'adversaire dans sessionStorage
            if (opponentUsername) {
              sessionStorage.setItem("opponentUsername", opponentUsername);
            }
            if (typeof msg.serverTime === "number") {
              const offset = msg.serverTime - Date.now();
              sessionStorage.setItem("serverTimeOffsetMs", String(offset));
            } else {
              sessionStorage.setItem("serverTimeOffsetMs", "0");
            }
          }
          console.log("[!] Game starting!", msg.matchId);
          // Sauvegarder le WebSocket existant pour que Game.jsx le réutilise
          globalThis.gameWebSocket = ws;
          // IMPORTANT: ne pas fermer le socket au démontage du composant
          shouldCloseSocket = false;
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
      // Ne fermer le socket que si on n'en a pas besoin dans Game.jsx
      if (shouldCloseSocket) {
        if (ws.readyState === WebSocket.CONNECTING) {
          closeAfterOpen = true;
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }, [navigate, username]);

  return (
    <div className="lobby-overlay">
      <h2>{t("lobby.title")}</h2>
      <h3>{t("lobby.description")}</h3>
      <p>
        {t("lobby.players")}: {playerCount} / {MIN_PLAYERS}
      </p>
      {matchReady && opponentUsername ? (
        <div className="versus-container">
          <div className="player-avatar-box">
            <img
              src={`/assets/avatar/${currentAvatar}`}
              alt={username}
              className="player-lobby-avatar"
            />
            <p className="player-name">{username}</p>
            <p className="player-level">Lv. {currentLevel}</p>
          </div>
          <div className="versus-text">VS</div>
          <div className="player-avatar-box">
            <img
              src={`/assets/avatar/${opponentAvatar}`}
              alt={opponentUsername}
              className="player-lobby-avatar"
            />
            <p className="player-name">{opponentUsername}</p>
            <p className="player-level">Lv. {opponentLevel}</p>
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
            <p className="player-level">Lv. {currentLevel}</p>
            <p className="searching-text">Recherche en cours...</p>
            {tips.length > 0 && <p className="lobby-tip">{tips[tipIndex]}</p>}
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

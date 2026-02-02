import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../autres/Language.jsx";
import "../../static/css/Index.css";

const GameWaitingRoom = () => {
  const [loadingGame, setLoadingGame] = useState(true);
  const [playerCount, setPlayerCount] = useState(0);
  const navigate = useNavigate();
  const username = localStorage.getItem("user");

  try {
    fetch("/api/game/lobby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
  } catch (e) {
    console.warn("Error while stocking inputs", e);
  }

  useEffect(() => {
    if (!loadingGame) return;

    let intervalId;
    let aborted = false;

    const fetchPlayers = async () => {
      try {
        const res = await fetch("/api/game/lobby/players");
        if (!res.ok) return;
        const data = await res.json();
        const count = data.count;
        if (aborted) return;

        setPlayerCount(count);

        if (count >= 2) {
          setLoadingGame(false);
          navigate("/game");

          clearInterval(intervalId);
        }
      } catch (err) {
        console.warn("Failed to fetch lobby players", err);
      }
    };

    // initial check immediately
    fetchPlayers();

    // poll every 1s
    intervalId = setInterval(fetchPlayers, 1000);

    return () => {
      aborted = true;
      clearInterval(intervalId);
    };
  }, [loadingGame]);

  return (
    <div className="lobby-overlay">
      <h2>Waiting for players...</h2>
      <p>Player {playerCount} / 2</p>
    </div>
  );
};

export default GameWaitingRoom;

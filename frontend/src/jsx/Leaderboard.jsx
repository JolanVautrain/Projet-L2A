import { useEffect, useState } from "react";
import { useLanguage } from "./useLanguage.jsx";
import "../css/Index.css";
import "../css/Leaderboard.css";

function Leaderboard({ user }) {
  const [scores, setScores] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    let mounted = true;
    
    // Charger le classement global
    Promise.all([
      fetch("/api/score")
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch scores");
          return r.json();
        }),
      // Charger les sessions du joueur connecté si disponible
      user
        ? fetch(`/api/user/sessions/${user}`)
            .then((r) => {
              if (!r.ok) return [];
              return r.json();
            })
            .catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([globalScores, sessions]) => {
        if (mounted) {
          setScores(globalScores);
          setUserSessions(sessions || []);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    
    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) return <p>{t("leaderboard.loadingLeaderboard")}</p>;
  if (error) return <p>{t("common.error")}: {error}</p>;

  const userBestScore = scores.find((s) => s.username === user);
  
  // Calculer le meilleur score depuis les sessions si pas trouvé dans highscores
  const bestScoreFromSessions = userSessions.length > 0
    ? userSessions.reduce((max, s) => (s.score > max.score ? s : max))
    : null;

  // Fonction pour formater la date selon la langue
  const formatDate = (dateStr) => {
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(dateStr).toLocaleString(locale, { 
      timeZone: "Europe/Paris", 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="leaderboard">
      <h1>{t("leaderboard.title")}</h1>

      {/* Section : Meilleur temps du joueur connecté */}
      {user && (userBestScore || bestScoreFromSessions) && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "rgba(79, 158, 246, 0.1)",
            borderRadius: 8,
            border: "1px solid rgba(79, 158, 246, 0.3)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{t("leaderboard.yourBestScore")}</h2>
          <table className="scores-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>{t("leaderboard.player")}</th>
                <th>{t("common.score")}</th>
                <th>{t("common.stage")}</th>
                <th>{t("leaderboard.timerSeconds")}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: "rgba(79, 158, 246, 0.2)" }}>
                <td>
                  <strong>{user}</strong>
                </td>
                <td>{(userBestScore || bestScoreFromSessions).highScore || (userBestScore || bestScoreFromSessions).score}</td>
                <td>{(userBestScore || bestScoreFromSessions).stage ?? 0}</td>
                <td>{(userBestScore || bestScoreFromSessions).timer ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Section : Tous les temps du joueur connecté */}
      {user && userSessions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2>{t("leaderboard.yourOtherGames")}</h2>
          <table className="scores-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("common.score")}</th>
                <th>{t("common.stage")}</th>
                <th>{t("leaderboard.timerSeconds")}</th>
                <th>{t("leaderboard.date")}</th>
              </tr>
            </thead>
            <tbody>
              {userSessions.map((s, idx) => (
                <tr key={s.id}>
                  <td>{idx + 1}</td>
                  <td>{s.score}</td>
                  <td>{s.stage ?? 0}</td>
                  <td>{s.timer ?? 0}</td>
                  <td>{formatDate(s.playedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;

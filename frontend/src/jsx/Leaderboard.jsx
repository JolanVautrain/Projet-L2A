import { useEffect, useState } from "react";
import "../css/Index.css";
import "../css/Leaderboard.css";

function Leaderboard({ user }) {
  const [scores, setScores] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <p>Chargement du classement...</p>;
  if (error) return <p>Erreur: {error}</p>;

  const userBestScore = scores.find((s) => s.username === user);

  return (
    <div className="leaderboard">
      <h1>Classement des joueurs</h1>

      {/* Section : Meilleur temps du joueur connecté */}
      {user && userBestScore && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "rgba(79, 158, 246, 0.1)",
            borderRadius: 8,
            border: "1px solid rgba(79, 158, 246, 0.3)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Votre meilleur score</h2>
          <table className="scores-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Score</th>
                <th>Stage</th>
                <th>Timer (s)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: "rgba(79, 158, 246, 0.2)" }}>
                <td>
                  <strong>{userBestScore.username}</strong>
                </td>
                <td>{userBestScore.highScore}</td>
                <td>{userBestScore.stage ?? 0}</td>
                <td>{userBestScore.timer ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Section : Tous les temps du joueur connecté */}
      {user && userSessions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2>Vos autres parties</h2>
          <table className="scores-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Score</th>
                <th>Stage</th>
                <th>Timer (s)</th>
                <th>Date/Heure</th>
              </tr>
            </thead>
            <tbody>
              {userSessions.map((s, idx) => (
                <tr key={s.id}>
                  <td>{idx + 1}</td>
                  <td>{s.score}</td>
                  <td>{s.stage ?? 0}</td>
                  <td>{s.timer ?? 0}</td>
                  <td>{new Date(s.playedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris", year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section : Classement global */}
      <div>
        <h2>Classement global</h2>
        {scores.length === 0 ? (
          <p>Aucun score enregistré.</p>
        ) : (
          <table className="scores-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Joueur</th>
                <th>Score</th>
                <th>Stage</th>
                <th>Timer (s)</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, idx) => (
                <tr key={s.username} style={user === s.username ? { backgroundColor: "rgba(79, 158, 246, 0.1)" } : {}}>
                  <td>{idx + 1}</td>
                  <td>
                    {user === s.username ? <strong>{s.username}</strong> : s.username}
                  </td>
                  <td>{s.highScore}</td>
                  <td>{s.stage ?? 0}</td>
                  <td>{s.timer ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;

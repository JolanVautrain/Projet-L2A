import { useEffect, useState } from "react";
import "../css/Index.css";
import "../css/Leaderboard.css";

function Leaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/score")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch scores");
        return r.json();
      })
      .then((data) => {
        if (mounted) setScores(data);
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
  }, []);

  if (loading) return <p>Chargement du classement...</p>;
  if (error) return <p>Erreur: {error}</p>;

  return (
    <div className="leaderboard">
      <h1>Classement des joueurs</h1>
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
              <tr key={s.username}>
                <td>{idx + 1}</td>
                <td>{s.username}</td>
                <td>{s.highScore}</td>
                <td>{s.stage ?? 0}</td>
                <td>{s.timer ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Leaderboard;

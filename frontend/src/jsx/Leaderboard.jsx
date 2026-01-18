import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import LoginModal from "./LoginModal.jsx";
import { useLanguage } from "./Language.jsx";
import "../css/Index.css";
import "../css/Leaderboard.css";

function Leaderboard({ user, setUser }) {
  const [scores, setScores] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { t, language } = useLanguage();

  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);

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
            .then(async (r) => {
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

  // Si pas connecté, afficher une bannière explicite et proposer d'ouvrir la modal
  if (!user) {
    return (
      <div className="leaderboard" style={{ textAlign: 'center', padding: 24 }}>
        <h1>{t("leaderboard.title")}</h1>
        <p style={{ marginTop: 50 }}>{t("leaderboard.loginRequired")}</p>
        <button className="btn primary" onClick={openLogin} style={{ marginTop: 12 }}>
          {t("leaderboard.openLogin")}
        </button>
        <LoginModal isOpen={isOpen} onClose={closeLogin} action={setUser || (() => {})} afterLogin={() => { /* no-op: setUser already updates leaderboard */ }} />
        <div className="leaderboard-loader" aria-hidden>
          <div className="lb-loader">
            <div className="lb-box"></div>
            <div className="lb-hill"></div>
          </div>
        </div>
      </div>
    );
  }
  const userBestScore = scores.find((s) => s.username === user);
  // Calculer le meilleur score depuis les sessions si pas trouvé dans highscores
  const bestScoreFromSessions = userSessions.length > 0
    ? userSessions.reduce(
        (max, s) => (s.score > max.score ? s : max),
        { score: -Infinity, stage: 0, timer: 0 }
      )
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
  // Trier les sessions par date (les plus récentes en premier)
  const sortedUserSessions = userSessions && userSessions.length > 0
    ? [...userSessions].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
    : [];
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
      {user && sortedUserSessions.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "rgba(79, 158, 246, 0.1)",
            borderRadius: 8,
            border: "1px solid rgba(79, 158, 246, 0.3)",
          }}
        >
          <h2>{t("leaderboard.yourOtherGames")}</h2>
          <table className="scores-table">
            <thead>
              <tr>
                <th>{t("common.score")}</th>
                <th>{t("common.stage")}</th>
                <th>{t("leaderboard.timerSeconds")}</th>
                <th>{t("leaderboard.date")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedUserSessions.map((s) => (
                <tr key={s.id}>
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
      {/* Graphique des scores par date (bas de page) */}
      {user && userSessions.length > 0 && (
        <div className="score-chart">
          <ScoreChart sessions={userSessions} t={t} />
        </div>
      )}
    </div>
  );
}

function ScoreChart({ sessions, t }) {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, score: 0, date: '' });
  if (!sessions || sessions.length === 0) return null;
  const width = 800;
  const height = 220;
  const margin = { top: 14, right: 20, bottom: 36, left: 52 };
  // Trier par date ascendante
  const sorted = [...sessions].sort((a, b) => new Date(a.playedAt) - new Date(b.playedAt));
  const times = sorted.map((s) => new Date(s.playedAt).getTime());
  const scores = sorted.map((s) => Number(s.score || 0));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const sMin = Math.min(...scores);
  const sMax = Math.max(...scores);
  const xFor = (ts) => {
    const innerW = width - margin.left - margin.right;
    const denom = tMax - tMin || 1;
    return margin.left + ((ts - tMin) / denom) * innerW;
  };
  const yFor = (s) => {
    const innerH = height - margin.top - margin.bottom;
    const denom = sMax - sMin || 1;
    return margin.top + (1 - (s - sMin) / denom) * innerH;
  };
  const points = sorted.map((s) => `${xFor(new Date(s.playedAt).getTime())},${yFor(Number(s.score||0))}`).join(' ');
  const firstLabel = new Date(tMin).toLocaleString();
  const lastLabel = new Date(tMax).toLocaleString();
  const yLabel = t ? t('leaderboard.chart.yLabel') : 'Score';
  const xLabel = t ? t('leaderboard.chart.xLabel') : 'Date';
  const handlePointMove = (e, s) => {
    const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    // Positionner le tooltip légèrement en dessous et à droite du curseur
    const left = clientX - svgRect.left + 12;
    const top = clientY - svgRect.top + 12;
    setTooltip({ visible: true, x: left, y: top, score: s.score, date: new Date(s.playedAt).toLocaleString() });
  };
  const handlePointLeave = () => setTooltip({ visible: false, x: 0, y: 0, score: 0, date: '' });
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
      <h3 style={{ margin: '6px 0 8px', textAlign: 'center', color: '#e6eef8' }}>{t('leaderboard.chart.title')}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(79,158,246,0.18)" />
            <stop offset="100%" stopColor="rgba(79,158,246,0.02)" />
          </linearGradient>
        </defs>
        {/* Zone sous la courbe */}
        <polygon points={`${margin.left},${height - margin.bottom} ${points} ${width - margin.right},${height - margin.bottom}`} fill="url(#grad)" />
        {/* Ligne */}
        <polyline points={points} fill="none" stroke="rgba(79,158,246,0.95)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {sorted.map((s, i) => {
          const cx = xFor(new Date(s.playedAt).getTime());
          const cy = yFor(Number(s.score||0));
          return (
            <g key={s.id || i}>
              <circle
                cx={cx}
                cy={cy}
                r={5}
                fill="#0b1222"
                stroke="rgba(79,158,246,0.98)"
                strokeWidth={2}
                onMouseMove={(e) => handlePointMove(e, s)}
                onMouseEnter={(e) => handlePointMove(e, s)}
                onMouseLeave={handlePointLeave}
              />
            </g>
          );
        })}
        {/* Y labels (min/max) */}
        <text x={8} y={yFor(sMax)} fill="#9aa4b2" fontSize={12}>{sMax}</text>
        <text x={8} y={yFor(sMin)} fill="#9aa4b2" fontSize={12}>{sMin}</text>
        {/* X labels */}
        <text x={margin.left} y={height - 8} fill="#9aa4b2" fontSize={11}>{firstLabel}</text>
        <text x={width - margin.right - 120} y={height - 8} fill="#9aa4b2" fontSize={11}>{lastLabel}</text>
        {/* Axis labels */}
        <text x={width / 2} y={height - 2} fill="#9aa4b2" fontSize={12} textAnchor="middle">{xLabel}</text>
        <text x={12} y={height / 2} fill="#9aa4b2" fontSize={12} textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`}>{yLabel}</text>
      </svg>
      {/* Infobulle */}
      <div
        className="score-tooltip"
        style={{
          display: tooltip.visible ? 'block' : 'none',
          left: tooltip.x,
          top: tooltip.y,
        }}
      >
        <div style={{ fontSize: 12, color: '#e6eef8', fontWeight: 600 }}>{t('common.score')}: {tooltip.score}</div>
        <div style={{ fontSize: 11, color: '#9aa4b2' }}>{tooltip.date}</div>
      </div>
    </div>
  );
}

export default Leaderboard;

Leaderboard.propTypes = {
  user: PropTypes.string,
};

ScoreChart.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  t: PropTypes.func,
};

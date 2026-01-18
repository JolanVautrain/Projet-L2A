import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import LoginModal from "./LoginModal.jsx";
import RegisterModal from "./RegisterModal.jsx";
import { useLanguage } from "./Language.jsx";
import "../css/Index.css";
import "../css/Leaderboard.css";

function Leaderboard({ user, setUser }) {
  // Runtime API base: prefer same host on port 5000 (backend), useful during dev
  const apiBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : '';
  const [scores, setScores] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpHistory, setXpHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { t, language } = useLanguage();
  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  useEffect(() => {
    let mounted = true;
    // Charger le classement global
    Promise.all([
      fetch("/api/score")
        .then((r) => {
          if (!r.ok) throw new Error(t("leaderboard.fetchFailed"));
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
    // Charger XP / niveau du user connecté
    if (user) {
      fetch(`${apiBase}/api/user/xp/${user}`)
        .then((r) => {
          if (!r.ok) throw new Error("failed to fetch xp");
          return r.json();
        })
        .then((d) => {
          if (mounted) {
            setXp(d.xp || 0);
            setLevel(d.level || 1);
          }
        })
        .catch(() => {})
      // Charger l'historique XP
      fetch(`${apiBase}/api/user/xp/history/${user}?limit=100`)
        .then((r) => r.ok ? r.json() : [])
        .then((h) => { if (mounted) setXpHistory(h || []); })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [user]);
  if (loading) return <p>{t("leaderboard.loadingLeaderboard")}</p>;
  if (error) return <p>{t("common.error")}: {error}</p>;
  // Si pas connecté, afficher une bannière explicite et proposer d'ouvrir la modal
  if (!user) {
    return (
      <div className="leaderboard leaderboard--centered">
        <h1>{t("leaderboard.title")}</h1>
        <p className="leaderboard__notice">{t("leaderboard.loginRequired")}</p>
        <button className="btn primary leaderboard__login-btn" onClick={openLogin}>
          {t("leaderboard.openLogin")}
        </button>
        <LoginModal isOpen={isOpen} onClose={closeLogin} action={setUser || (() => {})} afterLogin={() => { /* no-op: setUser already updates leaderboard */ }} openRegister={openRegister} />
        <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} afterRegister={(u) => { if (setUser) { setUser(u); } closeRegister(); }} />
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
      {/* XP / Niveau */}
      {user && (
        <div className="leaderboard__panel">
          <h2>{t('leaderboard.progress') || 'Progression'}</h2>
          {/* Inline compact progress bar and manual award button removed to simplify UI */}
          <ProgressChart xp={xp} level={level} t={t} />
          {xpHistory && xpHistory.length > 0 && (
            <div style={{marginTop:14}} className="score-chart">
              <ProgressHistoryChart history={xpHistory} t={t} />
            </div>
          )}
        </div>
      )}
      {/* Section : Meilleur temps du joueur connecté */}
      {user && (userBestScore || bestScoreFromSessions) && (
        <div className="leaderboard__panel">
          <h2>{t("leaderboard.yourBestScore")}</h2>
          <table className="scores-table">
            <thead>
              <tr>
                <th>{t("leaderboard.player")}</th>
                <th>{t("common.score")}</th>
                <th>{t("common.stage")}</th>
                <th>{t("leaderboard.timerSeconds")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="highlight-row">
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
        <div className="leaderboard__panel">
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
// (rien à l'extérieur)
function ProgressChart({ xp, level, t }) {
  const pct = Math.max(0, Math.min(100, xp % 100));
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const targetOffset = circ - (pct / 100) * circ;
  const [dashOffset, setDashOffset] = useState(circ);

  useEffect(() => {
    // animate from full circle to targetOffset
    // small timeout to ensure initial render with full circle
    const id = setTimeout(() => setDashOffset(targetOffset), 60);
    return () => clearTimeout(id);
  }, [targetOffset]);

  return (
    <div className="progress-chart">
      <svg className="progress-chart__svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#00ff88" />
          </linearGradient>
        </defs>
        {/* Cercle de fond centré */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="8"
        />
        {/* Cercle de progression centré */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="8"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dashOffset}
          strokeOpacity="1"
          strokeLinecap="round"
          transform={`rotate(-90 0 0)`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="56" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">{pct}%</text>
      </svg>
      <div className="progress-chart__meta">
        <div className="lvl"><strong>Lvl {level}</strong></div>
        <div className="xp"><span style={{ color: '#00ff88' }}>{xp}</span> XP</div>
      </div>
    </div>
  );
}
  function ScoreChart({ sessions, t }) {
    if (!sessions || sessions.length === 0) return null;
    const [tooltip, setTooltip] = useState({ visible: false, score: 0, date: '' });
    const tooltipRef = useRef(null);
    const width = 860;
    const height = 260;
    const margin = { top: 18, right: 30, bottom: 36, left: 48 };
    const sorted = [...sessions].sort((a, b) => new Date(a.playedAt) - new Date(b.playedAt));
    const times = sorted.map((s) => new Date(s.playedAt).getTime());
    const xMin = Math.min(...times);
    const xMax = Math.max(...times);
    const values = sorted.map((s) => Number(s.highScore ?? s.score ?? 0));
    const sMin = Math.min(...values);
    const sMax = Math.max(...values);
    const xFor = (ts) => {
      const innerW = width - margin.left - margin.right;
      const denom = xMax - xMin || 1;
      return margin.left + ((ts - xMin) / denom) * innerW;
    };
    const yFor = (v) => {
      const innerH = height - margin.top - margin.bottom;
      const denom = sMax - sMin || 1;
      return margin.top + (1 - (v - sMin) / denom) * innerH;
    };
    const points = sorted.map((s) => `${xFor(new Date(s.playedAt).getTime())},${yFor(Number(s.highScore ?? s.score ?? 0))}`).join(' ');
    const firstLabel = new Date(xMin).toLocaleString();
    const lastLabel = new Date(xMax).toLocaleString();
    const xLabel = t('leaderboard.date') || '';
    const yLabel = t('common.score') || '';
    const handlePointMove = (e, s) => {
      const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const left = clientX - svgRect.left + 12;
      const top = clientY - svgRect.top + 12;
      setTooltip({ visible: true, score: s.highScore ?? s.score ?? 0, date: new Date(s.playedAt).toLocaleString() });
      if (tooltipRef.current) {
        tooltipRef.current.style.left = `${left}px`;
        tooltipRef.current.style.top = `${top}px`;
      }
    };
    const handlePointLeave = () => setTooltip({ visible: false, score: 0, date: '' });
    return (
      <div className="score-chart__inner">
        <h2 className="score-chart__title">{t('leaderboard.chart.title')}</h2>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,212,255,0.25)" />
              <stop offset="100%" stopColor="rgba(0,212,255,0.02)" />
            </linearGradient>
          </defs>
          <polygon points={`${margin.left},${height - margin.bottom} ${points} ${width - margin.right},${height - margin.bottom}`} fill="url(#grad)" />
          <polyline points={points} fill="none" stroke="#00d4ff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {sorted.map((s, i) => {
            const cx = xFor(new Date(s.playedAt).getTime());
            const cy = yFor(Number(s.highScore ?? s.score ?? 0));
            return (
              <g key={s.id || i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#0b1222"
                  stroke="#00d4ff"
                  strokeWidth={2.5}
                  onMouseMove={(e) => handlePointMove(e, s)}
                  onMouseEnter={(e) => handlePointMove(e, s)}
                  onMouseLeave={handlePointLeave}
                />
              </g>
            );
          })}
          <text x={8} y={yFor(sMax)} fill="#e6eef8" fontSize={12} fontWeight="600">{sMax}</text>
          <text x={8} y={yFor(sMin)} fill="#e6eef8" fontSize={12} fontWeight="600">{sMin}</text>
          <text x={margin.left} y={height - 8} fill="#9aa4b2" fontSize={11}>{firstLabel}</text>
          <text x={width - margin.right - 120} y={height - 8} fill="#9aa4b2" fontSize={11}>{lastLabel}</text>
          <text x={width / 2} y={height - 2} fill="#00d4ff" fontSize={12} fontWeight="700" textAnchor="middle">{xLabel}</text>
          <text x={12} y={height / 2} fill="#00d4ff" fontSize={12} fontWeight="700" textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`}>{yLabel}</text>
        </svg>
        <div
          ref={tooltipRef}
          className={`score-tooltip ${tooltip.visible ? 'score-tooltip--visible' : ''}`}
        >
          <div className="score-tooltip__main">{t('common.score')}: {tooltip.score}</div>
          <div className="score-tooltip__date">{tooltip.date}</div>
        </div>
        <div style={{marginTop: '12px', display: 'flex', gap: '20px', fontSize: '12px', color: '#9aa4b2'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <div style={{width: '3px', height: '16px', background: '#00d4ff', borderRadius: '1px'}}></div>
            <span>{t('leaderboard.chart.title') || 'Score'}</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <text x="0" y="12" fontSize="11" fill="#00d4ff" fontWeight="700">●</text>
            </svg>
            <span>{t('common.score')}</span>
          </div>
        </div>
      </div>
    );
  }

export default Leaderboard;
ProgressChart.propTypes = { xp: PropTypes.number, level: PropTypes.number, t: PropTypes.func };

Leaderboard.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func,
};

ScoreChart.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  t: PropTypes.func,
};

function ProgressHistoryChart({ history, t }) {
  const [tooltip, setTooltip] = useState({ visible: false, xp: 0, date: '' });
  const tooltipRef = useRef(null);
  if (!history || history.length === 0) return null;
  const width = 800;
  const height = 180;
  const margin = { top: 12, right: 18, bottom: 28, left: 48 };
  const sorted = [...history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const times = sorted.map((h) => new Date(h.createdAt).getTime());
  const xMin = Math.min(...times);
  const xMax = Math.max(...times);
  const values = sorted.map((h) => Number(h.xp || 0));
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const xFor = (ts) => {
    const innerW = width - margin.left - margin.right;
    const denom = xMax - xMin || 1;
    return margin.left + ((ts - xMin) / denom) * innerW;
  };
  const yFor = (v) => {
    const innerH = height - margin.top - margin.bottom;
    const denom = vMax - vMin || 1;
    return margin.top + (1 - (v - vMin) / denom) * innerH;
  };
  const points = sorted.map((s) => `${xFor(new Date(s.createdAt).getTime())},${yFor(Number(s.xp||0))}`).join(' ');
  const handlePoint = (e, s) => {
    const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const left = clientX - svgRect.left + 12;
    const top = clientY - svgRect.top + 12;
    setTooltip({ visible: true, xp: s.xp, date: new Date(s.createdAt).toLocaleString() });
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${left}px`;
      tooltipRef.current.style.top = `${top}px`;
    }
  };
  const handleLeave = () => setTooltip({ visible: false, xp: 0, date: '' });
  const firstLabel = new Date(xMin).toLocaleString();
  const lastLabel = new Date(xMax).toLocaleString();
  return (
    <div className="score-chart__inner">
      <h3 className="score-chart__title">{t('leaderboard.progress') || 'Progression'}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,255,136,0.2)" />
            <stop offset="100%" stopColor="rgba(0,255,136,0.03)" />
          </linearGradient>
        </defs>
        <polygon points={`${margin.left},${height - margin.bottom} ${points} ${width - margin.right},${height - margin.bottom}`} fill="url(#g2)" />
        <polyline points={points} fill="none" stroke="#00ff88" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {sorted.map((s, i) => {
          const cx = xFor(new Date(s.createdAt).getTime());
          const cy = yFor(Number(s.xp||0));
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={4} fill="#0b1222" stroke="#00ff88" strokeWidth={2}
                onMouseMove={(e) => handlePoint(e, s)} onMouseEnter={(e) => handlePoint(e, s)} onMouseLeave={handleLeave} />
            </g>
          );
        })}
        <text x={margin.left} y={height - 8} fill="#9aa4b2" fontSize={11}>{firstLabel}</text>
        <text x={width - margin.right - 140} y={height - 8} fill="#9aa4b2" fontSize={11}>{lastLabel}</text>
      </svg>
      <div ref={tooltipRef} className={`score-tooltip ${tooltip.visible ? 'score-tooltip--visible' : ''}`}>
        <div className="score-tooltip__main">XP: {tooltip.xp}</div>
        <div className="score-tooltip__date">{tooltip.date}</div>
      </div>
    </div>
  );
}

ProgressHistoryChart.propTypes = { history: PropTypes.arrayOf(PropTypes.object), t: PropTypes.func };

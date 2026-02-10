import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import LoginModal from "../accueil/modals/LoginModal.jsx";
import RegisterModal from "../accueil/modals/RegisterModal.jsx";
import { useLanguage } from "../autres/Language.jsx";
import { getApiBaseUrl } from "../utils/apiClient.js";

function Leaderboard({ user, setUser }) {
  // Runtime API base: uses VITE_BACKEND_URL or constructs dynamically from window.location
  const apiBase = getApiBaseUrl();
  const [topUsers, setTopUsers] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { t, language } = useLanguage();
  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/leaderboard/score").then((r) => {
        if (r.ok) {
          return r.json();
        }
        throw new Error(t("leaderboard.fetchFailed"));
      }),
      // Charger les sessions du joueur connecté si disponible
      user
        ? fetch(`/api/leaderboard/users`)
            .then(async (r) => {
              if (r.ok) return r.json();
              return [];
            })
            .catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([scores, users]) => {
        if (mounted) {
          setUserSessions(scores || []);
          setTopUsers(users || []);
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
  }, [user, apiBase, t]);
  if (loading) return <p>{t("leaderboard.loadingLeaderboard")}</p>;
  if (error)
    return (
      <p>
        {t("common.error")}: {error}
      </p>
    );
  // Si pas connecté, afficher une bannière explicite et proposer d'ouvrir la modal
  if (user == null) {
    return (
      <div className="leaderboard leaderboard--centered">
        <h1>{t("leaderboard.title")}</h1>
        <p className="leaderboard__notice">{t("leaderboard.loginRequired")}</p>
        <button
          className="btn primary leaderboard__login-btn"
          onClick={openLogin}
        >
          {t("leaderboard.openLogin")}
        </button>
        <LoginModal
          isOpen={isOpen}
          onClose={closeLogin}
          action={setUser || (() => {})}
          afterLogin={() => {
            /* no-op: setUser already updates leaderboard */
          }}
          openRegister={openRegister}
        />
        <RegisterModal
          isOpen={isRegisterOpen}
          onClose={closeRegister}
          afterRegister={(u) => {
            if (setUser) {
              setUser(u);
            }
            closeRegister();
          }}
        />
        <div className="leaderboard-loader" aria-hidden>
          <div className="lb-loader">
            <div className="lb-box"></div>
            <div className="lb-hill"></div>
          </div>
        </div>
      </div>
    );
  }
  // Fonction pour formater la date selon la langue
  const formatDate = (dateStr) => {
    const locale = language === "en" ? "en-US" : "fr-FR";
    return new Date(dateStr).toLocaleString(locale, {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="leaderboard">
      <h1>{t("leaderboard.title")}</h1>
      {/* Section : Tous les temps du joueur connecté */}
      {user && userSessions.length > 0 && (
        <>
          <div className="leaderboard__panel">
            <h2>{t("leaderboard.top10games")}</h2>
            <table className="scores-table">
              <thead>
                <tr>
                  <th>{t("common.rank")}</th>
                  <th>{t("common.username")}</th>
                  <th>{t("common.score")}</th>
                  <th>{t("common.stage")}</th>
                  <th>{t("common.gameState")}</th>
                  <th>{t("leaderboard.timerSeconds")}</th>
                  <th>{t("leaderboard.date")}</th>
                </tr>
              </thead>
              <tbody>
                {userSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.username}</td>
                    <td>{s.score}</td>
                    <td>{s.stage ?? 0}</td>
                    <td>{s.state}</td>
                    <td>{s.timer ?? 0}</td>
                    <td>{formatDate(s.playedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="leaderboard__panel">
            <h2>{t("leaderboard.top10users")}</h2>
            <table className="scores-table">
              <thead>
                <tr>
                  <th>{t("common.rank")}</th>
                  <th>{t("common.username")}</th>
                  <th>{t("common.score")}</th>
                  <th>{t("common.stage")}</th>
                  <th>{t("common.gameState")}</th>
                  <th>{t("leaderboard.timerSeconds")}</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.username}</td>
                    <td>{s.highScore ?? 0}</td>
                    <td>{s.stage ?? 0}</td>
                    <td>{s.state}</td>
                    <td>{s.timer ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

Leaderboard.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func,
};

export default Leaderboard;

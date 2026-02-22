import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import LoginModal from "../accueil/modals/LoginModal.jsx";
import RegisterModal from "../accueil/modals/RegisterModal.jsx";
import { useLanguage } from "../autres/Language.jsx";
import { getApiBaseUrl } from "../utils/apiClient.js";
import SortableTable from "../utils/SortableTable.jsx";

// Composant de classement affichant les meilleurs scores et les sessions du joueur connecté
function Leaderboard({ user, setUser }) {
  const apiBase = getApiBaseUrl();
  const [topUsers, setTopUsers] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
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
            // Après connexion, on peut soit rester sur le classement, soit rediriger vers une page de profil ou autre. Ici on reste sur le classement.
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

  const columnsGames = [
    { key: "rank", label: t("leaderboard.rank") },
    { key: "username", label: t("leaderboard.username") },
    { key: "score", label: t("common.score") },
    { key: "stage", label: t("common.stage") },
    { key: "state", label: t("common.gameState") },
    { key: "timer", label: t("leaderboard.timerSeconds") },
    { key: "playedAt", label: t("leaderboard.date") },
  ];

  const columnsUsers = [
    { key: "rank", label: t("leaderboard.rank") },
    { key: "username", label: t("leaderboard.username") },
    { key: "highScore", label: t("common.score") },
    { key: "stage", label: t("common.stage") },
    { key: "timer", label: t("leaderboard.timerSeconds") },
    { key: "state", label: t("common.gameState") },
  ];

  return (
    <div className="leaderboard">
      <h1>{t("leaderboard.title")}</h1>
      {user && userSessions.length > 0 && (
        <>
          <div className="leaderboard__panel">
            <h2>{t("leaderboard.top10Games")}</h2>
            <SortableTable data={userSessions} columns={columnsGames} />
          </div>

          <div className="leaderboard__panel">
            <h2>{t("leaderboard.top10Users")}</h2>
            <SortableTable data={topUsers} columns={columnsUsers} />
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

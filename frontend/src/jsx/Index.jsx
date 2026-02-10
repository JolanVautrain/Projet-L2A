import PropTypes from "prop-types";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "./autres/Language.jsx";
import {
  getActiveSessionToken,
  getActiveUser,
  setActiveSessionToken,
  setActiveUser,
} from "./utils/userSession.js";
import { apiFetch } from "./utils/apiClient.js";

/**
 * Rend une route protégée qui nécessite une authentification.
 *
 * @param {*} param0 Props contenant l'utilisateur et les enfants à rendre
 * @returns Les enfants si l'utilisateur est authentifié, sinon redirige vers l'accueil avec ouverture de la modal de connexion
 */
function RequireAuth({ user, children }) {
  // Si l'utilisateur est authentifié, rendre les enfants
  return user ? (
    children
  ) : (
    <Navigate to="/" replace state={{ openLogin: true }} />
  );
}

// PropTypes validation pour le composant RequireAuth
RequireAuth.propTypes = {
  user: PropTypes.string,
  children: PropTypes.node,
};

// Importation des composants de l'application
import Accueil from "./accueil/Accueil";
import Leaderboard from "./classement/Leaderboard";
import Account from "./compte/Account";
import Contacts from "./contacts/Contacts";
import PageNotFound from "./autres/PageNotFound";
import Game from "./game/Game.jsx";
import GameWaitingRoom from "./game/GameWaitingRoom.jsx";
import Regle from "./regle/regle";

/**
 * Composant principal de l'application.
 * Gère l'état utilisateur et le routage global.
 */
function App() {
  const { t, changeLanguage } = useLanguage();

  // État utilisateur (persisté dans le localStorage)
  const [userState, setUserState] = useState(() => getActiveUser());
  const navigate = useNavigate();
  const location = useLocation();
  const [leaveMatchModalOpen, setLeaveMatchModalOpen] = useState(false);
  const [leaveMatchTarget, setLeaveMatchTarget] = useState(null);

  /**
   * Met à jour l'utilisateur et le stocke dans le localStorage.
   * @param {string|null} value
   */
  const setUser = (value, sessionToken) => {
    setUserState(value);
    setActiveUser(value);
    if (sessionToken) {
      setActiveSessionToken(sessionToken);
    } else if (!value) {
      setActiveSessionToken(null);
    }
  };

  // Après connexion, si un utilisateur est défini, charger sa langue depuis le backend
  const setUserAndLoadLang = (value) => {
    setUser(value);
    if (value) {
      fetch(`/api/user/language/${value}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.language) {
            changeLanguage(data.language);
            localStorage.setItem("language", data.language);
          }
        })
        .catch(() => {});
    } else {
      // Déconnexion : on peut laisser la langue ou remettre par défaut
    }
  };

  useEffect(() => {
    if (!userState) return undefined;

    const keepAlive = () => {
      apiFetch("/session/ping").catch(() => {});
    };

    keepAlive();
    const intervalId = setInterval(keepAlive, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [userState]);

  useEffect(() => {
    const handleLeaveRequest = (event) => {
      const target = event?.detail?.target || "/";
      const activeMatchId = sessionStorage.getItem("activeMatchId");
      const confirmedLeaving = sessionStorage.getItem("confirmedLeavingGame");
      if (!activeMatchId || confirmedLeaving) {
        navigate(target);
        return;
      }
      setLeaveMatchTarget(target);
      setLeaveMatchModalOpen(true);
    };

    window.addEventListener("request-leave-match", handleLeaveRequest);
    return () => {
      window.removeEventListener("request-leave-match", handleLeaveRequest);
    };
  }, [navigate]);

  const requestLeaveIfInMatch = (target, event) => {
    const activeMatchId = sessionStorage.getItem("activeMatchId");
    const confirmedLeaving = sessionStorage.getItem("confirmedLeavingGame");
    if (!activeMatchId || confirmedLeaving || location.pathname !== "/game") {
      return true;
    }
    if (event) {
      event.preventDefault();
    }
    setLeaveMatchTarget(target);
    setLeaveMatchModalOpen(true);
    return false;
  };

  const confirmLeaveMatch = () => {
    sessionStorage.setItem("confirmedLeavingGame", "1");
    sessionStorage.removeItem("activeMatchId");
    sessionStorage.removeItem("serverTimeOffsetMs");
    const target = leaveMatchTarget || "/";
    setLeaveMatchModalOpen(false);
    setLeaveMatchTarget(null);
    navigate(target);
  };

  const cancelLeaveMatch = () => {
    setLeaveMatchModalOpen(false);
    setLeaveMatchTarget(null);
    window.dispatchEvent(new CustomEvent("leave-match-cancelled"));
  };

  useEffect(() => {
    if (!userState) return undefined;

    const sessionToken = getActiveSessionToken();
    if (!sessionToken) return undefined;

    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        username: userState,
        session_token: sessionToken,
      });
      try {
        navigator.sendBeacon(
          "/api/logout",
          new Blob([payload], { type: "application/json" })
        );
      } catch (e) {
        // Ignore unload failures
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userState]);

  const handleLogout = () => {
    const sessionToken = getActiveSessionToken();
    if (userState && sessionToken) {
      apiFetch("/logout", {
        method: "POST",
        headers: {
          "X-Session-User": userState,
          "X-Session-Token": sessionToken,
        },
      }).catch(() => {});
    }
    setUser(null);
    navigate("/");
  };

  return (
    <>
      <header>
        <nav className="navbar">
          <NavLink to="/" onClick={(e) => requestLeaveIfInMatch("/", e)}>
            {t("common.home")}
          </NavLink>
          <NavLink
            to="/leaderboard"
            onClick={(e) => requestLeaveIfInMatch("/leaderboard", e)}
          >
            {t("common.leaderboard")}
          </NavLink>
          {userState ? (
            <div className="nav-greeting">
              <div className="nav-account-display">
                <span>
                  {t("account.hello")} {userState}
                </span>
                <button
                  className="btn ghost no-border account__logout"
                  onClick={handleLogout}
                >
                  {t("common.logout")}
                </button>
              </div>
              <NavLink
                className="btn ghost no-border"
                to="/account"
                onClick={(e) => requestLeaveIfInMatch("/account", e)}
              >
                {t("account.title")}
              </NavLink>
            </div>
          ) : (
            <NavLink
              to="/account"
              onClick={(e) => requestLeaveIfInMatch("/account", e)}
            >
              {t("account.title")}
            </NavLink>
          )}
          <NavLink
            to="/contacts"
            onClick={(e) => requestLeaveIfInMatch("/contacts", e)}
          >
            {t("common.contacts")}
          </NavLink>
          <NavLink to="/regle" onClick={(e) => requestLeaveIfInMatch("/regle", e)}>
            {t("rules.title")}
          </NavLink>
        </nav>
      </header>
      {leaveMatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{t("game.confirmLeaveMatch")}</h2>
            <div className="modal-buttons">
              <button className="btn ghost" onClick={cancelLeaveMatch}>
                {t("common.cancel")}
              </button>
              <button className="btn accent" onClick={confirmLeaveMatch}>
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={<Accueil user={userState} setUser={setUserAndLoadLang} />}
        />
        <Route
          path="/leaderboard"
          element={
            <Leaderboard user={userState} setUser={setUserAndLoadLang} />
          }
        />
        <Route
          path="/account"
          element={<Account user={userState} setUser={setUserAndLoadLang} />}
        />
        <Route path="/contacts" element={<Contacts />} />
        <Route
          path="/game"
          element={
            <RequireAuth user={userState}>
              <Game />
            </RequireAuth>
          }
        />
        <Route path="/lobby" element={<RequireAuth user={userState}><GameWaitingRoom /></RequireAuth>}/>
        <Route path="/*" element={<PageNotFound />} />
        <Route path="/regle" element={<Regle />} />
      </Routes>
    </>
  );
}

export default App;

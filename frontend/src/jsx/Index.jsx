import PropTypes from "prop-types";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
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
import Statistics from "./statistics/Statistics";
import Contacts from "./contacts/Contacts";
import PageNotFound from "./autres/PageNotFound";
import Game from "./game/Game.jsx";
import GameWaitingRoom from "./game/GameWaitingRoom.jsx";
import Regle from "./regle/regle";
import Shop from "./shop/Shop";
import GameSolo from "./game/GameSolo.jsx";
import Moderation from "./admin/moderation.jsx";

/**
 * Composant principal de l'application.
 * Gère l'état utilisateur et le routage global.
 */
function App() {
  const { t, changeLanguage } = useLanguage();

  // État utilisateur (persisté dans le localStorage)
  const [userState, setUserState] = useState(() => getActiveUser());
  const [navbarAvatarKey, setNavbarAvatarKey] = useState(0); // Force le rendu de l'avatar
  const navigate = useNavigate();

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

  // Écouter l'événement de changement d'avatar
  useEffect(() => {
    const handleAvatarChange = (event) => {
      if (event.detail.username === userState) {
        setNavbarAvatarKey((prev) => prev + 1); // Force le re-rendu de l'avatar
      }
    };

    globalThis.addEventListener("avatarChanged", handleAvatarChange);
    return () => {
      globalThis.removeEventListener("avatarChanged", handleAvatarChange);
    };
  }, [userState]);

  useEffect(() => {
    if (!userState) return undefined;

    const sessionToken = getActiveSessionToken();
    if (!sessionToken) return undefined;

    // Pas de popup beforeunload - seulement beacon de déconnexion silencieux
    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        username: userState,
        session_token: sessionToken,
      });
      try {
        navigator.sendBeacon(
          "/api/logout",
          new Blob([payload], { type: "application/json" }),
        );
      } catch (e) {
        //eslint-disable-line
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

  /**
   * Demande à l'utilisateur de confirmer avant de quitter si un match est en cours.
   * @param {string} path - Chemin de destination
   */
  const requestLeaveIfInMatch = (path) => {
    // Vérifier si un match est en cours dans le localStorage
    const sessionId = localStorage.getItem("current_session_id");
    if (sessionId && path !== "/account" && path !== "/shop") {
      // On quitte le match en arrière-plan
      apiFetch("/api/matchs/leave", {
        method: "POST",
        headers: {
          "X-Session-User": userState,
          "X-Session-Token": getActiveSessionToken(),
        },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(() => {});
      localStorage.removeItem("current_session_id");
    }
    navigate(path);
  };

  return (
    <>
      <header>
        <nav className="navbar">
          <NavLink to="/" onClick={() => requestLeaveIfInMatch("/")}>
            {t("common.home")}
          </NavLink>
          <NavLink
            to="/leaderboard"
            onClick={() => requestLeaveIfInMatch("/leaderboard")}
          >
            {t("common.leaderboard")}
          </NavLink>
          <NavLink
            to="/statistics"
            onClick={() => requestLeaveIfInMatch("/statistics")}
          >
            {t("common.statistics")}
          </NavLink>
          {userState ? (
            <div className="nav-greeting">
              <NavLink
                className="nav-user-profile"
                to="/account"
                onClick={() => requestLeaveIfInMatch("/account")}
              >
                <img
                  key={navbarAvatarKey}
                  src={
                    "/assets/avatar/" +
                    (() => {
                      if (userState === "admin") return "admin.jpg";
                      const saved = localStorage.getItem("avatar_" + userState);
                      return saved && saved !== "admin.jpg"
                        ? saved
                        : "businessman1.png";
                    })()
                  }
                  alt="Avatar"
                  className="nav-avatar"
                />
                <span className="nav-username">{userState}</span>
              </NavLink>
              <button
                className="btn ghost no-border nav-logout-btn"
                onClick={handleLogout}
                title={t("common.logout")}
              >
                ↪
              </button>
            </div>
          ) : (
            <NavLink
              to="/account"
              onClick={() => requestLeaveIfInMatch("/account")}
            >
              {t("account.title")}
            </NavLink>
          )}
          <NavLink to="/shop" onClick={() => requestLeaveIfInMatch("/shop")}>
            {t("common.shop")}
          </NavLink>
          <NavLink
            to="/contacts"
            onClick={() => requestLeaveIfInMatch("/contacts")}
          >
            {t("common.contacts")}
          </NavLink>
        </nav>
      </header>

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
          path="/statistics"
          element={<Statistics user={userState} setUser={setUserAndLoadLang} />}
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
        <Route
          path="/gameSolo"
          element={
            <RequireAuth user={userState}>
              <GameSolo />
            </RequireAuth>
          }
        />
        <Route
          path="/lobby"
          element={
            <RequireAuth user={userState}>
              <GameWaitingRoom />
            </RequireAuth>
          }
        />
        <Route path="/*" element={<PageNotFound />} />
        <Route path="/regle" element={<Regle />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/moderation" element={<Moderation user={userState} />} />
      </Routes>
    </>
  );
}

export default App;

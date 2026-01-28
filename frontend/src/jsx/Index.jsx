import PropTypes from "prop-types";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useState } from "react";
import { useLanguage } from "./Language.jsx";

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
import Accueil from "./Accueil";
import Leaderboard from "./Leaderboard";
import Account from "./Account";
import Contacts from "./Contacts";
import PageNotFound from "./PageNotFound";
import Game from "./Game.jsx";
import GameWaitingRoom from "./GameWaitingRoom.jsx";

/**
 * Composant principal de l'application.
 * Gère l'état utilisateur et le routage global.
 */
function App() {
  const { t, changeLanguage } = useLanguage();

  // État utilisateur (persisté dans le localStorage)
  const [userState, setUserState] = useState(
    () => localStorage.getItem("user") || null
  );
  const navigate = useNavigate();

  /**
   * Met à jour l'utilisateur et le stocke dans le localStorage.
   * @param {string|null} value
   */
  const setUser = (value) => {
    setUserState(value);
    if (value) localStorage.setItem("user", value);
    else localStorage.removeItem("user");
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

  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };

  return (
    <>
      <header>
        <nav className="navbar">
          <NavLink to="/">{t("common.home")}</NavLink>
          <NavLink to="/leaderboard">{t("common.leaderboard")}</NavLink>
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
              <NavLink className="btn ghost no-border" to="/account">
                {t("account.title")}
              </NavLink>
            </div>
          ) : (
            <NavLink to="/account">{t("account.title")}</NavLink>
          )}
          <NavLink to="/contacts">{t("common.contacts")}</NavLink>
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
      </Routes>
    </>
  );
}

export default App;

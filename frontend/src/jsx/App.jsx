import PropTypes from "prop-types";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useState } from "react";
import { useLanguage } from "./Language.jsx";

function RequireAuth({ user, children }) {
  // Si l'utilisateur est authentifié, rendre les enfants
  return user ? children : <Navigate to="/" replace state={{ openLogin: true }} />;
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
import Game from "./Game";

/**
 * Composant principal de l'application.
 * Gère l'état utilisateur et le routage global.
 */
function App() {
  // État utilisateur (persisté dans le localStorage)
  const [userState, setUserState] = useState(() => localStorage.getItem("user") || null);
  /**
   * Met à jour l'utilisateur et le stocke dans le localStorage.
   * @param {string|null} value
   */
  const setUser = (value) => {
    setUserState(value);
    if (value) localStorage.setItem("user", value);
    else localStorage.removeItem("user");
  };

  const { t } = useLanguage();

  return (
    <>
      <header>
        <nav className="navbar">
          <NavLink to="/">{t("common.home")}</NavLink>
          <NavLink to="/leaderboard">{t("common.leaderboard")}</NavLink>
          {userState ? (
            <div className="nav-greeting" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span>{t("nav.hello")} {userState}</span>
              <NavLink className="btn ghost no-border" to="/account">{t("nav.profile")}</NavLink>
            </div>
          ) : (
            <NavLink to="/account">{t("common.account")}</NavLink>
          )}
          <NavLink to="/contacts">{t("common.contacts")}</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Accueil user={userState} setUser={setUser} />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/account" element={<Account user={userState} setUser={setUser} />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/game" element={<RequireAuth user={userState}><Game /></RequireAuth>} />
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
    </>
  );
}

export default App;

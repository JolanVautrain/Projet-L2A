import PropTypes from "prop-types";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useState } from "react";

function RequireAuth({ user, children }) {
  return user ? children : <Navigate to="/" replace state={{ openLogin: true }} />;
}

RequireAuth.propTypes = {
  user: PropTypes.string,
  children: PropTypes.node,
};
import Accueil from "./Accueil";
import Rules from "./Rules";
import Account from "./Account";
import Contacts from "./Contacts";
import PageNotFound from "./PageNotFound";
import Game from "./game";

function App() {
  const [userState, setUserState] = useState(() => localStorage.getItem("user") || null);

  const setUser = (value) => {
    setUserState(value);
    if (value) localStorage.setItem("user", value);
    else localStorage.removeItem("user");
  };

  return (
    <BrowserRouter>
      <header>
        <nav className="navbar">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/rules">Règles</NavLink>
          {userState ? (
            <div className="nav-greeting" style={{display: 'inline-flex', gap: 8, alignItems: 'center'}}>
              <span>Bonjour {userState}</span>
              <NavLink className="btn ghost no-border" to="/account">Profil</NavLink>
            </div>
          ) : (
            <NavLink to="/account">Compte</NavLink>
          )}
          <NavLink to="/contacts">Contacts</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Accueil user={userState} setUser={setUser} />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/account" element={<Account user={userState} setUser={setUser} />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/game" element={<RequireAuth user={userState}><Game /></RequireAuth>} />
        <Route path="/*" element={<PageNotFound />}/>
      </Routes>
    </BrowserRouter>
  );
}
export default App;

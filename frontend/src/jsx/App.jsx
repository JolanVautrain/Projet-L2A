import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { useState } from "react";
import Accueil from "./Accueil";
import Rules from "./Rules";
import Account from "./Account";
import Contacts from "./Contacts";
import PageNotFound from "./PageNotFound";
import Game from "./game";

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => setUser(null);

  return (
    <BrowserRouter>
      <header>
        <nav className="navbar">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/rules">Règles</NavLink>
          {user ? (
            <div className="nav-greeting" style={{display: 'inline-flex', gap: 8, alignItems: 'center'}}>
              <span>Bonjour {user}</span>
              <button className="btn ghost" onClick={handleLogout}>Déconnexion</button>
            </div>
          ) : (
            <NavLink to="/account">Compte</NavLink>
          )}
          <NavLink to="/contacts">Contacts</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Accueil user={user} setUser={setUser} />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/account" element={<Account user={user} setUser={setUser} />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/game" element={<Game />} />
        <Route path="/*" element={<PageNotFound />}/>
      </Routes>
    </BrowserRouter>
  );
}
export default App;

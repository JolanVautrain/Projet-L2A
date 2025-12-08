import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Accueil from "./Accueil";
import Rules from "./Rules";
import Account from "./Account";
import Contacts from "./Contacts";
import PageNotFound from "./PageNotFound";

function App() {
  return (
    <BrowserRouter>
      <header>
        <nav className="navbar">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/rules">Règles</NavLink>
          <NavLink to="/account">Compte</NavLink>
          <NavLink to="/contacts">Contacts</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/account" element={<Account />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/*" element={<PageNotFound />}/>
      </Routes>
    </BrowserRouter>
  );
}
export default App;

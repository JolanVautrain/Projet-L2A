import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Accueil from "./Accueil";
import Rules from "./Rules";
import Account from "./Account";
import Contacts from "./Contacts";

function App() {
  return (
    <BrowserRouter>
      <header>
        <nav className="navbar">
          <Link to="/">Accueil</Link>
          <Link to="/rules">Règles</Link>
          <Link to="/account">Compte</Link>
          <Link to="/contacts">Contacts</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/account" element={<Account />} />
        <Route path="/contacts" element={<Contacts />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;

import "../css/Navbar.css";

function Navbar() {
  return (
    <>
      <header>
        <nav className="navbar">
          <a href="/">Accueil</a>
          <a href="/rules">Règles</a>
          <a href="/account">Compte</a>
          <a href="/contacts">Contacts</a>
        </nav>
      </header>
    </>
  );
}

export default Navbar;

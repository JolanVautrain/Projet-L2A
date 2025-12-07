import { useState } from "react";
import Navbar from "./Navbar.jsx";
import LoginModal from "./LoginModal.jsx";
import "../css/Accueil.css";

function Accueil() {
  const [isOpen, setIsOpen] = useState(false);
  const [logged, setLogged] = useState(false);

  if (logged) {
    return (
      <>
        <Navbar />
        <h1>Accueil</h1>
        <a href="/game">Play Game</a>
      </>
    );
  } else {
    return (
      <>
        <Navbar />
        <h1>Accueil</h1>
        <button onClick={() => setIsOpen(true)}>Login</button>
        <LoginModal
          isOpen={isOpen}
          action={setLogged}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  }
}

export default Accueil;

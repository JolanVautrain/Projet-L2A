import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import "../css/account.css";
import Navbar from "./Navbar.jsx";
import LoginModal from "./LoginModal.jsx";

function Account() {
  const [isOpen, setIsOpen] = useState(false);
  const [logged, setLogged] = useState(false);

  if (logged) {
    return (
      <>
        <Navbar />
        <h1>Accueil</h1>
        <p>Compte description</p>
      </>
    );
  } else {
    return (
      <>
        <Navbar />
        <h1>Compte</h1>
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Account />
  </StrictMode>
);

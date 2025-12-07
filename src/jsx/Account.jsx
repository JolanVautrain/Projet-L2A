import { useState } from "react";
import "../css/index.css";
import "../css/Account.css";
import LoginModal from "./LoginModal.jsx";

function Account() {
  const [isOpen, setIsOpen] = useState(false);
  const [logged, setLogged] = useState(false);

  if (logged) {
    return (
      <>
        <h1>Accueil</h1>
        <p>Compte description</p>
      </>
    );
  } else {
    return (
      <>
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

export default Account;

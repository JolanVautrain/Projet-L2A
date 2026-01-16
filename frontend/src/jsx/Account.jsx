import { useState } from "react";
import "../css/index.css";
import "../css/Account.css";
import LoginModal from "./LoginModal.jsx";

function Account({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);

  if (user) {
    return (
      <>
        <h1>Compte</h1>
        <p>Bonjour {user}, voici votre page de compte.</p>
      </>
    );
  }

  return (
    <>
      <h1>Compte</h1>
      <button onClick={() => setIsOpen(true)}>Login</button>
      <LoginModal isOpen={isOpen} action={setUser} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default Account;

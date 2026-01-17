import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../css/index.css";
import "../css/Account.css";
import LoginModal from "./LoginModal.jsx";

function Account({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };

  if (user) {
    return (
      <>
        <h1>Compte</h1>
        <div className="account-actions">
          <p>Bonjour {user}, voici votre page de compte.</p>
          <button className="btn ghost no-border" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
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

Account.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

export default Account;

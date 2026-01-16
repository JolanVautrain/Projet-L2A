import { createPortal } from "react-dom";
import "../css/LoginModal.css";
import { useState } from "react";


function LoginModal({ isOpen, onClose, action }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    fetch("http://127.0.0.1:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur HTTP: " + response.status);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.userExist) {
          setError("Nom d'utilisateur incorrect.");
        } else if (!data.passwordIsCorrect) {
          setError("Mot de passe incorrect.");
        } else {
          // renvoie le nom d'utilisateur au parent pour affichage dans le header
          action(username);
          // ferme la modal automatiquement après connexion réussie
          if (typeof onClose === "function") onClose();
        }
      })
      .catch((error) => {
        setError("Erreur de connexion. Réessayez.");
        console.error("Erreur:", error);
      })
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="login-modal styled-modal">
      <div className="modal-card">
        <header className="modal-header">
          <h2>Connexion</h2>
        </header>
        <button className="modal-close" onClick={onClose} title="Fermer">×</button>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="modal-input"
              placeholder="Votre pseudo"
            />
          </div>
          <div className="modal-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="modal-input"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="modal-error">{error}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default LoginModal;

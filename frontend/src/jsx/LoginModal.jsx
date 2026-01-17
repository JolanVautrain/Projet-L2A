import { createPortal } from "react-dom";
import "../css/LoginModal.css";
import { useState } from "react";
import PropTypes from "prop-types";

/** 
 * Composant LoginModal
 * 
 * Permet de se connecter via une modal.
 */
function LoginModal({ isOpen, onClose, action }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Gère la soumission du formulaire de connexion.
   * 
   * @param {Event} e
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const userTrim = username.trim();
    const passTrim = password.trim();
    // Validation basique des champs
    if (!userTrim || !passTrim) {
      setError("Nom d'utilisateur et mot de passe requis.");
      return;
    }
    // Envoi de la requête de connexion au backend
    setLoading(true);
    setError("");
    fetch("http://127.0.0.1:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: userTrim,
        password: passTrim,
      }),
    })
    // Traitement de la réponse
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur HTTP: " + response.status);
        }
        return response.json();
      })
      // Analyse des données reçues
      .then((data) => {
        if (!data.userExist) {
          setError("Nom d'utilisateur incorrect.");
        } else if (data.passwordIsCorrect === false) {
          setError("Mot de passe incorrect.");
        } else {
          // renvoie le nom d'utilisateur au parent pour affichage dans le header
          // transmet le nom d'utilisateur au parent pour affichage dans l'en-tête
          action(username);
          // ferme la modal automatiquement après connexion réussie
          // ferme la fenêtre modale automatiquement après connexion réussie
          if (typeof onClose === "function") onClose();
        }
      })
      // Gestion des erreurs réseau ou autres
      .catch((error) => {
        setError("Erreur de connexion. Réessayez.");
        console.error("Erreur:", error);
      })
      .finally(() => setLoading(false));
  };

  // Ne rien rendre si la modal n'est pas ouverte
  if (!isOpen) return null;

  // Rendu de la modal de connexion
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

// PropTypes validation pour le composant LoginModal
LoginModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  action: PropTypes.func.isRequired,
};

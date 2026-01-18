import { createPortal } from "react-dom";
import "../css/LoginModal.css";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "./Language.jsx";

/** 
 * Composant LoginModal
 * 
 * Permet de se connecter via une modal.
 */
function LoginModal({ isOpen, onClose, action, afterLogin, openRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useLanguage();

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
      setError(t("loginModal.usernamePasswordRequired"));
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
          setError(t("loginModal.incorrectUsername"));
        } else if (data.passwordIsCorrect === false) {
          setError(t("loginModal.incorrectPassword"));
        } else {
          // renvoie le nom d'utilisateur au parent pour affichage dans le header
          action(username);
          // appeler un callback optionnel après connexion réussie (ex: redirection)
          try {
            if (typeof afterLogin === 'function') afterLogin(username);
          } catch (err) {
            console.error('afterLogin callback failed', err);
          }
          // ferme la modal automatiquement après connexion réussie
          if (typeof onClose === "function") onClose();
        }
      })
      // Gestion des erreurs réseau ou autres
      .catch((err) => {
        setError(t("loginModal.connectionError"));
        console.error("Erreur:", err);
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
          <h2>{t("loginModal.title")}</h2>
        </header>
        <button className="modal-close" onClick={onClose} title={t("common.close")}>×</button>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <label htmlFor="username">{t("loginModal.username")}</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="modal-input"
              placeholder={t("loginModal.usernamePlaceholder")}
            />
          </div>
          <div className="modal-field">
            <label htmlFor="password">{t("loginModal.password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="modal-input"
              placeholder={t("loginModal.passwordPlaceholder")}
            />
          </div>
          {error && <div className="modal-error">{error}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? t("loginModal.connecting") : t("loginModal.login")}
          </button>
          <div className="modal-register-link">
            <button
              type="button"
              className="btn ghost register-btn"
              onClick={() => {
                if (typeof openRegister === 'function') {
                  openRegister();
                }
                if (typeof onClose === 'function') {
                  onClose();
                }
              }}
            >
              {t('loginModal.noAccount')}
            </button>
          </div>
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
  afterLogin: PropTypes.func,
  openRegister: PropTypes.func,
};

import { createPortal } from "react-dom";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
import ForgotPasswordModal from "./ForgotPasswordModal.jsx";
import { apiUrl } from "../../utils/apiClient.js";

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { t } = useLanguage();

  /**
   * Gère la soumission du formulaire de connexion.
   * 
   * @param {Event} e
   */
  const submitLogin = () => {
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
    fetch(apiUrl("/login"), {
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
        } else if (data.banned) {
          // User is banned
          const bannedUntil = data.banned_until ? new Date(data.banned_until) : null;
          const now = new Date();
          let duration = "permanent";

          if (bannedUntil && bannedUntil.toString() !== "Invalid Date") {
            if (bannedUntil.getTime() !== new Date(8640000000000000).getTime()) {
              // Temporary ban - calculate remaining hours
              const hours = Math.ceil((bannedUntil - now) / (1000 * 60 * 60));
              duration = `${Math.max(1, hours)}h`;
            }
          }

          const baseMessage = t("loginModal.accountBanned");
          const banMessage = `${baseMessage.replace("{duration}", duration)}\n${t("loginModal.banReason")}: ${data.ban_reason || t("common.noData")}`;
          setError(banMessage);
        } else if (data.passwordIsCorrect === false) {
          setError(t("loginModal.incorrectPassword"));
        } else {
          // renvoie le nom d'utilisateur au parent pour affichage dans le header
          action(userTrim, data.session_token);
          // appeler un callback optionnel après connexion réussie (ex: redirection)
          try {
            if (typeof afterLogin === "function") afterLogin(userTrim);
          } catch (err) {
            console.error("afterLogin callback failed", err);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    submitLogin(false);
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
            <button
              type="button"
              className="btn ghost forgot-password-btn"
              onClick={() => setShowForgotPassword(true)}
            >
              {t('loginModal.forgotPassword')}
            </button>
          </div>
        </form>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowForgotPassword(false)}
      />
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

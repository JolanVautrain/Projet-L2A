import { createPortal } from "react-dom";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
/**
 * Composant ChangeUsernameModal
 * Modal pour réinitialiser le mot de passe avec un recovery code
 */
function ChangeUsernameModal({ isOpen, onClose, onBackToLogin, user, setUser }) {
  const [password, setPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
    const passwordTrim = password.trim();
    const newUsernameTrim = newUsername.trim();

    // Validation
    if (!passwordTrim || !newUsernameTrim) {
      setError(t("forgotPassword.allFieldsRequired"));
      return;
    }

    setLoading(true);
    setError("");

    fetch("/api/user/resetUsername", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: user,
        password: passwordTrim,
        new_username: newUsername,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(
            t(`forgotPassword.error_${data.error}`) ||
              data.message ||
              t("forgotPassword.resetFailed")
          );
        } else if (data.ok) {
          setSuccess(true);
          setTimeout(() => {
            setPassword("");
            setNewUsername("");
            setSuccess(false);
            onBackToLogin();
          }, 2000);

          fetch("api/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: newUsername,
              password: passwordTrim,
            }),
          }).catch(() => {});

          setUser(newUsername)
        }
      })
      .catch((err) => {
        setError(t("forgotPassword.connectionError"));
        console.error("Erreur:", err);
      })
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="login-modal styled-modal">
      <div className="modal-card">
        <header className="modal-header">
          <h2>{t("resetUsername.title")}</h2>
        </header>
        <button
          className="modal-close"
          onClick={onClose}
          title={t("common.close")}
        >
          ×
        </button>
        {success && (
          <div className="modal-success-message">
            {t("resetUsername.resetSuccess")}
          </div>
        )}
        {!success && (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="modal-field">
              <label htmlFor="new-username">
                {t("resetUsername.new-username")}
              </label>
              <input
                id="new-username"
                type="password"
                autoComplete="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="modal-input"
                placeholder={t("resetUsername.newUsernamePlaceholder")}
              />
            </div>
            <div className="modal-field">
              <label htmlFor="password">
                {t("forgotPassword.newPassword")}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="modal-input"
                placeholder={t("forgotPassword.newPassword")}
              />
            </div>
            {error && <div className="modal-error">{error}</div>}
            <button type="submit" className="modal-button" disabled={loading}>
              {loading ? t("common.loading") : t("resetUsername.resetUsername")}
            </button>
          </form>
        )}
        <div className="modal-footer">
          <button className="modal-link" onClick={onBackToLogin}>
            {t("forgotPassword.backToLogin")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

ChangeUsernameModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBackToLogin: PropTypes.func.isRequired,
};

export default ChangeUsernameModal;

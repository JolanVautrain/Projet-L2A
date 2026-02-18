import { createPortal } from "react-dom";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";

/**
 * Composant ChangePasswordModal
 * Modal pour réinitialiser le mot de passe avec un recovery code
 */
function ChangePasswordModal({ isOpen, onClose, onBackToLogin, user }) {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
    const passwordTrim = password.trim();
    const newPasswordTrim = newPassword.trim();
    const confirmTrim = confirmPassword.trim();

    // Validation
    if (!passwordTrim || !newPasswordTrim || !confirmTrim) {
      setError(t("forgotPassword.allFieldsRequired"));
      return;
    }

    if (newPasswordTrim != confirmTrim) {
      setError(t("forgotPassword.passwordMismatch"));
      return;
    }

    if (newPasswordTrim.length < 4) {
      setError(t("forgotPassword.passwordTooShort"));
      return;
    }

    setLoading(true);
    setError("");

    fetch("/api/user/resetPassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: user,
        password: passwordTrim,
        new_password: newPasswordTrim,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(
            t(`forgotPassword.error_${data.error}`) || data.message || t("forgotPassword.resetFailed")
          );
        } else if (data.ok) {
          setSuccess(true);
          setTimeout(() => {
            setPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setSuccess(false);
            onBackToLogin();
          }, 2000);
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
          <h2>{t("forgotPassword.title")}</h2>
        </header>
        <button className="modal-close" onClick={onClose} title={t("common.close")}>
          ×
        </button>

        {success && (
          <div className="modal-success-message">
            {t("forgotPassword.resetSuccess")}
          </div>
        )}

        {!success && (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="modal-field">
              <label htmlFor="old-password">{t("resetPassword.old-password")}</label>
              <input
                id="old-password"
                type="password"
                autoComplete="old-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="modal-input"
                placeholder={t("resetPassword.oldPasswordPlaceholder")}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="new-password">{t("forgotPassword.newPassword")}</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="modal-input"
                placeholder={t("forgotPassword.newPassword")}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="confirm-password">{t("forgotPassword.confirmPassword")}</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="modal-input"
                placeholder={t("forgotPassword.confirmPassword")}
              />
            </div>

            {error && <div className="modal-error">{error}</div>}

            <button type="submit" className="modal-button" disabled={loading}>
              {loading ? t("common.loading") : t("forgotPassword.resetPassword")}
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

ChangePasswordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBackToLogin: PropTypes.func.isRequired,
};

export default ChangePasswordModal;

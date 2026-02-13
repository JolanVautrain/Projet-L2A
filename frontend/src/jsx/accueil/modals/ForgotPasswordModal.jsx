import { createPortal } from "react-dom";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
import { apiUrl } from "../../utils/apiClient.js";

/**
 * Composant ForgotPasswordModal
 * Modal pour réinitialiser le mot de passe avec un recovery code
 */
function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }) {
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  const handleImportFile = (event) => {
    setError("");
    const file = event.target?.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setError(t("forgotPassword.error_invalid_code") || "Invalid file format");
      return;
    }
    file
      .text()
      .then((text) => {
        try {
          const obj = JSON.parse(text);
          if (obj.username) setUsername(String(obj.username));
          if (obj.recovery_code) setRecoveryCode(String(obj.recovery_code));
        } catch {
          setError(t("forgotPassword.error_invalid_code") || "Invalid JSON file");
        }
      })
      .catch(() => setError(t("forgotPassword.error_invalid_code") || "Failed to read file"));

    // Reset de l'input pour permettre de réimporter le même fichier si besoin
    event.target.value = null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const userTrim = username.trim();
    const codeTrim = recoveryCode.trim();
    const pwTrim = newPassword.trim();
    const confirmTrim = confirmPassword.trim();

    // Validation
    if (!userTrim || !codeTrim || !pwTrim || !confirmTrim) {
      setError(t("forgotPassword.allFieldsRequired"));
      return;
    }

    if (pwTrim !== confirmTrim) {
      setError(t("forgotPassword.passwordMismatch"));
      return;
    }

    if (pwTrim.length < 4) {
      setError(t("forgotPassword.passwordTooShort"));
      return;
    }

    setLoading(true);
    setError("");

    fetch(apiUrl("/auth/reset-password-with-code"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: userTrim,
        recovery_code: codeTrim,
        new_password: pwTrim,
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
            setUsername("");
            setRecoveryCode("");
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
              <label htmlFor="forgot-username">{t("forgotPassword.username")}</label>
              <input
                id="forgot-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="modal-input"
                placeholder={t("forgotPassword.usernamePlaceholder")}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
              <input id="import-json" type="file" accept=".json" style={{ display: "none" }} onChange={handleImportFile} />
              <button type="button" className="modal-link" onClick={() => document.getElementById('import-json')?.click()}>
                {t("forgotPassword.importJson") || "Importer un fichier JSON"}
              </button>
            </div>

            <div className="modal-field">
              <label htmlFor="recovery-code">{t("forgotPassword.recoveryCode")}</label>
              <input
                id="recovery-code"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                required
                className="modal-input"
                placeholder={t("forgotPassword.recoveryCodePlaceholder")}
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

ForgotPasswordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBackToLogin: PropTypes.func.isRequired,
};

export default ForgotPasswordModal;

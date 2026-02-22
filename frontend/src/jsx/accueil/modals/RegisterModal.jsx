import { createPortal } from "react-dom";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
import { apiUrl } from "../../utils/apiClient.js";

/**
 * Simple Register modal. Posts to /api/register and calls afterRegister(username) on success.
 */
function RegisterModal({ isOpen, onClose, afterRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError(t("loginModal.usernamePasswordRequired"));
      return;
    }
    if (p !== confirm) {
      setError(t("registerModal.passwordMismatch"));
      return;
    }
    setLoading(true);
    fetch(apiUrl("/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erreur serveur");
        return r.json();
      })
      .then((data) => {
        if (data?.success) {
          if (typeof afterRegister === "function") afterRegister(u);
          if (typeof onClose === "function") onClose();
        } else {
          setError(data?.message || t("registerModal.error"));
        }
      })
      .catch((err) => {
        console.error(err);
        setError(t("loginModal.connectionError"));
      })
      .finally(() => setLoading(false));
  };

  return createPortal(
    <div className="login-modal styled-modal register-modal">
      <div className="modal-card">
        <header className="modal-header">
          <h2>{t("registerModal.title")}</h2>
        </header>
        <button
          className="modal-close"
          onClick={onClose}
          title={t("common.close")}
        >
          ×
        </button>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <label htmlFor="reg-username">{t("loginModal.username")}</label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="modal-input"
            />
          </div>
          <div className="modal-field">
            <label htmlFor="reg-password">{t("loginModal.password")}</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="modal-input"
            />
          </div>
          <div className="modal-field">
            <label htmlFor="reg-confirm">
              {t("registerModal.confirmPassword")}
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="modal-input"
            />
          </div>
          {error && <div className="modal-error">{error}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? t("loginModal.connecting") : t("registerModal.submit")}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

RegisterModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  afterRegister: PropTypes.func,
};

export default RegisterModal;

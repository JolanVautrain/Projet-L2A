import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
import { apiUrl } from "../../utils/apiClient.js";

/** 
 * Composant ReportModal
 * 
 * Permet de signaler un utilisateur via une modal.
 */
function ReportModal({ isOpen, onClose }) {
  const [username, setUsername] = useState("");
  const [accusation, setAccusation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { t } = useLanguage();

  const submitReport = (e) => {
    e.preventDefault();

    const userTrim = username.trim();
    const accTrim = accusation.trim();

    // Validation basique des champs
    if (!userTrim || !accTrim) {
      setError(t("reportModal.usernameAccusationRequired"));
      return;
    }

    setLoading(true);
    setError("");

    fetch(apiUrl("/report"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: userTrim,
        accusation: accTrim,
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
          setError(t("reportModal.incorrectUsername"));
        } else {
          alert(t("reportModal.reportSubmitted"));
          onClose();
          setUsername("");
          setAccusation("");
        }
      })
      .catch((err) => {
        console.error("Erreur:", err);
        setError(t("reportModal.reportFailed"));
      })
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{t("reportModal.title")}</h2>

        <form onSubmit={submitReport}>
          <input
            type="text"
            placeholder={t("reportModal.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <textarea
            placeholder={t("reportModal.accusation")}
            value={accusation}
            onChange={(e) => setAccusation(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? t("reportModal.sending") : t("reportModal.send")}
          </button>

          <button type="button" onClick={onClose}>
            {t("reportModal.cancel")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReportModal;

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

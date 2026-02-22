import { useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "./Language.jsx";
import { apiUrl } from "../utils/apiClient.js";

/**
 * Composant report
 *
 * Permet de signaler un utilisateur via une modal.
 */
function Report({ isOpen, onClose }) {
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
      setError(t("report.usernameAccusationRequired"));
      return;
    }

    setLoading(true);
    setError("");
    console.log("API URL:", apiUrl("report"));

    fetch(apiUrl("report"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: userTrim,
        issue: accTrim,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error("Erreur HTTP: " + response.status + " - " + text);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          alert(t("report.reportSubmitted"));
          onClose();
          setUsername("");
          setAccusation("");
        } else {
          setError(t("report.incorrectUsername"));
        }
      })
      .catch((err) => {
        console.error("Erreur:", err);
        setError(t("report.reportFailed"));
      })
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{t("report.title")}</h2>

        <form onSubmit={submitReport}>
          <input
            type="text"
            placeholder={t("report.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <textarea
            placeholder={t("report.accusation")}
            value={accusation}
            onChange={(e) => setAccusation(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? t("report.sending") : t("report.send")}
          </button>

          <button type="button" onClick={onClose}>
            {t("report.cancel")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Report;

Report.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

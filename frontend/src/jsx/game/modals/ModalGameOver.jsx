import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
import { getActiveUser } from "../../utils/userSession.js";

/**
 * Composant ModalGameOver
 *
 * Affiche une fenêtre modale lorsque le jeu est terminé, montrant le score et le stage atteint, avec des options pour rejouer ou retourner à l'accueil.
 *
 * Props :
 * - isOpen (bool) : indique si la modale doit être affichée
 * - score (number) : le score atteint par le joueur
 * - stage (number) : le stage atteint par le joueur
 * - username (string) : nom d'utilisateur du joueur
 * - onReplay (function) : fonction à appeler pour rejouer
 * - onReturnHome (function) : fonction à appeler pour retourner à l'accueil
 *
 */
function ModalGameOver({
  isOpen,
  score,
  stage,
  username,
  onReplay,
  onReturnHome,
}) {
  const { t } = useLanguage();

  // Récupérer l'avatar depuis localStorage
  const currentUser = username || getActiveUser();
  const getAvatarPath = () => {
    if (currentUser === "admin") return "/assets/avatar/admin.jpg";
    const saved = localStorage.getItem("avatar_" + currentUser);
    return saved && saved !== "admin.jpg"
      ? "/assets/avatar/" + saved
      : "/assets/avatar/businessman1.png";
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {currentUser && (
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <img
              src={getAvatarPath()}
              alt="Avatar"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "3px solid #00ffff",
                boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
              }}
            />
            <p
              style={{
                color: "#00ffff",
                marginTop: "0.5rem",
                fontWeight: "bold",
                maxWidth: "200px",
                wordWrap: "break-word",
                wordBreak: "break-word",
                lineHeight: "1.3",
                margin: "0.5rem auto 0 auto",
                textAlign: "center",
              }}
            >
              {currentUser}
            </p>
          </div>
        )}
        <h2>{t("common.gameOver")}</h2>
        <p>
          {t("game.youReachedScore")} <strong>{score}</strong>{" "}
          {t("game.atStage")} <strong>{stage}</strong>
        </p>
        <div className="modal-buttons">
          <button className="btn accent" onClick={onReplay}>
            {t("common.replay")}
          </button>
          <button className="btn ghost" onClick={onReturnHome}>
            {t("common.returnHome")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalGameOver;

// PropTypes pour le composant ModalGameOver
ModalGameOver.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  score: PropTypes.number,
  stage: PropTypes.number,
  username: PropTypes.string,
  onReplay: PropTypes.func,
  onReturnHome: PropTypes.func,
};

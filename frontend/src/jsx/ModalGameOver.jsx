import "../css/ModalGameOver.css";
import PropTypes from "prop-types";
import { useLanguage } from "./Language.jsx";

function ModalGameOver({ isOpen, score, stage, onReplay, onReturnHome }) {
  const { t } = useLanguage();
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{t("common.gameOver")}</h2>
        <p>{t("game.youReachedScore")} <strong>{score}</strong> {t("game.atStage")} <strong>{stage}</strong></p>
        <div className="modal-buttons">
          <button 
            className="btn accent"
            onClick={onReplay}
          >
            {t("common.replay")}
          </button>
          <button 
            className="btn ghost"
            onClick={onReturnHome}
          >
            {t("common.returnHome")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalGameOver;

ModalGameOver.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  score: PropTypes.number,
  stage: PropTypes.number,
  onReplay: PropTypes.func,
  onReturnHome: PropTypes.func,
};

import "../../../static/css/ModalGameOver.css";
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";

function ModalGameWon({ isOpen, score, stage, onReplay, onReturnHome }) {
  const { t } = useLanguage();
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Game Won</h2>
        <p>You reached score <strong>{score}</strong> at Stage <strong>{stage}</strong></p>
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

export default ModalGameWon;

ModalGameWon.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  score: PropTypes.number,
  stage: PropTypes.number,
  onReplay: PropTypes.func,
  onReturnHome: PropTypes.func,
};

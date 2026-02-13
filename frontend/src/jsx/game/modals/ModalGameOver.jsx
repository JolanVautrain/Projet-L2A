
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";

/**
 * Composant ModalGameOver
 * 
 * Affiche une fenêtre modale lorsque le jeu est terminé, montrant le score et le stage atteint, avec des options pour rejouer ou retourner à l'accueil.
 *  
 * Props :
 * - isOpen (bool) : indique si la modale doit être affichée
 * - score (number) : le score atteint par le joueur
 * - stage (number) : le stage atteint par le joueur
 * - onReplay (function) : fonction à appeler pour rejouer
 * - onReturnHome (function) : fonction à appeler pour retourner à l'accueil
 * 
*/
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

// PropTypes pour le composant ModalGameOver
ModalGameOver.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  score: PropTypes.number,
  stage: PropTypes.number,
  onReplay: PropTypes.func,
  onReturnHome: PropTypes.func,
};

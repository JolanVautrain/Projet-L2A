
import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";

/**
 * 
 * Composant ModalGameWon
 * 
 * Affiche une fenêtre modale lorsque le joueur gagne, montrant le score et le stage atteint, avec des options pour rejouer ou retourner à l'accueil.
 * 
 * Props :
 * - isOpen (bool) : indique si la modale doit être affichée
 * - score (number) : le score atteint par le joueur
 * - stage (number) : le stage atteint par le joueur
 * - onReplay (function) : fonction à appeler pour rejouer
 * - onReturnHome (function) : fonction à appeler pour retourner à l'accueil
 * 
 * Note : Ce composant est similaire à ModalGameOver, mais avec un message de victoire. Il peut être utilisé pour célébrer la réussite du joueur et l'encourager à rejouer ou à explorer d'autres fonctionnalités du site.
 * 
 * @param {*} param0 
 * @returns 
 */
function ModalGameWon({ isOpen, score, stage, onReplay, onReturnHome }) {
  const { t } = useLanguage();
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{t("game.wonTitle")}</h2>
        <p>{t("game.wonMessage")} <strong>{score}</strong> {t("game.wonMessageSuite")} <strong>{stage}</strong></p>
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

// Définition des types de props pour le composant ModalGameWon
ModalGameWon.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  score: PropTypes.number,
  stage: PropTypes.number,
  onReplay: PropTypes.func,
  onReturnHome: PropTypes.func,
};

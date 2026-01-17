import "../css/ModalGameOver.css";

function ModalGameOver({ isOpen, score, stage, onReplay, onReturnHome }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Game Over</h2>
        <p>Vous avez atteint le score de <strong>{score}</strong> au stage <strong>{stage}</strong></p>
        <div className="modal-buttons">
          <button 
            className="btn accent"
            onClick={onReplay}
          >
            Rejouer
          </button>
          <button 
            className="btn ghost"
            onClick={onReturnHome}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalGameOver;

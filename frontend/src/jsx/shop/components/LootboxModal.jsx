import PropTypes from 'prop-types';

export function LootboxModal({ isOpen, product, prize, isWaiting, countdown, onClose, t }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>{product?.title}</h3>
        {isWaiting ? (
          <>
            <p className="modal-notice">⏳ Ouverture en cours...</p>
            <div className="loot-countdown">
              <div className="countdown-circle">
                <span className="countdown-number">{countdown}</span>
              </div>
              <p className="countdown-text">Secondes restantes</p>
            </div>
          </>
        ) : (
          <p className="modal-notice">{t('shop.loot.revealing')}</p>
        )}
        <div className="modal-product">
          <img src={product?.img} alt="" />
          <div>
            <strong>{product?.title}</strong>
            <div className="modal-price">{product?.price}</div>
          </div>
        </div>
        <div className="loot-reveal">
          {prize ? (
            <div className="prize">
              <img src={prize.img} alt="" />
              <div className="prize-name">{prize.name}</div>
            </div>
          ) : (
            <div className="prize-placeholder">{t('shop.loot.loading')}</div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn primary" onClick={onClose} disabled={isWaiting}>
            {isWaiting ? 'Patientez...' : t('shop.loot.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

LootboxModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  product: PropTypes.object,
  prize: PropTypes.object,
  isWaiting: PropTypes.bool.isRequired,
  countdown: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

import { useEffect, useState } from "react";
import PropTypes from "prop-types";

export function LootboxModal({
  isOpen,
  product,
  prize,
  isWaiting,
  countdown,
  onClose,
  t,
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prizeItems = prize?.items || (prize ? [prize] : []);
  const remainingCount = Math.max(prizeItems.length - visibleCount, 0);

  useEffect(() => {
    if (!isOpen || isWaiting || prizeItems.length === 0) {
      setVisibleCount(0);
      return undefined;
    }

    setVisibleCount(1);
    if (prizeItems.length <= 1) return undefined;

    let current = 1;
    const intervalId = setInterval(() => {
      current += 1;
      setVisibleCount(current);
      if (current >= prizeItems.length) {
        clearInterval(intervalId);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isOpen, isWaiting, prize?.batchId, prizeItems.length]);

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
          <p className="modal-notice">{t("shop.loot.revealing")}</p>
        )}
        <div className="modal-product">
          <img src={product?.img} alt="" />
          <div>
            <strong>{product?.title}</strong>
            <div className="modal-price">{product?.price}</div>
          </div>
        </div>
        <div className="loot-reveal">
          {prizeItems.length > 0 ? (
            <div className="prize-list">
              {prizeItems[visibleCount - 1] && (
                <div
                  className="prize"
                  key={
                    prizeItems[visibleCount - 1].rewardId ||
                    prizeItems[visibleCount - 1].productId ||
                    prizeItems[visibleCount - 1].name
                  }
                >
                  <img src={prizeItems[visibleCount - 1].img} alt="" />
                  <div className="prize-name">
                    {prizeItems[visibleCount - 1].name}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="prize-placeholder">{t("shop.loot.loading")}</div>
          )}
        </div>
        {!isWaiting && prizeItems.length > 0 && (
          <p className="modal-notice">
            {`Récompenses restantes : ${remainingCount}`}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="btn primary"
            onClick={onClose}
            disabled={isWaiting}
          >
            {isWaiting ? "Patientez..." : t("shop.loot.close")}
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

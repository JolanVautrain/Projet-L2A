import PropTypes from "prop-types";
import { useState } from "react";
import { useLanguage } from "../../autres/Language.jsx";

// Composants d'interface utilisateur pour la boutique
export function SalesBanner({ showPrice, countdown, formatTime, t }) {
  return (
    <div className="sale-banner">
      {showPrice ? (
        <>
          {t("shop.salePrefix")}{" "}
          <strong className="sale-timer">{formatTime(countdown)}</strong>
        </>
      ) : (
        <span className="ended">{t("shop.saleEnded")}</span>
      )}
    </div>
  );
}

SalesBanner.propTypes = {
  showPrice: PropTypes.bool.isRequired,
  countdown: PropTypes.number.isRequired,
  formatTime: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

// Composant de bannière d'alerte de prix pour les offres flash
export function PriceWarningBanner({ show, timer }) {
  const { t } = useLanguage();
  if (!show) return null;
  return (
    <div className="price-warning-banner">
      ⚠️ <strong>{t("shop.alertPrice")}</strong> {t("shop.priceAlert")}{" "}
      <strong>{timer}s</strong> {t("shop.priceAlertBuy")}
    </div>
  );
}

PriceWarningBanner.propTypes = {
  show: PropTypes.bool.isRequired,
  timer: PropTypes.number.isRequired,
};

// Composant de notification pour les actions de l'utilisateur
export function Notification({ message }) {
  if (!message) return null;
  return (
    <div className="shop-notification">
      <span className="notif-icon">👤</span>
      <span className="notif-text">{message}</span>
    </div>
  );
}

Notification.propTypes = {
  message: PropTypes.string,
};

// Composant de confettis pour célébrer les achats réussis
export function Confetti() {
  // Generate confetti data once on mount
  const [confettiPieces] = useState(() => {
    return Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      delay: (Math.random() * 1.2).toFixed(2),
      bg: ["#ff6b6b", "#ffd166", "#8bd3dd", "#7c3aed", "#60d394"][i % 5],
    }));
  });

  return (
    <div className="confetti-root" aria-hidden>
      {confettiPieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            background: piece.bg,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";

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

export function Confetti() {
  return (
    <div className="confetti-root" aria-hidden>
      {Array.from({ length: 36 }).map((_, i) => {
        const left = Math.round(Math.random() * 100);
        const delay = (Math.random() * 1.2).toFixed(2);
        const bg = ["#ff6b6b", "#ffd166", "#8bd3dd", "#7c3aed", "#60d394"][
          i % 5
        ];
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: bg,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

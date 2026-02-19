import PropTypes from 'prop-types';
import { useLanguage } from "../../autres/Language.jsx";
import './SavingsBadge.css';

// Composant de badge d'économies pour les produits en promotion
export function SavingsBadge({ originalPrice, originalOldPrice }) {
  if (!originalOldPrice || !originalPrice) return null;

  const oldVal = Number.parseFloat(originalOldPrice.replace('€', '').replace(',', '.'));
  const newVal = Number.parseFloat(originalPrice.replace('€', '').replace(',', '.'));
  const savings = Math.round(((oldVal - newVal) / oldVal) * 100);
  const {t} = useLanguage()

  if (savings <= 0) return null;

  return (
    <div className="savings-badge">
      <span className="savings-percent">-{savings}%</span>
      <span className="savings-text">{t("shop.economies")}</span>
    </div>
  );
}

SavingsBadge.propTypes = {
  originalPrice: PropTypes.string.isRequired,
  originalOldPrice: PropTypes.string.isRequired,
};

import PropTypes from 'prop-types';
import './TrendingBadge.css';

// Composant de badge de tendance pour les produits populaires
export function TrendingBadge({ type = 'hot', text = '🔥 TENDANCE' }) {
  return (
    <div className={`trending-badge trending-${type}`}>
      <span className="trending-animated">{text}</span>
    </div>
  );
}

TrendingBadge.propTypes = {
  type: PropTypes.oneOf(['hot', 'new', 'limited']),
  text: PropTypes.string,
};

import PropTypes from 'prop-types';
import './TrendingBadge.css';

export function TrendingBadge({ type = 'hot', text = t("shop.trending") }) {
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

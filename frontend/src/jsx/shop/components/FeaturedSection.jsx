import PropTypes from 'prop-types';
import './FeaturedSection.css';

export function FeaturedSection({ trendingProducts, onAddToCart, viewerCounts, reviewCounts }) {
  if (trendingProducts.length === 0) return null;

  return (
    <section className="featured-section">
      <div className="featured-header">
        <h2 className="featured-title">
          {/* eslint-disable-next-line jsx-a11y/no-trailing-whitespace */}
          <span className="featured-icon">⭐</span> En vedette cette semaine <span className="featured-icon">⭐</span>
        </h2>
        <p className="featured-subtitle">Les articles les plus populaires</p>
      </div>
      
      <div className="featured-carousel">
        {trendingProducts.slice(0, 3).map((product, idx) => (
          <div key={product.id} className="featured-item" style={{ animationDelay: `${idx * 0.1}s` }}>
            <div className="featured-rank">#{idx + 1}</div>
            <img src={product.img} alt={product.title} className="featured-img" />
            <div className="featured-content">
              <h3>{product.title}</h3>
              <div className="featured-meta">
                <span className="featured-price">{product.price}</span>
                <span className="featured-viewers">👁️ {viewerCounts[product.id]}</span>
              </div>
              <button 
                className="btn small primary" 
                onClick={() => onAddToCart(product)}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                + Ajouter
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

FeaturedSection.propTypes = {
  trendingProducts: PropTypes.array.isRequired,
  onAddToCart: PropTypes.func.isRequired,
  viewerCounts: PropTypes.object.isRequired,
  reviewCounts: PropTypes.object.isRequired,
};

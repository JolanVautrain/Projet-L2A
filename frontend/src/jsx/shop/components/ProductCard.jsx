import PropTypes from "prop-types";
import { useLanguage } from "../../autres/Language.jsx";
import { SavingsBadge } from "./SavingsBadge.jsx";
import { TrendingBadge } from "./TrendingBadge.jsx";
import "./ProductCard.css";

// Composant de carte de produit pour la boutique
export function ProductCard({
  product,
  onAddToCart,
  saleActive,
  viewerCount,
  reviewCount,
  isAlreadyOwned = false,
  t: parentT,
}) {
  const { t: contextT } = useLanguage();
  const t = parentT || contextT;

  return (
    <article
      className={`product-card ${product.stock <= 2 ? "low-stock" : ""} ${product.hot ? "hot-deal" : ""}`}
    >
      <div className="product-deco" aria-hidden>
        <span className="spark" />
        <span className="spark" />
        <span className="spark" />
      </div>

      {product.hot && <TrendingBadge type="hot" text={t("shop.trending")} />}
      {product.oldPrice && (
        <SavingsBadge
          originalPrice={product.price}
          originalOldPrice={product.oldPrice}
        />
      )}

      <img src={product.img} alt="" className="product-img" />
      <div className="product-body">
        <h4>{product.title}</h4>
        <p>{product.desc}</p>
        <div className="product-actions">
          <div className="price-block">
            {product.oldPrice && (
              <span className="product-old-price">{product.oldPrice}</span>
            )}
            <span className="product-price">{product.price}</span>
          </div>
          <button
            onClick={() => onAddToCart(product)}
            disabled={!saleActive || product.stock === 0 || isAlreadyOwned}
            className={`btn primary ${product.stock <= 2 ? "pulse" : ""} ${!saleActive || product.stock === 0 || isAlreadyOwned ? "disabled" : ""}`}
          >
            {isAlreadyOwned
              ? t("account.alreadyOwned")
              : !saleActive || product.stock === 0
                ? t("shop.outOfStock")
                : t("shop.addToCart")}
          </button>
        </div>
        {product.stock !== undefined && (
          <div className="stock-line">
            {product.stock > 0 ? (
              <span className="stock-text">
                {t("shop.onlyRemaining")} {product.stock} {t("shop.remaining")}
              </span>
            ) : (
              <span className="stock-text sold-out">
                {t("shop.outOfStock")}
              </span>
            )}
          </div>
        )}
        <div className="product-reviews">
          <div className="stars">★★★★★</div>
          <span className="review-count">
            {reviewCount} {t("shop.reviews")}
          </span>
        </div>
        <div className="viewer-count">
          <strong>{viewerCount}</strong> {t("shop.viewersViewing")}
        </div>
        {product.stock !== undefined && product.stock > 0 && (
          <div className="stock-bar">
            <div
              className="stock-bar-fill"
              style={{ width: `${(product.stock / 50) * 100}%` }}
            ></div>
          </div>
        )}
      </div>
    </article>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    img: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    desc: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    oldPrice: PropTypes.string,
    badge: PropTypes.string,
    hot: PropTypes.bool,
    stock: PropTypes.number,
    unique: PropTypes.bool,
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
  saleActive: PropTypes.bool.isRequired,
  viewerCount: PropTypes.number.isRequired,
  reviewCount: PropTypes.number.isRequired,
  isAlreadyOwned: PropTypes.bool,
  t: PropTypes.func,
};

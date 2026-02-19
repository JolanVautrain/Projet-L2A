import { useState } from "react";
import PropTypes from "prop-types";
import {
  EXTRA_COSTS,
  calculateModalTotal,
  formatPrice,
} from "../utils/shopUtils.js";

export function CartModal({
  isOpen,
  cart,
  cartTotal,
  cartItemCount,
  onClose,
  onCheckout,
  onUpdateQuantity,
  onRemove,
  t,
}) {
  const [extras, setExtras] = useState({
    delivery: true,
    express: true,
    giftWrap: false,
    support: false,
    warranty: true,
    insurance: false,
  });

  const extrasTotal = Object.entries(extras).reduce((sum, [key, checked]) => {
    if (checked && EXTRA_COSTS[key]) {
      return sum + EXTRA_COSTS[key].price;
    }
    return sum;
  }, 0);

  const totalWithExtras = calculateModalTotal(cartTotal, extras);

  const toggleExtra = (key) => {
    if (key === "delivery") return;
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card cart-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cart-header">
          <h3>🛒 Mon Panier</h3>
          <button className="btn ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Votre panier est vide</p>
            <button className="btn primary" onClick={onClose}>
              Continuer mes achats
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <img src={item.img} alt="" className="cart-item-img" />
                  <div className="cart-item-info">
                    <h4>{item.title}</h4>
                    <p className="cart-item-price">{item.price}</p>
                    {item.rarity && (
                      <span className={`rarity-badge rarity-${item.rarity}`}>
                        {item.rarity === "common" && "⚪ Commun"}
                        {item.rarity === "rare" && "🔵 Rare"}
                        {item.rarity === "epic" && "🟣 Épique"}
                      </span>
                    )}
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="btn ghost quantity-btn"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      className="btn ghost quantity-btn"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      className="btn ghost remove-btn"
                      onClick={() => onRemove(item.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-extras">
              <h4>{t("shop.modal.extrasTitle")}</h4>
              <label className="cart-extra">
                <input type="checkbox" checked={extras.delivery} disabled />
                <span>{t("shop.modal.delivery")}</span>
                <span className="cart-extra-price">
                  +{formatPrice(EXTRA_COSTS.delivery.price)}
                </span>
              </label>
              <label className="cart-extra">
                <input
                  type="checkbox"
                  checked={extras.express}
                  onChange={() => toggleExtra("express")}
                />
                <span>{t("shop.modal.express")}</span>
                <span className="cart-extra-price">
                  +{formatPrice(EXTRA_COSTS.express.price)}
                </span>
              </label>
              <label className="cart-extra">
                <input
                  type="checkbox"
                  checked={extras.giftWrap}
                  onChange={() => toggleExtra("giftWrap")}
                />
                <span>{t("shop.modal.giftWrap")}</span>
                <span className="cart-extra-price">
                  +{formatPrice(EXTRA_COSTS.giftWrap.price)}
                </span>
              </label>
              <label className="cart-extra">
                <input
                  type="checkbox"
                  checked={extras.support}
                  onChange={() => toggleExtra("support")}
                />
                <span>{t("shop.modal.support")}</span>
                <span className="cart-extra-price">
                  +{formatPrice(EXTRA_COSTS.support.price)}
                </span>
              </label>
              <label className="cart-extra">
                <input
                  type="checkbox"
                  checked={extras.warranty}
                  onChange={() => toggleExtra("warranty")}
                />
                <span>{t("shop.modal.warranty")}</span>
                <span className="cart-extra-price">
                  +{formatPrice(EXTRA_COSTS.warranty.price)}
                </span>
              </label>
              <label className="cart-extra">
                <input
                  type="checkbox"
                  checked={extras.insurance}
                  onChange={() => toggleExtra("insurance")}
                />
                <span>{t("shop.modal.insurance")}</span>
                <span className="cart-extra-price">
                  +{formatPrice(EXTRA_COSTS.insurance.price)}
                </span>
              </label>
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Sous-total:</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <div className="cart-total cart-total--small">
                <span>Options:</span>
                <strong>{formatPrice(extrasTotal)}</strong>
              </div>
              <div className="cart-total">
                <span>Total:</span>
                <strong>{totalWithExtras}</strong>
              </div>
              <button className="btn accent checkout-btn" onClick={onCheckout}>
                Acheter ({cartItemCount} article{cartItemCount > 1 ? "s" : ""})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

CartModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  cart: PropTypes.array.isRequired,
  cartTotal: PropTypes.number.isRequired,
  cartItemCount: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onCheckout: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

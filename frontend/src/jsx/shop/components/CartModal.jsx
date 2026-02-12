import PropTypes from 'prop-types';

export function CartModal({ isOpen, cart, cartTotal, cartItemCount, onClose, onCheckout, onUpdateQuantity, onRemove, t }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card cart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h3>🛒 Mon Panier</h3>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Votre panier est vide</p>
            <button className="btn primary" onClick={onClose}>Continuer mes achats</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.img} alt="" className="cart-item-img" />
                  <div className="cart-item-info">
                    <h4>{item.title}</h4>
                    <p className="cart-item-price">{item.price}</p>
                    {item.rarity && (
                      <span className={`rarity-badge rarity-${item.rarity}`}>
                        {item.rarity === 'common' && '⚪ Commun'}
                        {item.rarity === 'rare' && '🔵 Rare'}
                        {item.rarity === 'epic' && '🟣 Épique'}
                      </span>
                    )}
                  </div>
                  <div className="cart-item-controls">
                    <button className="btn ghost quantity-btn" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span className="quantity">{item.quantity}</span>
                    <button className="btn ghost quantity-btn" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="btn ghost remove-btn" onClick={() => onRemove(item.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total:</span>
                <strong>{cartTotal.toFixed(2)}€</strong>
              </div>
              <button className="btn accent checkout-btn" onClick={onCheckout}>
                Acheter ({cartItemCount} article{cartItemCount > 1 ? 's' : ''})
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

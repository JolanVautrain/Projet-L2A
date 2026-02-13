// Hooks
export { useCart } from './hooks/useCart.js';
export { useLootbox } from './hooks/useLootbox.js';
export { usePriceMultiplier, useSaleCountdown, usePriceWarning, useViewerCount } from './hooks/useSales.js';

// Components
export { ProductCard } from './components/ProductCard.jsx';
export { CartModal } from './components/CartModal.jsx';
export { LootboxModal } from './components/LootboxModal.jsx';
export { SalesBanner, PriceWarningBanner, Notification, Confetti } from './components/ShopUI.jsx';

// Utils
export { 
  parsePrice, 
  formatPrice, 
  formatTime, 
  applyPriceMultiplier,
  EXTRA_COSTS,
  calculateModalTotal,
  FAKE_NOTIFICATIONS,
  FAKE_NAMES
} from './utils/shopUtils.js';

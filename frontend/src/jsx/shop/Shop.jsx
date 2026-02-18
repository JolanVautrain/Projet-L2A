import { useLanguage } from "../autres/Language.jsx";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { getActiveUser, setActiveUser } from "../utils/userSession.js";
import shopProductsData from "./shopProducts.json";
import { useCart } from "./hooks/useCart.js";
import { useLootbox } from "./hooks/useLootbox.js";
import {
  usePriceMultiplier,
  useSaleCountdown,
  usePriceWarning,
} from "./hooks/useSales.js";
import {
  formatTime,
  applyPriceMultiplier,
  FAKE_NOTIFICATIONS,
  FAKE_NAMES,
} from "./utils/shopUtils.js";
import { ProductCard } from "./components/ProductCard.jsx";
import { CartModal } from "./components/CartModal.jsx";
import { LootboxModal } from "./components/LootboxModal.jsx";
import {
  PriceWarningBanner,
  Notification,
  Confetti,
} from "./components/ShopUI.jsx";
import { FilterTabs } from "./components/FilterTabs.jsx";
import { FeaturedSection } from "./components/FeaturedSection.jsx";
import LoginModal from "../accueil/modals/LoginModal.jsx";
import RegisterModal from "../accueil/modals/RegisterModal.jsx";
import "./components/ShopAnimations.css";

function Shop({ user, setUser }) {
  const { t } = useLanguage();

  // Hooks pour la logique métier
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotal,
    getItemCount,
    clear: clearCart,
  } = useCart();
  const {
    lootOpen,
    lootProduct,
    lootPrize,
    lootWaiting,
    lootCountdown,
    openLootbox,
    closeLootbox,
  } = useLootbox();
  const priceMultiplier = usePriceMultiplier();
  const saleCountdown = useSaleCountdown();
  const { showPriceWarning, priceWarningTimer } = usePriceWarning();

  // État UI
  const [showCart, setShowCart] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notification, setNotification] = useState(null);
  const [reviewCounts, setReviewCounts] = useState({});
  const [viewerCounts, setViewerCounts] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Fonction de connexion - utilise maintenant la fonction setUser du parent
  const handleLogin = (username, sessionToken) => {
    setUser(username, sessionToken);
    setIsLoginOpen(false);
  };

  // Générer les avis et viewers une seule fois au démarrage
  useEffect(() => {
    const reviews = {};
    const viewers = {};
    shopProductsData.products.forEach((product) => {
      reviews[product.id] = Math.floor(Math.random() * 500) + 150;
      viewers[product.id] = Math.floor(Math.random() * 100) + 5;
    });
    setReviewCounts(reviews);
    setViewerCounts(viewers);
  }, []);

  // Notifications sociales (fausses)
  useEffect(() => {
    const showNotification = () => {
      const msgFn =
        FAKE_NOTIFICATIONS[
          Math.floor(Math.random() * FAKE_NOTIFICATIONS.length)
        ];
      const msg = msgFn(FAKE_NAMES);
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
    };

    const timer = setTimeout(showNotification, 2000);
    const interval = setInterval(
      showNotification,
      Math.random() * 12000 + 15000,
    );
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Produits avec prix ajustés selon le multiplicateur
  const products = shopProductsData.products.map((p) =>
    applyPriceMultiplier(p, priceMultiplier, t),
  );

  // Définition des catégories pour les filtres
  const categories = [
    { id: "all", label: "Tout voir", icon: "🏪", count: products.length },
    {
      id: "hot",
      label: "Tendance",
      icon: "🔥",
      count: products.filter((p) => p.hot).length,
    },
    {
      id: "skins",
      label: "Skins",
      icon: "👕",
      count: products.filter((p) => p.category === "skins").length,
    },
    {
      id: "items",
      label: "Objets",
      icon: "📦",
      count: products.filter((p) => p.category === "items").length,
    },
    {
      id: "lootboxes",
      label: "Mystères",
      icon: "🎁",
      count: products.filter((p) => p.category === "lootboxes").length,
    },
    {
      id: "boosters",
      label: "Boosts",
      icon: "⚡",
      count: products.filter((p) => p.category === "boosters").length,
    },
  ];

  // Filtrage des produits
  const filteredProducts = products.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "hot") return p.hot;
    return p.category === activeFilter;
  });

  const handleCheckout = async () => {
    setShowCart(false);

    // Enregistrer chaque achat dans la base de données
    if (user) {
      for (const item of cart) {
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/shop/purchase`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: user,
                product_id: item.id,
                product_name: t(item.titleKey),
                price: item.price,
              }),
            },
          );
        } catch (error) {
          console.error("Failed to record purchase:", error);
        }
      }
    }

    const lootboxes = cart.filter((item) => item.isLootbox);

    if (lootboxes.length > 0) {
      lootboxes.forEach((loot, idx) => {
        setTimeout(() => {
          for (let i = 0; i < loot.quantity; i++) {
            setTimeout(
              () =>
                openLootbox(
                  loot,
                  shopProductsData.lootboxRewards,
                  products,
                  shopProductsData.lootboxWaitTimes[loot.id] || 3,
                ),
              i * 500,
            );
          }
        }, idx * 500);
      });
    } else {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3200);
    }
    // Note: localStorage backup supprimé, on utilise maintenant la BDD
    clearCart();
  };

  // Si non authentifié, afficher la page de connexion
  if (!user) {
    return (
      <div className="account account--centered">
        <h1>{t("shop.title")}</h1>
        <p className="account__notice">{t("account.loginRequired")}</p>
        <button
          className="btn primary account__login-btn"
          onClick={() => setIsLoginOpen(true)}
        >
          {t("account.openLogin")}
        </button>
        <LoginModal
          isOpen={isLoginOpen}
          action={handleLogin}
          onClose={() => setIsLoginOpen(false)}
          openRegister={() => {
            setIsLoginOpen(false);
            setIsRegisterOpen(true);
          }}
          afterLogin={() => {}}
        />
        <RegisterModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          afterRegister={(username, sessionToken) => {
            setUser(username, sessionToken);
            setIsRegisterOpen(false);
          }}
        />
        <div className="account-loop" aria-hidden>
          <div className="loop-wrapper">
            <div className="mountain"></div>
            <div className="hill"></div>
            <div className="tree"></div>
            <div className="tree"></div>
            <div className="tree"></div>
            <div className="rock"></div>
            <div className="truck"></div>
            <div className="wheels"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <section className="hero">
        <div className="hero__copy">
          <div className="sale-banner">
            {t("shop.salePrefix")}{" "}
            <strong className="sale-timer">{formatTime(saleCountdown)}</strong>
          </div>
          <h1>{t("shop.title")}</h1>
          <p className="hero__eyebrow">{t("shop.subtitle")}</p>
          <p className="hero__lede">{t("shop.intro")}</p>
          <button
            className="btn primary cart-button"
            onClick={() => setShowCart(true)}
          >
            🛒 Panier{" "}
            {getItemCount() > 0 && (
              <span className="cart-badge">{getItemCount()}</span>
            )}
          </button>
        </div>
      </section>

      <FeaturedSection
        trendingProducts={products.filter((p) => p.hot)}
        onAddToCart={addToCart}
        viewerCounts={viewerCounts}
        reviewCounts={reviewCounts}
      />

      <PriceWarningBanner show={showPriceWarning} timer={priceWarningTimer} />

      <FilterTabs
        activeTab={activeFilter}
        onTabChange={setActiveFilter}
        categories={categories}
      />

      <section className="shop-grid">
        {filteredProducts.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onAddToCart={addToCart}
            saleActive={true}
            viewerCount={viewerCounts[p.id]}
            reviewCount={reviewCounts[p.id]}
          />
        ))}
      </section>

      <CartModal
        isOpen={showCart}
        cart={cart}
        cartTotal={getTotal()}
        cartItemCount={getItemCount()}
        onClose={() => setShowCart(false)}
        onCheckout={handleCheckout}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        t={t}
      />

      <LootboxModal
        isOpen={lootOpen}
        product={lootProduct}
        prize={lootPrize}
        isWaiting={lootWaiting}
        countdown={lootCountdown}
        onClose={closeLootbox}
        t={t}
      />

      {showConfetti && <Confetti />}

      <Notification message={notification} />
    </div>
  );
}

export default Shop;

// PropTypes validation pour le composant Shop
Shop.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

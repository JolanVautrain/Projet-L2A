import { useLanguage } from "../autres/Language.jsx";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { getActiveUser, setActiveUser } from "../utils/userSession.js";
import shopProductsData from "./shopProducts.json";
import { useCart } from "./hooks/useCart.js";
import { useLootbox } from "./hooks/useLootbox.js";
import { useSkins } from "./hooks/useSkins.js";
import { useBombPack } from "./hooks/useBombPack.js";
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
import { BombPackManager } from "./components/BombPackManager.jsx";
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
    openLootboxBatch,
    closeLootbox,
  } = useLootbox();
  const priceMultiplier = usePriceMultiplier();
  const saleCountdown = useSaleCountdown();
  const { showPriceWarning, priceWarningTimer } = usePriceWarning();
  const { purchaseSkin, activateSkin } = useSkins(user);
  const {
    hasActiveBombPack,
    purchaseItem: purchaseBombItem,
    activateItem: activateBombItem,
  } = useBombPack(user);

  // État UI
  const [showCart, setShowCart] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notification, setNotification] = useState(null);
  const [reviewCounts, setReviewCounts] = useState({});
  const [viewerCounts, setViewerCounts] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [lastLootPrizeId, setLastLootPrizeId] = useState(null);
  const [userPurchasedProducts, setUserPurchasedProducts] = useState([]);

  // Charger les produits achetés par l'utilisateur
  useEffect(() => {
    if (!user) {
      setUserPurchasedProducts([]);
      return;
    }

    const fetchUserPurchases = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiBase}/api/shop/purchases/${user}`);
        if (!res.ok) throw new Error("Erreur chargement achats");

        const data = await res.json();
        const productIds = data.purchases.map((p) => p.product_id);
        setUserPurchasedProducts(productIds);
      } catch (err) {
        console.error("Erreur chargement achats:", err);
      }
    };

    fetchUserPurchases();
  }, [user]);

  // Synchroniser les effets cosmétiques avec les achats réels
  // Si un effet est actif mais que l'article n'existe plus, le désactiver
  useEffect(() => {
    if (!user || userPurchasedProducts.length === 0) {
      return;
    }

    // Vérifier le skin néon
    if (!userPurchasedProducts.includes("skin-neo")) {
      // Le skin n'est plus acheté, désactiver l'effet
      const html = document.documentElement;
      html.classList.remove("neon-skin-active");
    }

    // Vérifier le pack bombe
    if (!userPurchasedProducts.includes("bomb-icon")) {
      // Le pack n'est plus acheté, nettoyer le localStorage
      const activeItemsKey = `activeItems:${user}`;
      const activeItems = localStorage.getItem(activeItemsKey);
      if (activeItems) {
        try {
          const items = JSON.parse(activeItems);
          const updated = items.filter((id) => id !== "bomb-icon");
          localStorage.setItem(activeItemsKey, JSON.stringify(updated));
        } catch (e) {
          console.error("Erreur synchronisation pack bombe:", e);
        }
      }
    }
  }, [userPurchasedProducts, user]);

  // Enregistrer les skins et items reçus des lootboxes
  useEffect(() => {
    if (!lootPrize?.items?.length || lootPrize.batchId === lastLootPrizeId) {
      return;
    }

    setLastLootPrizeId(lootPrize.batchId);

    const xpRewards = {
      "pack-xp": 100,
      "pack-xp-250": 250,
      "pack-xp-500": 500,
      "pack-xp-1000": 1000,
      "pack-levelup": 500,
      "pack-levelup-2": 1000,
      "pack-levelup-5": 2500,
    };

    lootPrize.items.forEach((item) => {
      if (!item.productId) return;

      const rewardProduct = shopProductsData.products.find(
        (p) => p.id === item.productId,
      );

      if (user && rewardProduct) {
        const rewardName = rewardProduct.titleKey
          ? t(rewardProduct.titleKey)
          : rewardProduct.title || item.name;
        fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/shop/purchase`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: user,
              product_id: rewardProduct.id,
              product_name: rewardName,
              price: "0€",
            }),
          },
        ).catch((error) =>
          console.error("Failed to record lootbox reward:", error),
        );

        setUserPurchasedProducts((prev) =>
          prev.includes(rewardProduct.id) ? prev : [...prev, rewardProduct.id],
        );
      }

      if (item.productId === "skin-neo") {
        purchaseSkin("skin-neo");
        activateSkin("skin-neo");
      }

      if (item.productId === "bomb-icon") {
        purchaseBombItem("bomb-icon");
        activateBombItem("bomb-icon");
      }

      if (user && xpRewards[item.productId]) {
        fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/user/xp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: user,
              xp: xpRewards[item.productId],
            }),
          },
        ).catch((error) => console.error("Failed to award XP:", error));
      }
    });
  }, [
    lootPrize,
    lastLootPrizeId,
    purchaseSkin,
    activateSkin,
    purchaseBombItem,
    activateBombItem,
    setUserPurchasedProducts,
    t,
    user,
  ]);

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
    { id: "all", label: t("shop.categories.seeAll"), icon: "🏪", count: products.length },
    {
      id: "hot",
      label: t("shop.categories.hot"),
      icon: "🔥",
      count: products.filter((p) => p.hot).length,
    },
    {
      id: "skins",
      label: t("shop.categories.skins"),
      icon: "👕",
      count: products.filter((p) => p.category === "skins").length,
    },
    {
      id: "avatars",
      label: t("shop.categories.avatars") || "Avatars",
      icon: "🧑",
      count: products.filter((p) => p.category === "avatars").length,
    },
    {
      id: "lootboxes",
      label: t("shop.categories.mystery"),
      icon: "🎁",
      count: products.filter((p) => p.category === "lootboxes").length,
    },
    {
      id: "boosters",
      label: t("shop.categories.boosts"),
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
        // Répéter l'achat selon la quantité
        for (let q = 0; q < item.quantity; q++) {
          try {
            await fetch(
              `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/shop/purchase`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: user,
                  product_id: item.id,
                  product_name: item.title || t(item.titleKey),
                  price: item.price,
                }),
              },
            );

            // Enregistrer l'achat du skin néon et l'activer (une seule fois, même si quantité > 1)
            if (item.id === "skin-neo" && q === 0) {
              purchaseSkin("skin-neo");
              activateSkin("skin-neo");
            }

            // Enregistrer l'achat du pack bombe et l'activer (une seule fois, même si quantité > 1)
            if (item.id === "bomb-icon" && q === 0) {
              purchaseBombItem("bomb-icon");
              activateBombItem("bomb-icon");
            }

            // Appliquer les boosts d'XP pour les packs
            const xpRewards = {
              "pack-xp": 100,
              "pack-xp-250": 250,
              "pack-xp-500": 500,
              "pack-xp-1000": 1000,
              "pack-levelup": 500,
              "pack-levelup-2": 1000,
              "pack-levelup-5": 2500,
            };

            if (xpRewards[item.id]) {
              try {
                await fetch(
                  `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/user/xp`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      username: user,
                      xp: xpRewards[item.id],
                    }),
                  },
                );
              } catch (error) {
                console.error("Failed to award XP:", error);
              }
            }
          } catch (error) {
            console.error("Failed to record purchase:", error);
          }
        }
      }
    }

    const lootboxes = cart.filter((item) => item.isLootbox);

    if (lootboxes.length > 0) {
      const rewards = [];
      let totalCount = 0;
      let waitTime = 3;

      const pickReward = (loot) => {
        const possibleRewards = shopProductsData.lootboxRewards[loot.id] || [];
        const totalWeight = possibleRewards.reduce(
          (sum, reward) => sum + reward.weight,
          0,
        );
        let random = Math.random() * totalWeight;
        let selectedReward = null;
        for (const reward of possibleRewards) {
          random -= reward.weight;
          if (random <= 0) {
            selectedReward = reward;
            break;
          }
        }

        const rewardId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        if (!selectedReward || selectedReward.productId === null) {
          return {
            rewardId,
            name: t("shop.loot.nothing"),
            img: "/assets/bomb.png",
            rarity: "none",
            productId: null,
          };
        }

        const foundProduct = products.find(
          (prod) => prod.id === selectedReward.productId,
        );
        return foundProduct
          ? {
              rewardId,
              name: foundProduct.title,
              img: foundProduct.img,
              rarity: selectedReward.rarity,
              productId: foundProduct.id,
            }
          : {
              rewardId,
              name: t("shop.loot.nothing"),
              img: "/assets/bomb.png",
              rarity: "none",
              productId: null,
            };
      };

      lootboxes.forEach((loot) => {
        const lootWait = shopProductsData.lootboxWaitTimes[loot.id] || 3;
        waitTime = Math.max(waitTime, lootWait);
        for (let i = 0; i < loot.quantity; i++) {
          rewards.push(pickReward(loot));
          totalCount += 1;
        }
      });

      const displayProduct = {
        ...lootboxes[0],
        title: `${lootboxes[0].title} x${totalCount}`,
      };

      openLootboxBatch(displayProduct, rewards, waitTime);
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
            🛒 {t("shop.cart")}
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
        userPurchasedProducts={userPurchasedProducts}
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
            isAlreadyOwned={p.unique && userPurchasedProducts.includes(p.id)}
            t={t}
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

      <BombPackManager hasActiveBombPack={hasActiveBombPack} />
    </div>
  );
}

export default Shop;

// PropTypes validation pour le composant Shop
Shop.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

import { useNavigate } from "react-router-dom";
import { useLanguage } from "../autres/Language.jsx";
import { useState, useEffect, useRef } from "react";
import { getActiveUser } from "../utils/userSession.js";
import shopProductsData from "./shopProducts.json";

function Shop() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saleCountdown, setSaleCountdown] = useState(6 * 3600); // initial 6 hours in seconds
  const [saleActive] = useState(true);

  // Price multiplier: starts at 1.00, increases by 1% every 30s up to 2.00 (200%)
  const [priceMultiplier, setPriceMultiplier] = useState(1);
  const priceIncreaseRef = useRef(null);

  // Additional costs checkboxes (dark pattern)
  const [deliveryChecked, setDeliveryChecked] = useState(true);
  const [expressChecked, setExpressChecked] = useState(true);
  const [giftWrapChecked, setGiftWrapChecked] = useState(true);
  const [supportChecked, setSupportChecked] = useState(true);
  const [warrantyChecked, setWarrantyChecked] = useState(true);
  const [insuranceChecked, setInsuranceChecked] = useState(true);

  // Ad popup: show only once (persisted) and auto-hide after 15s
  const [showAdPopup, setShowAdPopup] = useState(false);
  const adTimerRef = useRef(null);
  const closeAd = () => {
    setShowAdPopup(false);
    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }
  };

  // Vérification de l'authentification
  useEffect(() => {
    const user = getActiveUser();
    if (user) {
      setIsAuthenticated(true);
    } else {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const key = "ad_popup_shown_v1";
    const already = localStorage.getItem(key);
    if (!already) {
      // afficher la popup une seule fois et marquer comme vue
      setShowAdPopup(true);
      try {
        localStorage.setItem(key, "1");
      } catch {
        // ignore storage errors
      }
      // Fermer automatiquement après 15 secondes
      adTimerRef.current = setTimeout(() => {
        setShowAdPopup(false);
        adTimerRef.current = null;
      }, 15000);
    }
    return () => {
      if (adTimerRef.current) {
        clearTimeout(adTimerRef.current);
        adTimerRef.current = null;
      }
    };
  }, []);

  const fmtTime = (s) => {
    const hours = Math.floor(s / 3600).toString().padStart(2, "0");
    const mins = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${hours}:${mins}:${secs}`;
  };

  const randHoursBetween = (minH = 6, maxH = 24) => {
    const min = Math.ceil(minH);
    const max = Math.floor(maxH);
    const hours = Math.floor(Math.random() * (max - min + 1)) + min;
    return hours * 3600;
  };

  function handleAddToCart(p) {
    // Ajouter au panier au lieu d'ouvrir la modal directement
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === p.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...p, quantity: 1 }];
    });
  }

  function handleRemoveFromCart(productId) {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  }

  function handleUpdateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  }

  function handleCheckout() {
    // Fermer le panier et confirmer l'achat de tous les articles
    setShowCart(false);
    
    // Ouvrir les lootboxes dans le panier
    const lootboxes = cart.filter(item => item.isLootbox);
    if (lootboxes.length > 0) {
      openLootboxesSequentially(lootboxes);
    } else {
      // Si pas de lootboxes, juste afficher les confettis
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3200);
    }
    
    // Vider le panier après l'achat
    setCart([]);
  }

  function openLootboxesSequentially(lootboxes) {
    if (lootboxes.length === 0) return;
    
    let index = 0;
    const openNext = () => {
      if (index < lootboxes.length) {
        const lootbox = lootboxes[index];
        for (let i = 0; i < lootbox.quantity; i++) {
          setTimeout(() => {
            handleOpenLootbox(lootbox);
          }, i * 500); // Délai entre chaque ouverture
        }
        index++;
      }
    };
    
    openNext();
  }

  function handleConfirmPurchase() {
    // Check if it's a lootbox, if yes open the lootbox reveal
    if (modalProduct?.isLootbox) {
      setModalOpen(false);
      handleOpenLootbox(modalProduct);
    } else {
      // Simulate purchase and feedback
      setModalOpen(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3200);
    }
  }

  function handleCancelPurchase() {
    // Dark pattern: Show urgency message when user tries to cancel
    if (globalThis.confirm(t("shop.modal.exitWarning"))) {
      setModalOpen(false);
    }
  }

  // Lootbox flow state & handlers
  const [lootOpen, setLootOpen] = useState(false);
  const [lootProduct, setLootProduct] = useState(null);
  const [lootPrize, setLootPrize] = useState(null);
  const [notification, setNotification] = useState(null);
  const [lootWaiting, setLootWaiting] = useState(false);
  const [lootCountdown, setLootCountdown] = useState(0);
  const audioRef = useRef(null);
  
  // Dark pattern: fake viewer count
  const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 20) + 15);
  
  // Dark pattern: Price increase warning
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [priceWarningTimer, setPriceWarningTimer] = useState(30);

  // Fake purchase notifications (social proof dark pattern)
  useEffect(() => {
    const names = ["Marie", "Thomas", "Sophie", "Lucas", "Emma", "Hugo", "Léa", "Nathan"];
    const messages = [
      () => `${names[Math.floor(Math.random() * names.length)]} vient d'acheter un article !`,
      () => `⚡ Plus que ${Math.floor(Math.random() * 5) + 1} articles en stock !`,
      () => `${names[Math.floor(Math.random() * names.length)]} a ouvert une lootbox rare !`,
      () => `🔥 ${Math.floor(Math.random() * 20) + 5} personnes regardent cette page`,
      () => `🎉 ${names[Math.floor(Math.random() * names.length)]} a obtenu un super prix !`,
      () => `⏰ Offre spéciale terminant dans ${Math.floor(Math.random() * 10) + 1} minutes !`,
      () => `${names[Math.floor(Math.random() * names.length)]} a ajouté un article au panier !`,
      () => `🚀 ${Math.floor(Math.random() * 10) + 1} personnes viennent d'acheter cet article !`,
      () => `💥 ${names[Math.floor(Math.random() * names.length)]} a obtenu un prix épique !`,
      () => `⚠️ Attention, il ne reste que ${Math.floor(Math.random() * 3) + 1} articles en stock !`,
      () => `🎁 ${names[Math.floor(Math.random() * names.length)]} a acheté une lootbox !`,
      () => `🔥 ${Math.floor(Math.random() * 30) + 10} personnes regardent cet article !`,
      () => `⏳ Offre spéciale terminant dans ${Math.floor(Math.random() * 5) + 1} minutes !`,
      () => `${names[Math.floor(Math.random() * names.length)]} a obtenu un prix légendaire !`,
      () => `🚨 ${Math.floor(Math.random() * 5) + 1} personnes viennent d'acheter cet article !`,
      () => `⚡ Plus que ${Math.floor(Math.random() * 3) + 1} articles en stock !`,
    ];
    
    const showNotification = () => {
      const msg = messages[Math.floor(Math.random() * messages.length)]();
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
    };

    // Show first notification after 2 seconds
    const initialTimer = setTimeout(showNotification, 2000);
    
    // Then show every 8-15 seconds
    const interval = setInterval(() => {
      showNotification();
    }, Math.random() * 12000 + 15000); // Changé de 7000 + 8000 à 12000 + 15000 (15-27 secondes)

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);
  
  // Dark pattern: Fake viewer count fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const newCount = prev + change;
        return Math.max(10, Math.min(50, newCount)); // Keep between 10 and 50
      });
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Gradual price increase: +1% every 30s until 200%
  useEffect(() => {
    // safety: avoid multiple intervals
    if (priceIncreaseRef.current) return undefined;
    priceIncreaseRef.current = setInterval(() => {
      setPriceMultiplier((prev) => {
        if (prev >= 2) {
          if (priceIncreaseRef.current) {
            clearInterval(priceIncreaseRef.current);
            priceIncreaseRef.current = null;
          }
          return prev;
        }
        const next = +(prev * 1.01).toFixed(6);
        if (next >= 2) {
          if (priceIncreaseRef.current) {
            clearInterval(priceIncreaseRef.current);
            priceIncreaseRef.current = null;
          }
          return 2;
        }
        return next;
      });
    }, 30000);

    return () => {
      if (priceIncreaseRef.current) {
        clearInterval(priceIncreaseRef.current);
        priceIncreaseRef.current = null;
      }
    };
  }, []);
  
  // Dark pattern: Price increase warning banner
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowPriceWarning(true);
    }, 30000); // Show after 30 seconds
    
    return () => clearTimeout(showTimer);
  }, []);
  
  // Dark pattern: Price warning countdown
  useEffect(() => {
    if (!showPriceWarning) return undefined;
    
    const interval = setInterval(() => {
      setPriceWarningTimer(prev => {
        if (prev <= 1) {
          setShowPriceWarning(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showPriceWarning]);

  function handleOpenLootbox(p) {
    // Utiliser les temps d'attente depuis le JSON
    const waitTime = shopProductsData.lootboxWaitTimes[p.id] || 3; // Par défaut 3 secondes
    
    setLootProduct(p);
    setLootOpen(true);
    setLootPrize(null);
    setLootWaiting(true);
    setLootCountdown(waitTime);
    
    // Obtenir les récompenses possibles pour cette lootbox
    const possibleRewards = shopProductsData.lootboxRewards[p.id] || [];
    
    // Calculer le poids total
    const totalWeight = possibleRewards.reduce((sum, reward) => sum + reward.weight, 0);
    
    // Sélectionner une récompense aléatoire basée sur les poids
    let random = Math.random() * totalWeight;
    let selectedReward = null;
    
    for (const reward of possibleRewards) {
      random -= reward.weight;
      if (random <= 0) {
        selectedReward = reward;
        break;
      }
    }
    
    // Si productId est null, c'est "rien"
    let choice;
    if (!selectedReward || selectedReward.productId === null) {
      choice = { 
        name: t("shop.loot.nothing"), 
        img: "/assets/bomb.png", 
        rarity: "none",
        productId: null
      };
    } else {
      // Trouver le produit correspondant dans la liste des produits
      const product = products.find(prod => prod.id === selectedReward.productId);
      if (product) {
        choice = {
          name: product.title,
          img: product.img,
          rarity: selectedReward.rarity,
          productId: product.id
        };
      } else {
        // Fallback si le produit n'existe pas
        choice = { 
          name: t("shop.loot.nothing"), 
          img: "/assets/bomb.png", 
          rarity: "none",
          productId: null
        };
      }
    }
    
    // Jouer la musique selon la rareté
    const musicMap = {
      "none": null, // Aucune musique
      "common": "/assets/sound/victory_commun.mp3",
      "rare": "/assets/sound/victory_rare.mp3",
      "epic": "/assets/sound/victory_long.mp3",
    };
    
    const musicPath = musicMap[choice.rarity];
    
    if (musicPath && audioRef.current) {
      audioRef.current.src = musicPath;
      audioRef.current.play().catch(err => console.error("Audio play error:", err));
    }
    
    // Compte à rebours
    let timeLeft = waitTime;
    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      setLootCountdown(timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        setLootWaiting(false);
        setLootPrize(choice);
        
        // Confettis seulement si ce n'est pas "rien"
        if (choice.rarity !== "none") {
          setTimeout(() => {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2600);
          }, 100);
        }
      }
    }, 1000);
  }

  function closeLoot() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setLootOpen(false);
    setLootPrize(null);
    setLootProduct(null);
    setLootWaiting(false);
    setLootCountdown(0);
  }

  useEffect(() => {
    if (!modalOpen) return undefined;
    setCountdown(60);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          handleConfirmPurchase();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [modalOpen]);

  // Sale countdown (banner) — decrements every second
  useEffect(() => {
    // count down; when reaching 0, pick a new sale duration between 6 and 24 hours and continue
    if (!saleActive) return undefined;
    const sid = setInterval(() => {
      setSaleCountdown((v) => {
        if (v <= 1) {
          // choose a new duration between 6 and 24 hours
          const next = randHoursBetween(6, 24);
          return next;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(sid);
  }, [saleActive, saleCountdown]);

  // Helper pour parser/formatter les prix et appliquer le multiplicateur
  const parsePrice = (s) => {
    if (s == null) return 0;
    const cleaned = String(s).replace('€', '').replace(/\s/g, '').replace(',', '.');
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  };
  const formatPrice = (n) => {
    return n.toFixed(2).replace('.', ',') + '€';
  };

  // Charger les produits depuis le JSON avec traduction et prix ajustés
  const products = shopProductsData.products.map(p => {
    const basePrice = parsePrice(p.price);
    const scaledPrice = basePrice * priceMultiplier;
    const price = formatPrice(scaledPrice);

    const oldPrice = p.oldPrice ? formatPrice(parsePrice(p.oldPrice) * priceMultiplier) : undefined;

    return {
      ...p,
      title: t(p.titleKey),
      desc: t(p.descKey),
      price,
      oldPrice,
    };
  });

  const cartTotal = cart.reduce((sum, item) => {
    const price = Number.parseFloat(item.price.replace('€', '').replace(',', '.'));
    return sum + (price * item.quantity);
  }, 0);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!isAuthenticated) {
    return null; // Ou un spinner de chargement
  }

  return (
    <div className="shop-page">
      <section className="hero">
        <div className="hero__copy">
          {saleActive ? (
            <div className="sale-banner">{t("shop.salePrefix")} <strong className="sale-timer">{fmtTime(saleCountdown)}</strong></div>
          ) : (
            <div className="sale-banner ended">{t("shop.saleEnded")}</div>
          )}
          <h1>{t("shop.title")}</h1>
            <p className="hero__eyebrow">{t("shop.subtitle")}</p>
          <p className="hero__lede">{t("shop.intro")}</p>
          
          {/* Bouton Panier */}
          <button className="btn primary cart-button" onClick={() => setShowCart(true)}>
            🛒 Panier {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </button>
        </div>
      </section>

      {showAdPopup && (
        <div className="ad-popup-overlay" onClick={closeAd}>
          <div className="ad-popup-card" onClick={(e) => e.stopPropagation()}>
            <button className="ad-close" onClick={closeAd}>✕</button>
            <div className="ad-content">
              <div className="ad-badge">OFFRE EXCLUSIVE</div>
              <h2 className="ad-title">-70% sur tous les articles !</h2>
              <p className="ad-desc">Profitez de nos lootboxes mystères et packs exclusifs. Offre limitée !</p>
              <div className="ad-timer">Plus que quelques heures !</div>
              <div className="ad-actions">
                <button className="btn primary ad-cta" onClick={() => { closeAd(); }}>{t("shop.open")}</button>
                <button className="btn ghost ad-later" onClick={closeAd}>Plus tard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dark pattern: Price increase warning */}
      {showPriceWarning && (
        <div className="price-warning-banner">
          ⚠️ <strong>ALERTE PRIX !</strong> Les prix vont augmenter dans <strong>{priceWarningTimer}s</strong> ! Achetez maintenant !
        </div>
      )}

      <section className="shop-grid">
        {products.map((p) => (
          <article className={`product-card ${p.stock <= 2 ? 'low-stock' : ''} ${p.hot ? 'hot-deal' : ''}`} key={p.id}>
            <div className="product-deco" aria-hidden>
              <span className="spark" />
              <span className="spark" />
              <span className="spark" />
            </div>
            {p.hot && <div className="hot-badge">🔥 HOT</div>}
            {p.badge && <div className={`product-badge ${p.stock <= 2 ? 'urgent' : ''}`}>{p.badge}</div>}
            <img src={p.img} alt="" className="product-img" />
            <div className="product-body">
              <h4>{p.title}</h4>
              <p>{p.desc}</p>
              <div className="product-actions">
                <div className="price-block">
                  {p.oldPrice && <span className="product-old-price">{p.oldPrice}</span>}
                  <span className="product-price">{p.price}</span>
                </div>
                <button
                  onClick={() => handleAddToCart(p)}
                  disabled={!saleActive || p.stock === 0}
                  className={`btn primary ${p.stock <= 2 ? 'pulse' : ''} ${(!saleActive || p.stock === 0) ? 'disabled' : ''}`}
                >
                  {(!saleActive || p.stock === 0) ? t("shop.soldOut") : "➕ Ajouter au panier"}
                </button>
              </div>
              {p.stock !== undefined && (
                <div className="stock-line">
                  {p.stock > 0 ? (
                    <span className="stock-text">{`Seulement ${p.stock} restants`}</span>
                  ) : (
                    <span className="stock-text sold-out">Épuisé</span>
                  )}
                </div>
              )}
              
              {/* Dark pattern: Fake reviews */}
              <div className="product-reviews">
                <div className="stars">★★★★★</div>
                <span className="review-count">{Math.floor(Math.random() * 500) + 150} avis</span>
              </div>
              
              {/* Dark pattern: Fake viewer count */}
              <div className="viewer-count">
                <strong>{viewerCount}</strong> personnes regardent cet article
              </div>
              
              {/* Dark pattern: Visual stock bar */}
              {p.stock !== undefined && p.stock > 0 && (
                <div className="stock-bar">
                  <div className="stock-bar-fill" style={{width: `${(p.stock / 50) * 100}%`}}></div>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
      {/* Modal: dark-pattern purchase confirmation */}
      {modalOpen && modalProduct && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{t("shop.modal.title")}</h3>
            <p className="modal-notice">{t("shop.modal.notice")}</p>
            <div className="modal-product">
              <img src={modalProduct.img} alt="" />
              <div>
                <strong>{modalProduct.title}</strong>
                <div className="modal-price">{modalProduct.price}</div>
              </div>
            </div>
            
            {/* Multiple additional cost options (dark pattern) */}
            <div className="modal-extras">
              <p className="extras-title">{t("shop.modal.extrasTitle")}</p>
              
              <label className="dark-checkbox">
                <input type="checkbox" checked={deliveryChecked} onChange={() => setDeliveryChecked(!deliveryChecked)} />
                <span>{t("shop.modal.delivery")} <strong className="extra-price">+1.99€</strong></span>
              </label>
              
              <label className="dark-checkbox">
                <input type="checkbox" checked={expressChecked} onChange={() => setExpressChecked(!expressChecked)} />
                <span>{t("shop.modal.express")} <strong className="extra-price">+4.99€</strong></span>
              </label>
              
              <label className="dark-checkbox">
                <input type="checkbox" checked={giftWrapChecked} onChange={() => setGiftWrapChecked(!giftWrapChecked)} />
                <span>{t("shop.modal.giftWrap")} <strong className="extra-price">+2.49€</strong></span>
              </label>
              
              <label className="dark-checkbox">
                <input type="checkbox" checked={supportChecked} onChange={() => setSupportChecked(!supportChecked)} />
                <span>{t("shop.modal.support")} <strong className="extra-price">+3.99€</strong></span>
              </label>
              
              <label className="dark-checkbox">
                <input type="checkbox" checked={warrantyChecked} onChange={() => setWarrantyChecked(!warrantyChecked)} />
                <span>{t("shop.modal.warranty")} <strong className="extra-price">+5.99€</strong></span>
              </label>
              
              <label className="dark-checkbox">
                <input type="checkbox" checked={insuranceChecked} onChange={() => setInsuranceChecked(!insuranceChecked)} />
                <span>{t("shop.modal.insurance")} <strong className="extra-price">+2.99€</strong></span>
              </label>
            </div>
            
            {/* Total calculation (dark pattern: shows inflated total) */}
            <div className="modal-total">
              <div className="total-line">
                <span>{t("shop.modal.subtotal")}</span>
                <span className="total-value">{(() => {
                  const basePrice = Number.parseFloat(modalProduct.price.replace('€', '').replace(',', '.'));
                  let total = basePrice;
                  if (deliveryChecked) total += 1.99;
                  if (expressChecked) total += 4.99;
                  if (giftWrapChecked) total += 2.49;
                  if (supportChecked) total += 3.99;
                  if (warrantyChecked) total += 5.99;
                  if (insuranceChecked) total += 2.99;
                  return total.toFixed(2) + '€';
                })()}</span>
              </div>
              <p className="savings-text">{t("shop.modal.savingsText")}</p>
            </div>
            
            <div className="modal-actions">
              <button className="btn accent" onClick={handleConfirmPurchase}>
                {t("shop.modal.confirm")} {countdown > 0 && (<span className="timer"> ({countdown})</span>)}
              </button>
              <button className="btn ghost" onClick={handleCancelPurchase}>{t("shop.modal.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti overlay */}
      {showConfetti && (
        <div className="confetti-root" aria-hidden>
          {Array.from({ length: 36 }).map((_, i) => {
            const left = Math.round(Math.random() * 100);
            const delay = (Math.random() * 1.2).toFixed(2);
            const bg = ["#ff6b6b", "#ffd166", "#8bd3dd", "#7c3aed", "#60d394"][i % 5];
            return <span key={i} className="confetti-piece" style={{ left: `${left}%`, background: bg, animationDelay: `${delay}s` }} />;
          })}
        </div>
      )}
      {/* Lootbox modal */}
      {lootOpen && lootProduct && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{lootProduct.title}</h3>
            {lootWaiting ? (
              <>
                <p className="modal-notice">⏳ Ouverture en cours...</p>
                <div className="loot-countdown">
                  <div className="countdown-circle">
                    <span className="countdown-number">{lootCountdown}</span>
                  </div>
                  <p className="countdown-text">Secondes restantes</p>
                </div>
              </>
            ) : (
              <p className="modal-notice">{t("shop.loot.revealing")}</p>
            )}
            <div className="modal-product">
              <img src={lootProduct.img} alt="" />
              <div>
                <strong>{lootProduct.title}</strong>
                <div className="modal-price">{lootProduct.price}</div>
              </div>
            </div>
            <div className="loot-reveal">
              {lootPrize ? (
                <div className="prize">
                  <img src={lootPrize.img} alt="" />
                  <div className="prize-name">{lootPrize.name}</div>
                </div>
              ) : (
                <div className="prize-placeholder">{t("shop.loot.loading")}</div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="btn primary" 
                onClick={closeLoot}
                disabled={lootWaiting}
              >
                {lootWaiting ? "Patientez..." : t("shop.loot.close")}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Audio element for lootbox music */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay" onClick={() => setShowCart(false)}>
          <div className="modal-card cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>🛒 Mon Panier</h3>
              <button className="btn ghost" onClick={() => setShowCart(false)}>✕</button>
            </div>
            
            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Votre panier est vide</p>
                <button className="btn primary" onClick={() => setShowCart(false)}>Continuer mes achats</button>
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
                        <button 
                          className="btn ghost quantity-btn" 
                          onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="btn ghost quantity-btn" 
                          onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button 
                          className="btn ghost remove-btn" 
                          onClick={() => handleRemoveFromCart(item.id)}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total:</span>
                    <strong>{cartTotal.toFixed(2)}€</strong>
                  </div>
                  <button className="btn accent checkout-btn" onClick={handleCheckout}>
                    Acheter ({cartItemCount} article{cartItemCount > 1 ? 's' : ''})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Social proof notification */}
      {notification && (
        <div className="shop-notification">
          <span className="notif-icon">👤</span>
          <span className="notif-text">{notification}</span>
        </div>
      )}
    </div>
  );
}

export default Shop;

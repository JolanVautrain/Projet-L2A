import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import shopProductsData from "../shop/shopProducts.json";
import { useSkins } from "../shop/hooks/useSkins.js";
import { useBombPack } from "../shop/hooks/useBombPack.js";
import "./UserInventory.css";

export function UserInventory({ user, t }) {
  const [purchases, setPurchases] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");
  const { activeSkin, activateSkin, deactivateSkin } = useSkins(user);
  const { activeItems, activateItem, deactivateItem } = useBombPack(user);
  const [activeAvatar, setActiveAvatar] = useState("");
  const safeActiveItems = Array.isArray(activeItems) ? activeItems : [];

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiBase}/api/shop/purchases/${user}`);
        if (!res.ok) throw new Error("Erreur chargement achats");

        const data = await res.json();

        // Enrichir les données d'achat avec les informations du produit
        const enrichedPurchases = data.purchases.map((purchase) => {
          const productData = shopProductsData.products.find(
            (p) => p.id === purchase.product_id,
          );
          return {
            ...purchase,
            img: productData?.img || "/assets/shop/default.png",
            category: productData?.category || "items",
            title: productData?.titleKey
              ? t(productData.titleKey)
              : purchase.product_name,
          };
        });

        setPurchases(enrichedPurchases);

        // Créer l'inventaire : articles uniques (cosmétiques) + articles boosters
        const uniqueProducts = {};
        enrichedPurchases.forEach((purchase) => {
          const product = shopProductsData.products.find(
            (p) => p.id === purchase.product_id,
          );
          const isCosmetic =
            product?.category === "skins" ||
            product?.category === "items" ||
            product?.category === "avatars";
          const isBooster = product?.category === "boosters";

          // Pour les cosmétiques (uniques), garder seulement la première mise à jour
          if (isCosmetic && !uniqueProducts[purchase.product_id]) {
            uniqueProducts[purchase.product_id] = purchase;
          }
          // Pour les boosters, garder le plus récent (on affiche l'effet immédiat)
          else if (isBooster) {
            uniqueProducts[purchase.product_id] = purchase;
          }
        });
        setInventory(Object.values(uniqueProducts));
      } catch (err) {
        console.error("Erreur:", err);
        setPurchases([]);
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [user, t]);

  useEffect(() => {
    if (!user) return;
    const savedAvatar = localStorage.getItem(`avatar_${user}`) || "";
    setActiveAvatar(savedAvatar);
  }, [user]);

  const getAvatarFilename = (product) => {
    if (!product?.img) return "";
    const prefix = "/assets/avatar/";
    if (!product.img.startsWith(prefix)) return "";
    return product.img.slice(prefix.length);
  };

  const toggleCosmetic = (itemId, product) => {
    if (itemId === "skin-neo") {
      if (activeSkin === itemId) {
        deactivateSkin();
      } else {
        activateSkin(itemId);
      }
    } else if (itemId === "bomb-icon") {
      if (safeActiveItems.includes(itemId)) {
        deactivateItem(itemId);
      } else {
        activateItem(itemId);
      }
    } else if (product?.category === "avatars") {
      const filename = getAvatarFilename(product);
      if (!filename || !user) return;
      localStorage.setItem(`avatar_${user}`, filename);
      setActiveAvatar(filename);
      globalThis.dispatchEvent(
        new CustomEvent("avatarChanged", {
          detail: { avatar: filename, username: user },
        }),
      );
    }
  };

  const getCosmeticStatus = (itemId, product) => {
    if (itemId === "skin-neo") {
      return activeSkin === itemId;
    } else if (itemId === "bomb-icon") {
      return safeActiveItems.includes(itemId);
    } else if (product?.category === "avatars") {
      const filename = getAvatarFilename(product);
      return filename && filename === activeAvatar;
    }
    return false;
  };

  if (loading) {
    return <div className="user-inventory">{t("common.loading")}</div>;
  }

  if (!user) {
    return <div className="user-inventory">{t("account.loginRequired")}</div>;
  }

  return (
    <div className="user-inventory">
      <div className="inventory-tabs">
        <button
          className={`inventory-tab ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          {t("account.inventory")}
        </button>
        <button
          className={`inventory-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          {t("account.purchaseHistory")}
        </button>
      </div>

      {activeTab === "inventory" && (
        <div className="inventory-content">
          <h3>{t("account.inventory")}</h3>
          {inventory.length > 0 ? (
            <div className="inventory-grid">
              {inventory.map((item) => {
                const product = shopProductsData.products.find(
                  (p) => p.id === item.product_id,
                );
                const isCosmetic =
                  product?.category === "skins" ||
                  product?.category === "items" ||
                  product?.category === "avatars";
                const isActivatable = product?.activatable === true;
                const isActive = getCosmeticStatus(item.product_id, product);

                return (
                  <div key={item.product_id} className="inventory-item">
                    <img
                      src={item.img}
                      alt={item.title || item.product_name}
                      className="inventory-item-img"
                    />
                    <div className="inventory-item-info">
                      <h4>{item.title || item.product_name}</h4>
                      <p className="inventory-item-price">{item.price}</p>
                      <p className="inventory-item-date">
                        {new Date(item.purchased_at).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                      {isCosmetic && isActivatable && (
                        <button
                          className={`cosmetic-toggle ${isActive ? "active" : "inactive"}`}
                          onClick={() =>
                            toggleCosmetic(item.product_id, product)
                          }
                        >
                          {isActive ? "✓ Actif" : "○ Inactif"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-purchases">{t("account.noPurchases")}</p>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="inventory-content">
          <h3>{t("account.purchaseHistory")}</h3>
          {purchases.length > 0 ? (
            <div className="purchase-history-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>🖼️</th>
                    <th>Produit</th>
                    <th>Prix</th>
                    <th>{t("account.purchaseDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.id}</td>
                      <td>
                        <img
                          src={purchase.img}
                          alt={purchase.title || purchase.product_name}
                          className="purchase-icon"
                          title={purchase.title || purchase.product_name}
                        />
                      </td>
                      <td>{purchase.title || purchase.product_name}</td>
                      <td>{purchase.price}</td>
                      <td>
                        {new Date(purchase.purchased_at).toLocaleString(
                          "fr-FR",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-purchases">{t("account.noPurchases")}</p>
          )}
        </div>
      )}
    </div>
  );
}

UserInventory.propTypes = {
  user: PropTypes.string,
  t: PropTypes.func.isRequired,
};

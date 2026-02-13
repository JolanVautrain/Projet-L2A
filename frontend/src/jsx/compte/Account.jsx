import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Statistics from "./Statistics.jsx";
import { LanguageSelector, useLanguage } from "../autres/Language.jsx";
import { getApiBaseUrl } from "../utils/apiClient.js";
import { getActiveSessionToken } from "../utils/userSession.js";
import LoginModal from "../accueil/modals/LoginModal.jsx";
import RegisterModal from "../accueil/modals/RegisterModal.jsx";

/**
 * Composant Account
 * Affiche la page de compte utilisateur ou un bouton de connexion selon l'état.
 *
 * Props :
 * - user (string|null) : nom d'utilisateur connecté ou null si déconnecté
 * - setUser (function) : fonction pour mettre à jour l'utilisateur
 */
function Account({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [resetSessionsLoading, setResetSessionsLoading] = useState(false);
  const [awardXpLoading, setAwardXpLoading] = useState(false);
  const [removeXpLoading, setRemoveXpLoading] = useState(false);
  const [deleteHistoryLoading, setDeleteHistoryLoading] = useState(false);
  const [setAdminLoading, setSetAdminLoading] = useState(false);
  const [removeAdminLoading, setRemoveAdminLoading] = useState(false);
  const [banUserLoading, setBanUserLoading] = useState(false);
  const [unbanUserLoading, setUnbanUserLoading] = useState(false);
  const [banDuration, setBanDuration] = useState("");
  const [banReason, setBanReason] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [recoveryCodesLoading, setRecoveryCodesLoading] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState(null);
  const [showNewCode, setShowNewCode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [ownsAvatarPack, setOwnsAvatarPack] = useState(false);
  const [userPurchases, setUserPurchases] = useState([]);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const apiBase = getApiBaseUrl();

  // Liste des avatars disponibles (sans admin.jpg pour utilisateurs normaux)
  const availableAvatars = [
    "samourai.png",
    "businessman1.png",
    "fireman.png",
    "fireman_temu.png",
    "fireman_woman.png",
    "gangster.png",
    "gangster_temu.png",
    "policeman.png",
    "policewomen.png",
    "politician_men.png",
    "politician_woman.png",
    "rescue.png",
    "worker.png",
  ];

  // Vérifier si l'utilisateur possède le pack d'avatars depuis la BDD
  useEffect(() => {
    if (user && user !== "admin") {
      fetch(`${apiBase}/shop/has-product/${user}/avatar-logo`)
        .then(res => res.json())
        .then(data => {
          setOwnsAvatarPack(data.has_product || false);
        })
        .catch(err => {
          console.error("Failed to check avatar pack ownership:", err);
          setOwnsAvatarPack(false);
        });
    }
  }, [user, apiBase]);

  // Charger l'historique d'achats de l'utilisateur
  useEffect(() => {
    if (user) {
      fetch(`${apiBase}/shop/purchases/${user}`)
        .then(res => res.json())
        .then(data => {
          setUserPurchases(data.purchases || []);
        })
        .catch(err => {
          console.error("Failed to load purchase history:", err);
          setUserPurchases([]);
        });
    }
  }, [user, apiBase]);

  // Charger l'avatar depuis localStorage
  useEffect(() => {
    if (user) {
      // Admin a toujours admin.jpg et ne peut pas le changer
      if (user === "admin") {
        setSelectedAvatar("admin.jpg");
        localStorage.setItem(`avatar_${user}`, "admin.jpg");
        return;
      }
      
      const savedAvatar = localStorage.getItem(`avatar_${user}`);
      // Empêcher les utilisateurs normaux d'utiliser admin.jpg
      if (savedAvatar && savedAvatar !== "admin.jpg" && availableAvatars.includes(savedAvatar)) {
        // si l'avatar sauvegardé est autorisé (samourai toujours autorisé) ou l'utilisateur possède le pack
        if (savedAvatar === "samourai.png" || ownsAvatarPack) {
          setSelectedAvatar(savedAvatar);
        } else {
          // le pack n'est pas possédé : forcer samourai
          setSelectedAvatar("samourai.png");
          localStorage.setItem(`avatar_${user}`, "samourai.png");
        }
      } else {
        // Avatar par défaut : samourai
        setSelectedAvatar("samourai.png");
        localStorage.setItem(`avatar_${user}`, "samourai.png");
      }
    }
  }, [user, ownsAvatarPack]);

  // Fonction pour sélectionner un avatar
  const handleAvatarSelect = (avatar) => {
    // Admin ne peut pas changer son avatar
    if (user === "admin") {
      return;
    }
    
    // Empêcher de sélectionner admin.jpg
    if (avatar === "admin.jpg") {
      return;
    }
    if (avatar !== "samourai.png" && !ownsAvatarPack) {
      // Ne pas permettre la sélection ; rediriger vers la boutique pour achat
      navigate('/shop');
      return;
    }

    setSelectedAvatar(avatar);
    if (user) {
      localStorage.setItem(`avatar_${user}`, avatar);
      // Déclencher un événement personnalisé pour actualiser l'avatar dans la navbar
      globalThis.dispatchEvent(new CustomEvent("avatarChanged", { detail: { avatar, username: user } }));
    }
  };

  // Fonction pour charger et enrichir les utilisateurs
  const loadAdminUsers = async (currentUser) => {
    try {
      const res = await fetch(`${apiBase}/admin/users`, {
        headers: { "X-Admin-User": currentUser },
      });
        // Silently ignore 401 (user not admin)
        if (res.status === 401) {
          return;
        }
      if (res.ok) {
        const data = await res.json();
        // Enrichir chaque utilisateur avec XP et stats (parallèle)
        const enriched = await Promise.all(
          data.map(async (u) => {
            try {
              const [xpRes, statsRes] = await Promise.all([
                fetch(`${apiBase}/user/xp/${u.username}`),
                fetch(`${apiBase}/user/stats/${u.username}`),
              ]);
              const xpJson =
                xpRes && xpRes.ok
                  ? await xpRes.json()
                  : { xp: 0, level: 1 };
              const statsJson =
                statsRes && statsRes.ok
                  ? await statsRes.json()
                  : {
                      totalGames: 0,
                      totalScore: 0,
                      bestScore: 0,
                      averageScore: 0,
                    };
              return {
                ...u,
                xp: xpJson.xp || 0,
                level: xpJson.level || 1,
                totalGames: statsJson.totalGames || 0,
                totalScore: statsJson.totalScore || 0,
                bestScore: statsJson.bestScore || 0,
                averageScore: statsJson.averageScore || 0,
              };
            } catch {
              return {
                ...u,
                xp: 0,
                level: 1,
                totalGames: 0,
                totalScore: 0,
                bestScore: 0,
                averageScore: 0,
              };
            }
          })
        );
        setAllUsers(enriched);
        if (enriched.length > 0 && !selectedUser) setSelectedUser(enriched[0].username);
        return enriched;
      }
    } catch (err) {
      console.warn("Failed to load users", err);
    }
  };

  // Charger la liste des utilisateurs si admin
  useEffect(() => {
    if (!user) return;

    const checkAdmin = async () => {
      try {
        if (user === "admin") {
          setIsAdmin(true);
          loadAdminUsers(user);
          return;
        }
        const res = await fetch(`${apiBase}/user/is-admin`, {
          headers: { "X-Admin-User": user },
        });
        if (res.ok) {
          const data = await res.json();
          const adminFlag = Boolean(data.is_admin);
          setIsAdmin(adminFlag);
          if (adminFlag) {
            loadAdminUsers(user);
          } else {
            setAllUsers([]);
          }
        }
      } catch (err) {
        console.warn("Failed to check admin status", err);
      }
    };

    checkAdmin();
  }, [user, apiBase]);


  const handleGenerateRecoveryCode = async () => {
    setRecoveryCodesLoading(true);
    try {
      const res = await fetch(`${apiBase}/user/generate-recovery-code`, {
        method: "POST",
        headers: { "X-Admin-User": user },
      });
      if (res.ok) {
        const data = await res.json();
        setNewRecoveryCode(data.recovery_code || data.code);
        setShowNewCode(true);
      } else {
        alert("Erreur lors de la génération du code");
      }
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setRecoveryCodesLoading(false);
    }
  };
  
  const handleDownloadRecoveryCode = () => {
    if (!newRecoveryCode) return;
    const payload = { username: user, recovery_code: newRecoveryCode };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery_${user}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  // Gère la déconnexion de l'utilisateur
  const handleLogout = () => {
    const sessionToken = getActiveSessionToken();
    if (user && sessionToken) {
      fetch(`${apiBase}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-User": user,
          "X-Session-Token": sessionToken,
        },
      }).catch(() => {});
    }
    setUser(null);
    navigate("/");
  };
  if (user) {
    // Utilisateur connecté : afficher les informations de compte

    const handleSubmit = (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      let xp = parseInt(data.get("number"), 10);

      if (data.get("sub_xp")) {
        xp = -xp;
      }

      if (
        selectedUser &&
        confirm(
          t("account.confirmAwardXp")
            .replace("{username}", selectedUser)
            .replace("{xp}", xp)
        )
      ) {
        setAwardXpLoading(true);

        fetch(`${apiBase}/user/xp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-User": user,
          },
          body: JSON.stringify({
            username: selectedUser,
            xp: xp,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("Erreur serveur");
            return res.json();
          })
          .then(() => {
            alert(
              t("account.awardXpSuccess")
                .replace("{username}", selectedUser)
                .replace("{xp}", xp)
            );
            // Rafraîchir la liste des utilisateurs après succès
            loadAdminUsers(user);
          })
          .catch((e) => alert(t("common.failedPrefix") + e.message))
          .finally(() => setAwardXpLoading(false));
      }
    };

    return (
      <>
        <h1>{t("account.title")}</h1>
        <div className="account-actions">
          <p>
            {t("account.hello")} {user}, {t("account.yourAccountPage")}.
          </p>
          
          {/* Sélecteur d'avatar */}
          {user !== "admin" ? (
            <div className="avatar-selector">
              <h3>{t("account.chooseAvatar") || "Choisir votre avatar"}</h3>
              <div className="avatar-grid">
                {availableAvatars.map((avatar) => {
                  const locked = avatar !== "samourai.png" && !ownsAvatarPack;
                  return (
                    <div
                      key={avatar}
                      className={`avatar-option ${selectedAvatar === avatar ? "selected" : ""} ${locked ? "locked" : ""}`}
                      onClick={() => handleAvatarSelect(avatar)}
                      role="button"
                      tabIndex={0}
                      title={locked ? (t("account.avatarPackRequired") || "Pack avatar cyber requis — acheter dans la boutique") : avatar.replace(".png", "")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleAvatarSelect(avatar);
                        }
                      }}
                    >
                      <img
                        src={`/assets/avatar/${avatar}`}
                        alt={avatar.replace(".png", "")}
                        className="avatar-img"
                      />
                      {locked && (
                        <div className="avatar-lock" aria-hidden>
                          <span className="lock-icon">🔒</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="avatar-selector">
              <h3>Avatar Administrateur</h3>
              <div className="admin-avatar-display">
                <img
                  src="/assets/avatar/admin.jpg"
                  alt="Admin Avatar"
                  className="admin-avatar-img"
                  width="150"
                  height="150"
                />
                <p style={{color: "#66e3b8", marginTop: "12px"}}>Avatar unique et non modifiable</p>
              </div>
            </div>
          )}
          
          <LanguageSelector />
          
          {/* Historique d'achats */}
          <div className="purchase-history-section">
            <h3>{t("account.purchaseHistory") || "Historique d'achats"}</h3>
            {userPurchases.length > 0 ? (
              <div style={{ overflowX: "auto", marginTop: "12px" }}>
                <table className="purchase-history-table" style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}>
                  <thead>
                    <tr style={{
                      background: "rgba(255,255,255,0.05)",
                      borderBottom: "1px solid rgba(255,255,255,0.1)"
                    }}>
                      <th style={{ padding: "12px", textAlign: "left" }}>ID</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>{t("shop.product") || "Produit"}</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>{t("shop.price") || "Prix"}</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>{t("common.date") || "Date"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userPurchases.map((purchase) => (
                      <tr key={purchase.id} style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)"
                      }}>
                        <td style={{ padding: "12px" }}>{purchase.id}</td>
                        <td style={{ padding: "12px" }}>{purchase.product_name}</td>
                        <td style={{ padding: "12px" }}>{purchase.price}</td>
                        <td style={{ padding: "12px" }}>
                          {new Date(purchase.purchased_at).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "8px" }}>
                {t("account.noPurchases") || "Aucun achat effectué"}
              </p>
            )}
          </div>
          
          {/* Codes de récupération */}
          <div className="recovery-codes-section">
            <h3>Codes de récupération</h3>
            <button
              onClick={handleGenerateRecoveryCode}
              disabled={recoveryCodesLoading}
              className="btn primary"
              style={{ marginTop: "8px" }}
            >
              {recoveryCodesLoading ? "Génération..." : "Générer un nouveau code"}
            </button>
            
            {showNewCode && newRecoveryCode && (
              <div className="new-recovery-code-alert" style={{
                background: "linear-gradient(180deg, rgba(59, 130, 246, 0.15), rgba(29, 78, 216, 0.10))",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                borderRadius: "10px",
                padding: "16px",
                marginTop: "12px",
                textAlign: "center"
              }}>
                <p style={{ fontSize: "0.9rem", margin: "0 0 8px 0" }}>
                  Votre nouveau code de récupération (à noter en sûr place) :
                </p>
                <code style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  color: "#60a5fa",
                  wordBreak: "break-all"
                }}>
                  {newRecoveryCode}
                </code>
                <p style={{ fontSize: "0.85rem", color: "#999", margin: "8px 0 0 0" }}>
                  {t("forgotPassword.downloadNotice") || "Ce code ne s'affichera qu'une seule fois. À utiliser sur la page de connexion si vous oubliez votre mot de passe."}
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
                  <button
                    onClick={handleDownloadRecoveryCode}
                    className="btn"
                  >
                    {t("forgotPassword.downloadJson") || "Télécharger (JSON)"}
                  </button>
                  <button
                    onClick={() => setShowNewCode(false)}
                    className="btn"
                  >
                    {t("common.close") || "Fermer"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="user-action">
            <button
              className="btn ghost no-border account__logout"
              onClick={handleLogout}
            >
              {t("common.logout")}
            </button>

            <button
              className="btn ghost danger user__delete"
              onClick={() => {
                if (user == "admin") {
                  alert(t("common.failedPrefix") + "cannot delete admin");
                  return;
                }
                confirm(
                  t("account.confirmDeleteUserFull").replace("{username}", user)
                ) &&
                  fetch(`${apiBase}/user/delete-user/${user}`, {
                    method: "DELETE",
                    headers: { "X-Admin-User": "user" },
                  })
                    .then((res) => {
                      if (!res.ok) throw new Error("Erreur serveur");
                      const remaining = allUsers.filter(
                        (u) => u.username !== user
                      );
                      setAllUsers(remaining);
                      if (remaining.length > 0)
                        setSelectedUser(remaining[0].username);
                      else setSelectedUser("");
                      alert(
                        t("account.deleteUserSuccess").replace(
                          "{username}",
                          user
                        )
                      );
                    })
                    .catch((e) => alert(t("common.failedPrefix") + e.message));
                handleLogout();
              }}
            >
              {t("account.deleteSelf")}
            </button>
            
            <button
              className="btn danger"
              disabled={resetSessionsLoading}
              onClick={() => {
                confirm(
                  t("account.confirmResetUserSessionsFull").replace(
                    "{username}",
                    user
                  )
                ) &&
                  fetch(`${apiBase}/user/reset-sessions/${user}`, {
                    method: "POST",
                    headers: { "X-Admin-User": "user" },
                  })
                    .then((res) => {
                      setResetSessionsLoading(true);
                      if (!res.ok) throw new Error("Erreur serveur");
                      alert(
                        t("account.resetUserSessionsSuccess").replace(
                          "{username}",
                          user
                        )
                      );
                    })
                    .catch((e) => alert(t("common.failedPrefix") + e.message))
                    .finally(() => setResetSessionsLoading(false));
              }}
            >
              {resetSessionsLoading
                ? t("account.resetting")
                : t("account.resetSelfSessions")}
                {/*bouton pour acceder au panneau de moderation */}
              </button>
              {isAdmin && (
                <button
                  className="btn primary"
                  onClick={() => navigate("/moderation")}
                >
                  boutton de la toute puissance
                </button>
              )}
          </div>
        </div>
      </>
    );
  }
  // Utilisateur non connecté : afficher une bannière invitant à se connecter
  return (
    <div className="account account--centered">
      <h1>{t("account.title")}</h1>
      <p className="account__notice">{t("account.loginRequired")}</p>
      <button
        className="btn primary account__login-btn"
        onClick={() => setIsOpen(true)}
      >
        {t("account.openLogin")}
      </button>
      <LoginModal
        isOpen={isOpen}
        action={setUser}
        onClose={() => setIsOpen(false)}
        openRegister={() => setIsRegisterOpen(true)}
        afterLogin={() => navigate("/account", { replace: true })}
      />
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        afterRegister={(u) => {
          setUser(u);
          navigate("/account", { replace: true });
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

// PropTypes validation pour le composant Account
Account.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

export default Account;

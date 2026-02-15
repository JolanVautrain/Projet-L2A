import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../autres/Language.jsx";
import { getApiBaseUrl } from "../utils/apiClient.js";
import { getActiveUser } from "../utils/userSession.js";
import PageNotFound from "../autres/PageNotFound.jsx";
import { apiUrl } from "../utils/apiClient.js";

/**
 * Composant Moderation
 * Gère la modération des utilisateurs (XP, bans, admin, suppression de données)
 */
function Moderation({ user }) {
  const [resetSessionsLoading, setResetSessionsLoading] = useState(false);
  const [awardXpLoading, setAwardXpLoading] = useState(false);
  const [deleteHistoryLoading, setDeleteHistoryLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [removeAdminLoading, setRemoveAdminLoading] = useState(false);
  const [banUserLoading, setBanUserLoading] = useState(false);
  const [unbanUserLoading, setUnbanUserLoading] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [banReason, setBanReason] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedUserPurchases, setSelectedUserPurchases] = useState([]);
  const [cancelPurchaseLoading, setCancelPurchaseLoading] = useState(null);

  const { t } = useLanguage();
  const apiBase = getApiBaseUrl();

  const [isAdmin, setIsAdmin] = useState(false);
  // Charger la liste des utilisateurs si admin
  useEffect(() => {
    console.log("Checking admin for:", user);
    if (!user) return;

    if (user === "admin") {
      setIsAdmin(true); // déclenche le rendu du composant
      loadAdminUsers(user);
      loadReports();
    }
  }, [user]);

  // Charger l'historique d'achat quand l'utilisateur sélectionné change
  useEffect(() => {
    if (selectedUser) {
      loadUserPurchases(selectedUser);
    }
  }, [selectedUser]);

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

  const loadReports = async () => {
  try {
    const res = await fetch(apiUrl("report"));
    if (!res.ok) throw new Error("Erreur chargement reports");
    const data = await res.json();
    setReports(data.reports);
  } catch (err) {
    console.error(err);
  }
};

  const loadUserPurchases = async (username) => {
    if (!username) {
      setSelectedUserPurchases([]);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/shop/purchases/${username}`);
      if (!res.ok) throw new Error("Erreur chargement purchases utilisateur");
      const data = await res.json();
      setSelectedUserPurchases(data.purchases);
    } catch (err) {
      console.error(err);
      setSelectedUserPurchases([]);
    }
  };

  const handleCancelPurchase = async (purchaseId) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cet achat ?")) return;

    setCancelPurchaseLoading(purchaseId);
    try {
      const res = await fetch(`${apiBase}/shop/admin/purchase/${purchaseId}`, {
        method: "DELETE",
        headers: { "X-Admin-User": user },
      });
      
      if (!res.ok) throw new Error("Erreur annulation achat");
      
      alert("Achat annulé avec succès");
      loadUserPurchases(selectedUser); // Recharger la liste de l'utilisateur
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setCancelPurchaseLoading(null);
    }
  };

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


  // Composants internes
  const xp_form = (
    <form id="xp-form" onSubmit={handleSubmit}>
      <label htmlFor="input-xp">
        Ajoute l'XP à l'utilisateur
        <input
          type="text"
          name="number"
          placeholder="50"
          inputMode="numeric"
          pattern="[0-9]{0,}"
          required
        />
      </label>
      <label htmlFor="sub-xp">
        soustrait l'xp si cocher
        <input type="checkbox" name="sub_xp" />
      </label>
      <button type="submit" className="btn primary" disabled={awardXpLoading}>
        {awardXpLoading ? t("common.saving") : t("account.awardXp")}
      </button>
    </form>
  );

  const userList = (
    <div style={{ width: "100%" }}>
      <div className="admin-tools__center">
        <h4 style={{ textAlign: "center" }}>{t("account.manageUsers")}</h4>
        <input
          type="search"
          placeholder={
            t("account.searchPlaceholder") || "Rechercher un joueur..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-users-search"
        />
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>XP</th>
              <th>Niveau</th>
              <th>Parties</th>
              <th>Meilleur</th>
              <th>Total</th>
              <th>Admin</th>
              <th>Banni</th>
            </tr>
          </thead>
          <tbody>
            {allUsers
              .filter((u) =>
                u.username.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((u) => (
                <tr
                  key={u.username}
                  className={u.username === selectedUser ? "selected" : ""}
                  onClick={() => setSelectedUser(u.username)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedUser(u.username);
                  }}
                >
                  <td>{u.username}</td>
                  <td>{u.xp ?? 0}</td>
                  <td>{u.level ?? 1}</td>
                  <td>{u.totalGames ?? 0}</td>
                  <td>{u.bestScore ?? 0}</td>
                  <td>{u.totalScore ?? 0}</td>
                  <td>{u.is_admin ? "✓" : "-"}</td>
                  <td>{u.banned_until ? "✓" : "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const reportList = (
    <div style={{ width: "100%" }}>
      <div className="admin-tools__center">
        <h4 style={{ textAlign: "center" }}>{t("account.manageReports")}</h4>
        <input
          type="search"
          placeholder={
            t("account.searchPlaceholder") || "Rechercher un joueur..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-users-search"
        />
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Admin</th>
              <th>report_raison</th>
            </tr>
          </thead>
          <tbody>
            {reports
              .filter((u) =>
                u.username.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((u) => (
                <tr
                  key={u.username}
                  className={u.username === selectedUser ? "selected" : ""}
                  onClick={() => setSelectedUser(u.username)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedUser(u.username);
                  }}
                >
                  <td>{u.username}</td>
                  <td>{u.username === "admin" ? "admin ne peut pas être banni" : "-"}</td>
                  <td>{u.issue ?? "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const bannedList = (
    <div style={{ width: "100%" }}>
      <div className="admin-tools__center">
        <h4 style={{ textAlign: "center" }}>Utilisateurs Bannis</h4>
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Raison</th>
              <th>Fin du bannissement</th>
            </tr>
          </thead>
          <tbody>
            {allUsers
              .filter((u) => u.banned_until)
              .map((u) => {
                const bannedUntil = u.banned_until ? new Date(u.banned_until) : null;
                let banDisplay = "-";

                if (bannedUntil) {
                  const now = new Date();
                  const diffMs = bannedUntil - now; // différence en millisecondes
                  const diffHours = diffMs / (1000 * 60 * 60);

                  if (diffHours <= 24) {
                    // Affichage en compte à rebours
                    const hours = Math.floor(diffHours);
                    const minutes = Math.floor((diffHours - hours) * 60);
                    banDisplay = `${hours}h ${minutes}min`;
                  } else {
                    // Affichage en date normale
                    banDisplay = bannedUntil.toLocaleString("fr-FR");
                  }
                }

                return (
                  <tr key={u.username}>
                    <td>{u.username}</td>
                    <td>{u.banReason || "-"}</td>
                    <td>{banDisplay}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  )

  const userPurchaseHistory = (
    <div style={{ width: "100%" }}>
      <div className="admin-tools__center">
        <h4 style={{ textAlign: "center" }}>
          Historique d'Achats - {selectedUser || "Aucun utilisateur sélectionné"}
        </h4>
        {selectedUserPurchases.length > 0 ? (
          <div className="admin-users-list">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produit</th>
                  <th>Prix</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedUserPurchases.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.product_name}</td>
                    <td>{p.price}</td>
                    <td>{new Date(p.purchased_at).toLocaleString('fr-FR')}</td>
                    <td>
                      <button
                        className="btn danger"
                        style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                        disabled={cancelPurchaseLoading === p.id}
                        onClick={() => handleCancelPurchase(p.id)}
                      >
                        {cancelPurchaseLoading === p.id ? "..." : "Annuler"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
            {selectedUser ? "Aucun achat trouvé pour cet utilisateur" : "Sélectionnez un utilisateur dans le tableau ci-dessus"}
          </p>
        )}
      </div>
    </div>
  )

  const ban_user = (
  <div className="admin-action">
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="number"
          placeholder={
            t("account.banDurationPlaceholder") ||
            "Durée en heures (vide = permanent)"
          }
          value={banDuration}
          onChange={(e) => setBanDuration(e.target.value)}
          min="1"
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            color: "inherit",
            flex: 1,
            minWidth: "150px",
          }}
        />

        <input
          type="text"
          placeholder={
            t("account.banReasonPlaceholder") ||
            "Raison du bannissement..."
          }
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            color: "inherit",
            flex: 1,
            minWidth: "200px",
          }}
        />
      </div>

      {selectedUser &&
        selectedUser !== "admin" &&
        !allUsers.find((u) => u.username === selectedUser)?.banned_until && (
          <button
            className="btn danger"
            disabled={banUserLoading}
            onClick={() => {
              if (!banReason.trim()) {
                alert(
                  t("account.banReasonRequired") ||
                    "La raison du bannissement est requise"
                );
                return;
              }

              const durationHours = banDuration
                ? parseInt(banDuration)
                : null;

              if (durationHours !== null && durationHours <= 0) {
                alert(
                  t("account.invalidDuration") ||
                    "La durée doit être positive"
                );
                return;
              }

              const banType = durationHours
                ? `${durationHours}h`
                : "permanent";

              if (
                confirm(
                  t("account.confirmBanUser")
                    ?.replace("{username}", selectedUser)
                    ?.replace("{duration}", banType) ||
                    `Bannir ${selectedUser} pour ${banType} ?`
                )
              ) {
                setBanUserLoading(true);

                fetch(`${apiBase}/admin/ban-user/${selectedUser}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Admin-User": user,
                  },
                  body: JSON.stringify({
                    duration_hours: durationHours,
                    reason: banReason.trim(),
                  }),
                })
                  .then((res) => {
                    if (!res.ok) throw new Error("Erreur serveur");

                    const updated = allUsers.map((u) =>
                      u.username === selectedUser
                        ? {
                            ...u,
                            banned_until: durationHours
                              ? new Date(
                                  Date.now() + durationHours * 3600000
                                ).toISOString()
                              : new Date(8640000000000000).toISOString(),
                          }
                        : u
                    );

                    setAllUsers(updated);
                    setBanDuration("");
                    setBanReason("");

                    alert(
                      t("account.banUserSuccess")?.replace(
                        "{username}",
                        selectedUser
                      ) || `${selectedUser} a été banni.`
                    );
                  })
                  .catch((e) =>
                    alert((t("common.failedPrefix") || "Erreur: ") + e.message)
                  )
                  .finally(() => setBanUserLoading(false));
              }
            }}
          >
            {banUserLoading
              ? t("common.saving")
              : t("account.banUser") || "Bannir"}
          </button>
        )}

      {selectedUser &&
        allUsers.find((u) => u.username === selectedUser)?.banned_until && (
          <button
            className="btn warning"
            disabled={unbanUserLoading}
            onClick={() => {
              if (
                confirm(
                  t("account.confirmUnbanUser")?.replace(
                    "{username}",
                    selectedUser
                  ) || `Débannir ${selectedUser} ?`
                )
              ) {
                setUnbanUserLoading(true);

                fetch(`${apiBase}/admin/unban-user/${selectedUser}`, {
                  method: "POST",
                  headers: { "X-Admin-User": user },
                })
                  .then((res) => {
                    if (!res.ok) throw new Error("Erreur serveur");

                    const updated = allUsers.map((u) =>
                      u.username === selectedUser
                        ? { ...u, banned_until: null, ban_reason: null }
                        : u
                    );

                    setAllUsers(updated);
                    setBanDuration("");
                    setBanReason("");

                    alert(
                      t("account.unbanUserSuccess")?.replace(
                        "{username}",
                        selectedUser
                      ) || `${selectedUser} a été débanni.`
                    );
                  })
                  .catch((e) =>
                    alert((t("common.failedPrefix") || "Erreur: ") + e.message)
                  )
                  .finally(() => setUnbanUserLoading(false));
              }
            }}
          >
            {unbanUserLoading
              ? t("common.saving")
              : t("account.unbanUser") || "Débannir"}
          </button>
        )}
    </div>

    <p className="admin-action__desc">
      {t("account.banManagementDesc") ||
        "Bannir temporairement ou définitivement cet utilisateur."}
    </p>
  </div>
);


  // Retour principal
  return isAdmin ? (
    <div className="admin-tools">
      <h2 className="admin-tools__title" style={{ textAlign: "center" }}>
        {t("account.adminTools")}
      </h2>

      <div className="admin-actions">
        {userList}
        {xp_form}
      </div>
      <div className="admin-actions">{userPurchaseHistory}</div>
      <div className="admin-actions">{reportList}</div>
      <div className="admin-actions">{ban_user}</div>
      <div className="admin-actions">{bannedList}</div>
    </div>
  ) : (
    <h2>Vous n'avez pas les droits admin</h2>
  );
}

Moderation.propTypes = {
  user: PropTypes.string,
  isAdmin: PropTypes.bool,
};

export default Moderation;

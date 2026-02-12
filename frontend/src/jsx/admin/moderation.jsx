import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../autres/Language.jsx";
import { getApiBaseUrl } from "../utils/apiClient.js";
import { getActiveUser } from "../utils/userSession.js";
import PageNotFound from "../autres/PageNotFound.jsx";


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

const { t } = useLanguage();
const apiBase = getApiBaseUrl();

const [isAdmin, setIsAdmin] = useState(false);
// Charger la liste des utilisateurs si admin
 useEffect(() => {
  console.log("Checking admin for:", user);
  if (!user) return;

  if (user === "admin") {
    setIsAdmin(true); // déclenche le rendu du composant
  }
}, [user]);



  // Placeholder pour le formulaire XP
  const handleSubmit = (e) => {
    e.preventDefault();
    alert("XP form submitted (à implémenter)");
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
          placeholder={t("account.searchPlaceholder") || "Rechercher un joueur..."}
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
              .filter((u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
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
    </div>
  ) : <h2>Vous n'avez pas les droits admin</h2>;
}
  

Moderation.propTypes = {
  user: PropTypes.string,
  isAdmin: PropTypes.bool,
};

export default Moderation;
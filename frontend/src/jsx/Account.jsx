import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Statistics from "./Statistics.jsx";
import { LanguageSelector, useLanguage } from "./Language.jsx";
import "../css/Index.css";
import "../css/Account.css";
import LoginModal from "./LoginModal.jsx";
import RegisterModal from "./RegisterModal.jsx";

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
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const apiBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : '';

  // Charger la liste des utilisateurs si admin
  useEffect(() => {
    if (user === "admin") {
      (async () => {
        try {
          const res = await fetch(`${apiBase}/api/admin/users`, {
            headers: { "X-Admin-User": "admin" },
          });
          if (res.ok) {
            const data = await res.json();
            // Enrichir chaque utilisateur avec XP et stats (parallèle)
            const enriched = await Promise.all(
              data.map(async (u) => {
                try {
                  const [xpRes, statsRes] = await Promise.all([
                    fetch(`${apiBase}/api/user/xp/${u.username}`),
                    fetch(`${apiBase}/api/user/stats/${u.username}`),
                  ]);
                  const xpJson = xpRes && xpRes.ok ? await xpRes.json() : { xp: 0, level: 1 };
                  const statsJson = statsRes && statsRes.ok ? await statsRes.json() : { totalGames: 0, totalScore: 0, bestScore: 0, averageScore: 0 };
                  return {
                    ...u,
                    xp: xpJson.xp || 0,
                    level: xpJson.level || 1,
                    totalGames: statsJson.totalGames || 0,
                    totalScore: statsJson.totalScore || 0,
                    bestScore: statsJson.bestScore || 0,
                    averageScore: statsJson.averageScore || 0,
                  };
                } catch (e) {
                  return { ...u, xp: 0, level: 1, totalGames: 0, totalScore: 0, bestScore: 0, averageScore: 0 };
                }
              })
            );
            setAllUsers(enriched);
            if (enriched.length > 0) setSelectedUser(enriched[0].username);
          }
        } catch (e) {
          console.warn("Failed to load users", e);
        }
      })();
    }
  }, [user]);
  // Gère la déconnexion de l'utilisateur
  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };
  if (user) {
    // Utilisateur connecté : afficher les informations de compte
    return (
      <>
        <h1>{t("account.title")}</h1>
        <div className="account-actions">
          <p>
            {t("account.hello")} {user}, {t("account.yourAccountPage")}.
          </p>
          <Statistics user={user} />
          <LanguageSelector />
          {user === "admin" && (
            <div className="admin-tools">
              <h2 className="admin-tools__title" style={{textAlign: 'center'}}>{t("account.adminTools")}</h2>
              <div style={{width: '100%'}}>
                <div className="admin-tools__center">
                  <h4 style={{textAlign: 'center'}}>{t("account.manageUsers")}</h4>
                  <div className="admin-users-search-row">
                    <input
                      type="search"
                      placeholder={t('account.searchPlaceholder') || 'Rechercher un joueur...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="admin-users-search"
                    />
                  </div>

                  <div className="admin-users-list" role="region" aria-label="liste-utilisateurs">
                    <table className="admin-users-table">
                      <thead>
                        <tr>
                          <th>Utilisateur</th>
                          <th>XP</th>
                          <th>Niveau</th>
                          <th>Parties</th>
                          <th>Meilleur</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers
                          .filter((u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((u) => (
                            <tr
                              key={u.username}
                              className={u.username === selectedUser ? 'selected' : ''}
                              onClick={() => setSelectedUser(u.username)}
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedUser(u.username); }}
                            >
                              <td>{u.username}</td>
                              <td>{u.xp ?? 0}</td>
                              <td>{u.level ?? 1}</td>
                              <td>{u.totalGames ?? 0}</td>
                              <td>{u.bestScore ?? 0}</td>
                              <td>{u.totalScore ?? 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-actions">
                  <div className="admin-action">
                    <button
                      className="btn primary"
                      disabled={awardXpLoading}
                      onClick={() => {
                        if (!selectedUser) return;
                        if (!confirm(t("account.confirmAwardXp").replace("{username}", selectedUser))) return;
                        setAwardXpLoading(true);
                        fetch(`${apiBase}/api/user/xp`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'X-Admin-User': 'admin' },
                          body: JSON.stringify({ username: selectedUser, xp: 50 }),
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error('Erreur serveur');
                            return res.json();
                          })
                          .then(() => {
                            alert(t("account.awardXpSuccess").replace("{username}", selectedUser));
                          })
                          .catch((e) => alert(t('common.failedPrefix') + e.message))
                          .finally(() => setAwardXpLoading(false));
                      }}
                    >
                      {awardXpLoading ? t('common.saving') : t('account.award50xp')}
                    </button>
                    <p className="admin-action__desc">{t('account.awardXpDesc') || 'Ajouter 50 XP à l\'utilisateur sélectionné.'}</p>
                    <hr />
                  </div>

                  <div className="admin-action">
                    <button
                      className="btn ghost danger"
                      disabled={removeXpLoading}
                      onClick={() => {
                        if (!selectedUser) return;
                        if (!confirm((t("account.confirmRemoveXp") || `Retirer 50 XP à ${selectedUser}?` ).replace("{username}", selectedUser))) return;
                        setRemoveXpLoading(true);
                        fetch(`${apiBase}/api/user/xp`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'X-Admin-User': 'admin' },
                          body: JSON.stringify({ username: selectedUser, xp: -50 }),
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error('Erreur serveur');
                            return res.json();
                          })
                          .then(() => {
                            alert((t("account.removeXpSuccess") || `-50 XP retirés à ${selectedUser}` ).replace("{username}", selectedUser));
                          })
                          .catch((e) => alert(t('common.failedPrefix') + e.message))
                          .finally(() => setRemoveXpLoading(false));
                      }}
                    >
                      {removeXpLoading ? t('common.saving') : (t('account.remove50xp') || '-50 XP')}
                    </button>
                    <p className="admin-action__desc">{t('account.removeXpDesc') || 'Retirer 50 XP à l\'utilisateur sélectionné.'}</p>
                    <hr />
                  </div>

                  <div className="admin-action">
                    <button
                      className="btn danger"
                      disabled={resetSessionsLoading}
                      onClick={() => {
                        if (selectedUser) {
                          if (!confirm(t("account.confirmResetUserSessions").replace("{username}", selectedUser))) return;
                          setResetSessionsLoading(true);
                          fetch(`${apiBase}/api/admin/reset-sessions/${selectedUser}`, {
                            method: "POST",
                            headers: { "X-Admin-User": "admin" },
                          })
                            .then((res) => {
                              if (!res.ok) throw new Error("Erreur serveur");
                              alert(t("account.resetUserSessionsSuccess").replace("{username}", selectedUser));
                            })
                            .catch((e) => alert(t("common.failedPrefix") + e.message))
                            .finally(() => setResetSessionsLoading(false));
                        }
                      }}
                    >
                      {resetSessionsLoading
                        ? t("account.resetting")
                        : t("account.resetUserSessions")}
                    </button>
                    <p className="admin-action__desc">{t('account.resetSessionsDesc') || 'Supprime les parties et scores de l\'utilisateur.'}</p>
                    <hr />
                  </div>

                  <div className="admin-action">
                    <button
                      className="btn ghost warning"
                      disabled={deleteHistoryLoading}
                      onClick={() => {
                        if (!selectedUser) return;
                        if (!confirm((t("account.confirmDeleteXpHistory") || `Supprimer l\'historique XP de ${selectedUser}?`).replace("{username}", selectedUser))) return;
                        setDeleteHistoryLoading(true);
                        fetch(`${apiBase}/api/admin/delete-xp-history/${selectedUser}`, {
                          method: "POST",
                          headers: { "X-Admin-User": "admin" },
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error("Erreur serveur");
                            return res.json();
                          })
                          .then((data) => {
                            alert(t("account.deleteXpHistorySuccess")?.replace("{username}", selectedUser) || `Historique XP supprimé pour ${selectedUser}`);
                          })
                          .catch((e) => alert(t("common.failedPrefix") + e.message))
                          .finally(() => setDeleteHistoryLoading(false));
                      }}
                    >
                      {deleteHistoryLoading ? t('common.saving') : (t('account.deleteXpHistory') || 'Supprimer historique XP')}
                    </button>
                    <p className="admin-action__desc">{t('account.deleteXpHistoryDesc') || 'Supprime toutes les entrées d\'historique XP.'}</p>
                    <hr />
                  </div>

                  <div className="admin-action">
                    <button
                      className="btn ghost danger admin-tools__delete"
                      onClick={() => {
                        if (!selectedUser) return;
                        if (!confirm(t("account.confirmDeleteUserFull").replace("{username}", selectedUser))) return;
                        fetch(`${apiBase}/api/admin/delete-user/${selectedUser}`, {
                          method: "DELETE",
                          headers: { "X-Admin-User": "admin" },
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error("Erreur serveur");
                            const remaining = allUsers.filter((u) => u.username !== selectedUser);
                            setAllUsers(remaining);
                            if (remaining.length > 0) setSelectedUser(remaining[0].username);
                            else setSelectedUser("");
                            alert(t("account.deleteUserSuccess").replace("{username}", selectedUser));
                          })
                          .catch((e) => alert(t("common.failedPrefix") + e.message));
                      }}
                    >
                      {t("account.deleteUser")}
                    </button>
                    <p className="admin-action__desc">{t('account.deleteUserDesc') || 'Supprime l\'utilisateur et les données associées.'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            className="btn ghost no-border account__logout"
            onClick={handleLogout}
          >
            {t("common.logout")}
          </button>
        </div>
      </>
    );
  }
  // Utilisateur non connecté : afficher une bannière invitant à se connecter
  return (
    <div className="account account--centered">
      <h1>{t("account.title")}</h1>
      <p className="account__notice">{t("account.loginRequired")}</p>
      <button className="btn primary account__login-btn" onClick={() => setIsOpen(true)}>
        {t("account.openLogin")}
      </button>
      <LoginModal
        isOpen={isOpen}
        action={setUser}
        onClose={() => setIsOpen(false)}
        openRegister={() => setIsRegisterOpen(true)}
        afterLogin={() => navigate('/account', { replace: true })}
      />
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        afterRegister={(u) => { setUser(u); navigate('/account', { replace: true }); }}
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

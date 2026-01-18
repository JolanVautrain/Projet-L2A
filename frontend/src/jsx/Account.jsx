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
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Charger la liste des utilisateurs si admin
  useEffect(() => {
    if (user === "admin") {
      (async () => {
        try {
          const res = await fetch("/api/admin/users", {
            headers: { "X-Admin-User": "admin" },
          });
          if (res.ok) {
            const data = await res.json();
            setAllUsers(data);
            if (data.length > 0) setSelectedUser(data[0].username);
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
              <h3 className="admin-tools__title">{t("account.adminTools")}</h3>
              <div>
                <h4>{t("account.manageUsers")}</h4>
                <div className="admin-tools__controls">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="admin-tools__select"
                  >
                    {allUsers.map((u) => (
                      <option key={u.username} value={u.username}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn ghost"
                    disabled={resetSessionsLoading}
                    onClick={() => {
                      if (selectedUser) {
                        if (!confirm(t("account.confirmResetUserSessions").replace("{username}", selectedUser))) return;
                        setResetSessionsLoading(true);
                        fetch(`/api/admin/reset-sessions/${selectedUser}`, {
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
                  <button
                    className="btn ghost danger admin-tools__delete"
                    onClick={() => {
                      if (!selectedUser) return;
                      if (!confirm(t("account.confirmDeleteUserFull").replace("{username}", selectedUser))) return;
                      fetch(`http://127.0.0.1:5000/api/admin/delete-user/${selectedUser}`, {
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

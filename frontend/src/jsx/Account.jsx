import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Statistics from "./Statistics.jsx";
import { LanguageSelector, useLanguage } from "./Language.jsx";
import "../css/Index.css";
import "../css/Account.css";
import LoginModal from "./LoginModal.jsx";

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
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSessionsLoading, setResetSessionsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [resetUserLoading, setResetUserLoading] = useState(false);
  const [resetUserSessionsLoading, setResetUserSessionsLoading] =
    useState(false);
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

  // Réinitialiser le classement du compte admin lui-même
  const handleResetAdmin = async () => {
    if (!confirm(t("account.confirmResetSelfScore"))) return;
    try {
      setResetLoading(true);
      const res = await fetch("/api/admin/reset-test", { method: "POST" });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (_) {
          body = res.statusText;
        }
        throw new Error(body || "failed");
      }
      alert("Votre classement a été réinitialisé.");
    } catch (e) {
      console.error("Reset failed", e);
      alert("Échec de la réinitialisation: " + (e?.message || "voir console"));
    } finally {
      setResetLoading(false);
    }
  };

  // Réinitialiser les sessions du compte admin lui-même
  const handleResetAdminSessions = async () => {
    if (!confirm(t("account.confirmResetSelfSessions"))) return;
    try {
      setResetSessionsLoading(true);
      const res = await fetch("/api/admin/reset-sessions/admin", {
        method: "POST",
        headers: { "X-Admin-User": "admin" },
      });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (_) {
          body = res.statusText;
        }
        throw new Error(body || "failed");
      }
      alert("Vos autres parties ont été réinitialisées.");
    } catch (e) {
      console.error("Reset sessions failed", e);
      alert("Échec de la réinitialisation: " + (e?.message || "voir console"));
    } finally {
      setResetSessionsLoading(false);
    }
  };

  // Réinitialiser le classement d'un utilisateur sélectionné
  const handleResetUser = async () => {
    if (!selectedUser) return;
    if (!confirm(`${t("account.confirmResetUserScore")} ${selectedUser} ?`))
      return;
    try {
      setResetUserLoading(true);
      const res = await fetch(`/api/admin/reset-user/${selectedUser}`, {
        method: "POST",
        headers: { "X-Admin-User": "admin" },
      });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (_) {
          body = res.statusText;
        }
        throw new Error(body || "failed");
      }
      alert(`Classement de ${selectedUser} réinitialisé.`);
    } catch (e) {
      console.error("Reset user failed", e);
      alert("Échec: " + (e?.message || "voir console"));
    } finally {
      setResetUserLoading(false);
    }
  };

  // Réinitialiser les sessions d'un utilisateur sélectionné
  const handleResetUserSessions = async () => {
    if (!selectedUser) return;
    if (!confirm(`${t("account.confirmResetUserSessions")} ${selectedUser} ?`))
      return;
    try {
      setResetUserSessionsLoading(true);
      const res = await fetch(`/api/admin/reset-sessions/${selectedUser}`, {
        method: "POST",
        headers: { "X-Admin-User": "admin" },
      });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (_) {
          body = res.statusText;
        }
        throw new Error(body || "failed");
      }
      alert(`Autres parties de ${selectedUser} réinitialisées.`);
    } catch (e) {
      console.error("Reset user sessions failed", e);
      alert("Échec: " + (e?.message || "voir console"));
    } finally {
      setResetUserSessionsLoading(false);
    }
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
            <div
              style={{
                marginTop: 24,
                padding: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                backgroundColor: "rgba(79,158,246,0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{t("account.adminTools")}</h3>

              <div>
                <h4>{t("account.manageUsers")}</h4>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    style={{
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.2)",
                      backgroundColor: "#0b1222",
                      color: "#e6eef8",
                      minWidth: 120,
                    }}
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
                        if (
                          !confirm(
                            `${t("account.confirmResetUserSessions")} ${selectedUser} ?`,
                          )
                        )
                          return;
                        setResetSessionsLoading(true);
                        fetch(`/api/admin/reset-sessions/${selectedUser}`, {
                          method: "POST",
                          headers: { "X-Admin-User": "admin" },
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error("Erreur serveur");
                            alert(
                              `${t("account.resetUserSessions")} ${selectedUser} réinitialisées.`,
                            );
                          })
                          .catch((e) => alert("Échec: " + e.message))
                          .finally(() => setResetSessionsLoading(false));
                      }
                    }}
                  >
                    {resetSessionsLoading
                      ? t("account.resetting")
                      : t("account.resetUserSessions")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            className="btn ghost no-border"
            onClick={handleLogout}
            style={{ marginTop: 16 }}
          >
            {t("common.logout")}
          </button>
        </div>
      </>
    );
  }
  // Utilisateur non connecté : afficher le bouton de connexion
  return (
    <>
      <h1>{t("account.title")}</h1>
      <button onClick={() => setIsOpen(true)}>{t("common.login")}</button>
      <LoginModal
        isOpen={isOpen}
        action={setUser}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

// PropTypes validation pour le composant Account
Account.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

export default Account;

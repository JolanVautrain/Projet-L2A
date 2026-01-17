import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // Gère la déconnexion de l'utilisateur
  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };
  if (user) { // Utilisateur connecté : afficher les informations de compte
    return (
      <>
        <h1>Compte</h1>
        <div className="account-actions">
          <p>Bonjour {user}, voici votre page de compte.</p>
          {user === 'test' && (
            <div style={{marginTop: 12}}>
              <button
                className="btn ghost"
                disabled={resetLoading}
                onClick={async () => {
                  if (!confirm('Réinitialiser le classement pour le compte test ?')) return;
                  try {
                    setResetLoading(true);
                    const res = await fetch('/api/admin/reset-test', { method: 'POST' });
                    if (!res.ok) {
                      let body = '';
                      try { body = await res.text(); } catch (_) { body = res.statusText; }
                      throw new Error(body || 'failed');
                    }
                    alert('Classement du compte test réinitialisé.');
                  } catch (e) {
                    console.error('Reset failed', e);
                    alert('Échec de la réinitialisation: ' + (e?.message || 'voir console'));
                  } finally { setResetLoading(false); }
                }}
              >{resetLoading ? 'Réinitialisation…' : 'Réinitialiser le classement (test)'}</button>
            </div>
          )}
          <button className="btn ghost no-border" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </>
    );
  }
  // Utilisateur non connecté : afficher le bouton de connexion
  return (
    <>
      <h1>Compte</h1>
      <button onClick={() => setIsOpen(true)}>Login</button>
      <LoginModal isOpen={isOpen} action={setUser} onClose={() => setIsOpen(false)} />
    </>
  );
}

// PropTypes validation pour le composant Account
Account.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

export default Account;

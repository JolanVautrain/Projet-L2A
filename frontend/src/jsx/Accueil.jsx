import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import LoginModal from "./LoginModal.jsx";
import "../css/Accueil.css";

// Données pour les sections mises en avant
const highlights = [
  {
    title: "Parties instantanées",
    text: "Lance une partie en quelques secondes et reprends là où tu t'es arrêté.",
  },
  {
    title: "Vision à coup le souffle",
    text: "Animations fluides et grille lisible pour suivre chaque coup sans effort.",
  },
  {
    title: "Un challenge hors du commun",
    text: "Une tension avec des bombes prête à exploser au moindre toucher.",
  },
];

// Étapes du parcours utilisateur
const steps = [
  {
    title: "Choisis ton camp",
    text: "Sélectionne ton rôle et vérifie la configuration en un coup d'œil.",
  },
  {
    title: "Observe le terrain",
    text: "La grille surdimensionnée et les repères colorés te guident en temps réel.",
  },
  {
    title: "Aligne et gagne",
    text: "Enchaîne les coups avec les animations de feedback, puis partage la victoire.",
  },
];

/**
 * Composant Accueil
 * Affiche la page d'accueil avec les actions principales et la connexion.
 *
 * Props :
 * - user (string|null) : nom d'utilisateur connecté ou null
 * - setUser (function) : fonction pour mettre à jour l'utilisateur
 */
function Accueil({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);

  const location = useLocation();

  // Ouvre la modal de connexion si l'état de navigation le demande
  useEffect(() => {
    if (location?.state?.openLogin) {
      setIsOpen(true);
      // Nettoie l'état pour éviter de rouvrir la modal inutilement
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
    }
  }, [location]);

  // Rendu du composant Accueil
  return (
    <div className="home">
      <section className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">Prêt à jouer ?</p>
          <h1>
            Aligne, anticipe, <span className="text-glow">gagne</span>.
          </h1>
          <p className="hero__lede">
            Une page d'accueil animée pour te plonger immédiatement dans l'univers
            du jeu. Lance une partie, revois les règles ou connecte-toi pour
            continuer ta progression.
          </p>
          <div className="hero__actions">
            <Link className="btn primary" to="/game">
              Lancer une partie
            </Link>
            <Link className="btn ghost" to="/leaderboard">
              Voir les règles
            </Link>
            <button
              className="btn accent"
              onClick={user ? undefined : openLogin}
              disabled={!!user}
              aria-disabled={!!user}
            >
              {user ? `Bonjour ${user}` : "Se connecter"}
            </button>
          </div>
          <div className="hero__stats">
            <div className="stat-card">
              <span className="stat-label">Parties en cours</span>
              <strong className="stat-value">12</strong>
              <p className="stat-note">Serveurs stables et synchronisés</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Temps moyen</span>
              <strong className="stat-value">04:32</strong>
              <p className="stat-note">Parties rapides et intenses</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Joueurs actifs</span>
              <strong className="stat-value">+120</strong>
              <p className="stat-note">Communauté prête à jouer</p>
            </div>
          </div>
        </div>
        <div className="hero__panel">
          <div className="panel-glow">
            <p className="panel-label">Atmosphère</p>
            <h3>Interface animée</h3>
            <p className="panel-copy">
              Des dégradés dynamiques, des cartes flottantes et un parcours
              guidé pour que chaque visite sur l'accueil soit une invitation à
              lancer une partie.
            </p>
          </div>
          <div className="highlight-grid">
            {highlights.map((item) => (
              <article className="highlight-card" key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="steps">
        <header>
          <p className="hero__eyebrow">Comment ça marche</p>
          <h2>Un parcours clair, animé étape par étape</h2>
          <p className="hero__lede">
            Chaque bloc s'affiche avec un léger mouvement pour garder le
            rythme et t'amener naturellement vers le bouton "Jouer".
          </p>
        </header>
        <div className="steps__grid">
          {steps.map((step, index) => (
            <div className="step-card" key={step.title}>
              <div className="step-number">0{index + 1}</div>
              <div>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
        {!user && (
          <div className="cta-banner">
            <div>
              <p className="hero__eyebrow">Rejoins la partie</p>
              <h3>Connecte-toi pour sauvegarder tes coups</h3>
              <p className="hero__lede">
                Un clic suffit pour ouvrir la modal et reprendre là où tu t'étais
                arrêté.
              </p>
            </div>
            <button className="btn primary" onClick={openLogin}>
              Ouvrir la connexion
            </button>
          </div>
        )}
      </section>
      <LoginModal isOpen={isOpen} action={setUser} onClose={closeLogin} />
    </div>
  );
}

export default Accueil;

// PropTypes validation pour le composant Accueil
Accueil.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

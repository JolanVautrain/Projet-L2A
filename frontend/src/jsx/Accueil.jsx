import { useState } from "react";
import { Link } from "react-router-dom";
import LoginModal from "./LoginModal.jsx";
import "../css/Accueil.css";

const highlights = [
  {
    title: "Parties instantanées",
    text: "Lance une partie en quelques secondes et reprends là où tu t'es arrêté.",
  },
  {
    title: "Vision claire",
    text: "Animations fluides et grille lisible pour suivre chaque coup sans effort.",
  },
  {
    title: "Esprit d'équipe",
    text: "Invite un ami ou affronte l'IA, le tout depuis la même interface soignée.",
  },
];

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

function Accueil({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);

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
            <a className="btn ghost" href="/rules">
              Voir les règles
            </a>
            <button className="btn accent" onClick={openLogin}>
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

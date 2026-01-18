import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import LoginModal from "./LoginModal.jsx";
import { useLanguage } from "./Language.jsx";
import "../css/Accueil.css";

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
  const { t } = useLanguage();

  // Données pour les sections mises en avant
  const highlights = [
    {
      title: t("accueil.instantGames"),
      text: t("accueil.instantGamesDesc"),
    },
    {
      title: t("accueil.breathtakingVision"),
      text: t("accueil.breathtakingVisionDesc"),
    },
    {
      title: t("accueil.extraordinaryChallenge"),
      text: t("accueil.extraordinaryChallengeDesc"),
    },
  ];
  // Étapes du parcours utilisateur
  const steps = [
    {
      title: t("accueil.chooseYourSide"),
      text: t("accueil.chooseYourSideDesc"),
    },
    {
      title: t("accueil.observeTerrain"),
      text: t("accueil.observeTerrainDesc"),
    },
    {
      title: t("accueil.alignAndWin"),
      text: t("accueil.alignAndWinDesc"),
    },
  ];

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
          <p className="hero__eyebrow">{t("accueil.readyToPlay")}</p>
          <h1>
            {t("accueil.tagline")} <span className="text-glow">{t("accueil.taglineHighlight")}</span>.
          </h1>
          <p className="hero__lede">
            {t("accueil.welcomeText")}
          </p>
          <div className="hero__actions">
            <Link className="btn primary rainbow" to="/game">
                {t("accueil.startGame")}
              </Link>
            <Link className="btn ghost" to="/leaderboard">
              {t("accueil.seeRules")}
            </Link>
            <button
              className="btn accent"
              onClick={user ? undefined : openLogin}
              disabled={!!user}
              aria-disabled={!!user}
            >
              {user ? `${t("account.hello")} ${user}` : t("accueil.connectButton")}
            </button>
          </div>
          <div className="hero__stats">
            <div className="stat-card">
              <span className="stat-label">{t("accueil.gamesInProgress")}</span>
              <strong className="stat-value">12</strong>
              <p className="stat-note">{t("accueil.stableServers")}</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("accueil.averageTime")}</span>
              <strong className="stat-value">04:32</strong>
              <p className="stat-note">{t("accueil.fastGames")}</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("accueil.activePlayers")}</span>
              <strong className="stat-value">+120</strong>
              <p className="stat-note">{t("accueil.communityReady")}</p>
            </div>
          </div>
        </div>
        <div className="hero__panel">
          <div className="panel-glow">
            <p className="panel-label">{t("accueil.atmosphere")}</p>
            <h3>{t("accueil.animatedInterface")}</h3>
            <p className="panel-copy">
              {t("accueil.atmosphereDesc")}
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
          <p className="hero__eyebrow">{t("accueil.howItWorks")}</p>
          <h2>{t("accueil.clearPath")}</h2>
          <p className="hero__lede">
            {t("accueil.clearPathDesc")}
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
              <p className="hero__eyebrow">{t("accueil.joinTheGame")}</p>
              <h3>{t("accueil.connectToSave")}</h3>
              <p className="hero__lede">
                {t("accueil.oneClickConnect")}
              </p>
            </div>
            <button className="btn primary" onClick={openLogin}>
              {t("accueil.openLogin")}
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

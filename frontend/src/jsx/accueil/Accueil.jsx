import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LoginModal from "./modals/LoginModal.jsx";
import RegisterModal from "./modals/RegisterModal.jsx";
import { useLanguage } from "../autres/Language.jsx";

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
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const { t } = useLanguage();

  // Statistiques aléatoires affichées dans la page d'accueil
  const [gamesInProgress, setGamesInProgress] = useState(0);
  const [averageTime, setAverageTime] = useState("00:00");
  const [activePlayers, setActivePlayers] = useState(0);

  const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Génère et rafraîchit des valeurs aléatoires toutes les 15s
  useEffect(() => {
    const updateStats = () => {
      setGamesInProgress(getRandomInt(20, 100));
      setAverageTime(formatTime(getRandomInt(120, 10 * 60)));
      setActivePlayers(getRandomInt(100, 1000));
    };
    updateStats();
    const id = setInterval(updateStats, 15000); // rafraîchit toutes les 15 secondes
    return () => clearInterval(id);
  }, []);

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
  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Ouvre la modal de connexion si l'état de navigation le demande
  useEffect(() => {
    if (location?.state?.openLogin) {
      setTimeout(() => setIsOpen(true), 0);
      // Nettoie l'état pour éviter de rouvrir la modal inutilement
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
    }
  }, [location]);

  // Show advertising popup once per user journey, auto-hide after 15s
  const adTimerRef = useRef(null);
  
  useEffect(() => {
    const key = "ad_popup_shown_v1";
    const already = localStorage.getItem(key);
    if (!already) {
      // Show popup after 3 seconds, mark as seen, auto-close after 15s
      const showTimer = setTimeout(() => {
        setShowAdPopup(true);
        try {
          localStorage.setItem(key, "1");
        } catch (e) {
          // ignore storage errors
        }
        // Auto-close after 15 seconds
        adTimerRef.current = setTimeout(() => {
          setShowAdPopup(false);
          adTimerRef.current = null;
        }, 15000);
      }, 3000);
      
      return () => {
        clearTimeout(showTimer);
        if (adTimerRef.current) {
          clearTimeout(adTimerRef.current);
          adTimerRef.current = null;
        }
      };
    }
    return undefined;
  }, []);

  const closeAdPopup = () => {
    setShowAdPopup(false);
    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }
  };
  const goToShop = () => {
    setShowAdPopup(false);
    navigate('/shop');
  };
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
            <Link className="btn primary rainbow" to="/lobby">
                {t("accueil.startGame")}
            </Link>
            <Link className="btn primary rainbow" to="/game">
                {t("accueil.startGameSolo")}
              </Link>
            <Link className="btn accent" to="/regle">
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
              <strong className="stat-value">{gamesInProgress}</strong>
              <p className="stat-note">{t("accueil.stableServers")}</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("accueil.averageTime")}</span>
              <strong className="stat-value">{averageTime}</strong>
              <p className="stat-note">{t("accueil.fastGames")}</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("accueil.activePlayers")}</span>
              <strong className="stat-value">{activePlayers >= 0 ? `+${activePlayers}` : activePlayers}</strong>
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
      <LoginModal isOpen={isOpen} action={setUser} onClose={closeLogin} afterLogin={() => navigate('/leaderboard', { replace: true })} openRegister={openRegister} />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} afterRegister={(u) => { setUser(u); navigate('/account', { replace: true }); }} />
      
      {/* Advertising popup for shop */}
      {showAdPopup && (
        <div className="ad-popup-overlay" onClick={closeAdPopup}>
          <div className="ad-popup-card" onClick={(e) => e.stopPropagation()}>
            <button className="ad-close" onClick={closeAdPopup}>✕</button>
            <div className="ad-content">
              <div className="ad-badge">OFFRE EXCLUSIVE</div>
              <h2 className="ad-title">-70% sur tous les articles !</h2>
              <p className="ad-desc">Profitez de nos lootboxes mystères et packs exclusifs. Offre limitée !</p>
              <div className="ad-timer">Plus que quelques heures !</div>
              <button className="btn primary ad-cta" onClick={goToShop}>
                🛒 VOIR LA BOUTIQUE
              </button>
              <button className="btn ghost ad-later" onClick={closeAdPopup}>
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accueil;

// PropTypes validation pour le composant Accueil
Accueil.propTypes = {
  user: PropTypes.string,
  setUser: PropTypes.func.isRequired,
};

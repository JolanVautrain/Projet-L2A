import "../css/Index.css";
import "../css/PageNotFound.css";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./Language.jsx";

/**
 * Composant PageNotFound
 * 
 * Affiche une page 404 personnalisée avec animation interactive.
 */
function PageNotFound() {
  // Refs et états pour l'animation des yeux et la synthèse vocale
  const leftPupil = useRef(null);
  const rightPupil = useRef(null);
  const eyesDataRef = useRef([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [pitch] = useState(1);
  const [rate] = useState(1);
  const [speakingId, setSpeakingId] = useState(null);
  const [clickedId, setClickedId] = useState(null);
  const { t, language } = useLanguage();

  // Textes parlés par les différentes figures
  const speeches = {
    main: t("pageNotFound.speechMain"),
    one: t("pageNotFound.speechOne"),
    two: t("pageNotFound.speechTwo"),
    three: t("pageNotFound.speechThree"),
  };

  // Animation des yeux qui suivent le curseur
  useEffect(() => {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let rafId = null;
    // mise à jour des coordonnées cibles au mouvement de la souris
    function onMove(e) {
      targetX = e.clientX;
      targetY = e.clientY;
    }

    // collecte des éléments "œil" et de leurs pupilles
    function gatherEyes() {
      const container = document.querySelector(".follow-geom");
      if (!container) return;
      const eyeEls = container.querySelectorAll(".eye");
      eyesDataRef.current = Array.from(eyeEls).map((eyeEl) => {
        const pupilEl = eyeEl.querySelector('.pupil');
        return { eyeEl, pupilEl, center: { x: 0, y: 0 } };
      });
    }

    /**
     * Composant PageNotFound
     * 
     * Met à jour les centres des yeux pour le calcul des mouvements des pupilles.
     */
    function updateEyeCenters() {
      // calcule les centres des yeux (lecture du layout)
      if (!eyesDataRef.current || eyesDataRef.current.length === 0) return;
      eyesDataRef.current.forEach((entry) => {
        const r = entry.eyeEl.getBoundingClientRect();
        entry.center.x = r.left + r.width / 2;
        entry.center.y = r.top + r.height / 2;
      });
    }

    /**
     * Composant PageNotFound
     * 
     * Anime les pupilles pour qu'elles suivent la position cible.
     */
    function animate() {
      const max = 10; // max déplacement en pixels
      eyesDataRef.current.forEach(({ pupilEl: el, center }) => {
        if (!el || !center) return;
        const dx = targetX - center.x;
        const dy = targetY - center.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = (dx / dist) * Math.min(max, dist / 6);
        const ny = (dy / dist) * Math.min(max, dist / 6);
        // utilisation de translate3d pour de meilleures performances
        el.style.transform = `translate3d(${nx}px, ${ny}px, 0) translate3d(-50%, -50%, 0)`;
      });
      rafId = requestAnimationFrame(animate);
    }
    // initialisation
    gatherEyes();
    updateEyeCenters();
    // écouteurs d'événements
    globalThis.addEventListener("mousemove", onMove, { passive: true });
    globalThis.addEventListener("resize", updateEyeCenters, { passive: true });
    globalThis.addEventListener("scroll", updateEyeCenters, { passive: true });
    // démarrage de l'animation
    rafId = globalThis.requestAnimationFrame(animate);
    return () => { // nettoyage des écouteurs et de l'animation
      globalThis.removeEventListener("mousemove", onMove);
      globalThis.removeEventListener("resize", updateEyeCenters);
      globalThis.removeEventListener("scroll", updateEyeCenters);
      globalThis.cancelAnimationFrame(rafId);
    };
  }, []);
  // Chargement des voix disponibles pour la synthèse vocale
  useEffect(() => {
    if (typeof globalThis === "undefined" || !("speechSynthesis" in globalThis)) return;
    // fonction de chargement des voix
    function loadVoices() {
      const vs = globalThis.speechSynthesis.getVoices() || [];
      setVoices(vs);
      if (vs.length && !selectedVoice) {
        const pref = vs.find((v) => /fr/i.test(v.lang) && !/Microsoft/i.test(v.name));
        setSelectedVoice(pref ? pref.name : vs[0].name);
      }
    }
    // initial les voix
    loadVoices();
    globalThis.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { globalThis.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoice]);

  /**
   * Composant PageNotFound
   * 
   * Fait parler la synthèse vocale avec le texte associé à l'ID donné.
   */
  function handleSpeak(id = "main") {
    const text = speeches[id] || speeches.main;
    if (typeof globalThis !== "undefined" && "speechSynthesis" in globalThis) {
      globalThis.speechSynthesis.cancel();
      const ut = new globalThis.SpeechSynthesisUtterance(text);
      ut.lang = language === 'en' ? "en-US" : "fr-FR";
      // configuration de la voix
      const v = voices.find((x) => x.name === selectedVoice);
      if (v) ut.voice = v;
      ut.pitch = Math.max(0.1, Math.min(2, pitch));
      ut.rate = Math.max(0.1, Math.min(10, rate));
      globalThis.speechSynthesis.speak(ut);
    } else {
      // fallback : simple alert
      alert(text);
    }
  }
  
  /**
   * Composant PageNotFound
   * 
   * Gère le clic sur une figure géométrique pour déclencher la parole et l'animation.
   */
  function handleClickGeom(id = "main") {
    setClickedId(id);
    setSpeakingId(id);
    handleSpeak(id);
    setTimeout(() => setClickedId(null), 400);
    setTimeout(() => setSpeakingId(null), 1800);
  }

  /**
   * Composant PageNotFound
   * 
   * Gère la pression d'une touche sur une figure géométrique pour déclencher la parole et l'animation.
   * 
   * @param {*} e  événement clavier
   * @param {*} id  ID de la figure géométrique
   */
  function handleKeyGeom(e, id = "main") {
    if (e.key === "Enter" || e.key === " ") {
      handleClickGeom(id);
    }
  }
  // Rendu du composant PageNotFound
  return (
    <main className="pnf-wrap">
      <section className="pnf-card">
        <div className="follow-geom">
          <button
            type="button"
            className={`shape ${clickedId === "main" ? "clicked" : ""}`}
            aria-pressed={clickedId === "main"}
            aria-label={t("pageNotFound.interactiveCharacter")}
            onClick={() => handleClickGeom("main")}
            onKeyDown={(e) => handleKeyGeom(e, "main")}
          >
            <div className="eye left-eye"><span className="pupil" ref={leftPupil} /></div>
            <div className="eye right-eye"><span className="pupil" ref={rightPupil} /></div>
            {speakingId === "main" && (
              <div className="speech-bubble" aria-live="assertive">{speeches.main}</div>
            )}
          </button>
          {/* trois figures géométriques */}
          <button
            type="button"
            className={`mini-shape one size-sm c1 ${clickedId === "one" ? "clicked" : ""}`}
            aria-pressed={clickedId === "one"}
            aria-label={t("pageNotFound.secondaryFigure")}
            onClick={() => handleClickGeom("one")}
            onKeyDown={(e) => handleKeyGeom(e, "one")}
          >
            <div className="eye"><span className="pupil" /></div>
            <div className="eye"><span className="pupil" /></div>
            {speakingId === "one" && (
              <div className="speech-bubble" aria-live="assertive">{speeches.one}</div>
            )}
          </button>
          <button
            type="button"
            className={`mini-shape two size-xs c2 ${clickedId === "two" ? "clicked" : ""}`}
            aria-pressed={clickedId === "two"}
            aria-label={t("pageNotFound.secondaryFigure")}
            onClick={() => handleClickGeom("two")}
            onKeyDown={(e) => handleKeyGeom(e, "two")}
          >
            <div className="eye"><span className="pupil" /></div>
            <div className="eye"><span className="pupil" /></div>
            {speakingId === "two" && (
              <div className="speech-bubble" aria-live="assertive">{speeches.two}</div>
            )}
          </button>
          <button
            type="button"
            className={`mini-shape three size-md c3 ${clickedId === "three" ? "clicked" : ""}`}
            aria-pressed={clickedId === "three"}
            aria-label={t("pageNotFound.secondaryFigure")}
            onClick={() => handleClickGeom("three")}
            onKeyDown={(e) => handleKeyGeom(e, "three")}
          >
            <div className="eye"><span className="pupil" /></div>
            <div className="eye"><span className="pupil" /></div>
            {speakingId === "three" && (
              <div className="speech-bubble" aria-live="assertive">{speeches.three}</div>
            )}
          </button>
        </div>
        <div className="pnf-illus" aria-hidden>
          <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="208" height="148" rx="12" fill="#071227" stroke="#18304a"/>
            <g transform="translate(20,26)">
              <circle cx="40" cy="40" r="28" fill="#0ea5e9" opacity="0.12"/>
              <path d="M100 18c-10 0-18 8-18 18v20c0 10 8 18 18 18s18-8 18-18V36c0-10-8-18-18-18z" fill="#66e3b8" opacity="0.18"/>
              <g transform="translate(0,80)" fill="#9fb2ff" opacity="0.9">
                <rect x="0" y="0" width="160" height="8" rx="4" />
              </g>
            </g>
          </svg>
        </div>
        <div className="pnf-content">
          <h1 className="pnf-title">{t("pageNotFound.title")}</h1>
          <p className="pnf-sub">{t("pageNotFound.subtitle")}</p>
          <div className="pnf-actions">
            <Link to="/" className="btn primary">{t("pageNotFound.returnHome")}</Link>
            <Link to="/accueil" className="btn ghost">{t("pageNotFound.seeHome")}</Link>
          </div>
          <p className="pnf-hint">{t("pageNotFound.hint")}</p>
        </div>
      </section>
    </main>
  );
}

export default PageNotFound;

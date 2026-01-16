import "../css/index.css";
import "../css/PageNotFound.css";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

function PageNotFound() {
  const leftPupil = useRef(null);
  const rightPupil = useRef(null);
  const eyesDataRef = useRef([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [speakingId, setSpeakingId] = useState(null);
  const [clickedId, setClickedId] = useState(null);
  const speeches = {
    main: "Halte qui va là",
    one: "Qui va là ? Montrez-vous !",
    two: "Attention — accès réservé !",
    three: "Énoncez votre identité immédiatement !",
  };

  useEffect(() => {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let rafId = null;

    function onMove(e) {
      // only record target, do minimal work in event handler
      targetX = e.clientX;
      targetY = e.clientY;
    }

    function gatherEyes() {
      const container = document.querySelector(".follow-geom");
      if (!container) return;
      const eyeEls = container.querySelectorAll(".eye");
      eyesDataRef.current = Array.from(eyeEls).map((eyeEl) => {
        const pupilEl = eyeEl.querySelector('.pupil');
        return { eyeEl, pupilEl, center: { x: 0, y: 0 } };
      });
    }

    function updateEyeCenters() {
      // compute eye centers for all eyes once (called on mount/resize/scroll)
      if (!eyesDataRef.current || eyesDataRef.current.length === 0) return;
      eyesDataRef.current.forEach((entry) => {
        const r = entry.eyeEl.getBoundingClientRect();
        entry.center.x = r.left + r.width / 2;
        entry.center.y = r.top + r.height / 2;
      });
    }

    function animate() {
      // update pupils using cached centers (no layout reads here)
      const max = 10; // max pupil offset
      eyesDataRef.current.forEach(({ pupilEl: el, center }) => {
        if (!el || !center) return;
        const dx = targetX - center.x;
        const dy = targetY - center.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = (dx / dist) * Math.min(max, dist / 6);
        const ny = (dy / dist) * Math.min(max, dist / 6);
        // use translate3d for GPU acceleration and preserve centering
        el.style.transform = `translate3d(${nx}px, ${ny}px, 0) translate3d(-50%, -50%, 0)`;
      });

      rafId = requestAnimationFrame(animate);
    }

    // gather eye elements and initial centers
    gatherEyes();
    updateEyeCenters();

    // passive listeners to avoid main-thread blocking
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", updateEyeCenters, { passive: true });
    window.addEventListener("scroll", updateEyeCenters, { passive: true });

    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", updateEyeCenters);
      window.removeEventListener("scroll", updateEyeCenters);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function loadVoices() {
      const vs = window.speechSynthesis.getVoices() || [];
      setVoices(vs);
      if (vs.length && !selectedVoice) {
        // prefer a French voice that is not a Microsoft robotic voice
        const pref = vs.find((v) => /fr/i.test(v.lang) && !/Microsoft/i.test(v.name));
        setSelectedVoice(pref ? pref.name : vs[0].name);
      }
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { try { window.speechSynthesis.onvoiceschanged = null; } catch (e) {} };
  }, [selectedVoice]);

  function handleSpeak(id = "main") {
    const text = speeches[id] || speeches.main;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = "fr-FR";
        // apply chosen voice, pitch and rate
        const v = voices.find((x) => x.name === selectedVoice);
        if (v) ut.voice = v;
        ut.pitch = Math.max(0.1, Math.min(2, pitch));
        ut.rate = Math.max(0.1, Math.min(10, rate));
        window.speechSynthesis.speak(ut);
      } catch (e) {
        // fallback
        // eslint-disable-next-line no-alert
        alert(text);
      }
    } else {
      // eslint-disable-next-line no-alert
      alert(text);
    }
  }

  function handleTestVoice() {
    const sample = "Ceci est un test de voix.";
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(sample);
        ut.lang = "fr-FR";
        const v = voices.find((x) => x.name === selectedVoice);
        if (v) ut.voice = v;
        ut.pitch = Math.max(0.1, Math.min(2, pitch));
        ut.rate = Math.max(0.1, Math.min(10, rate));
        window.speechSynthesis.speak(ut);
      } catch (e) {
        // eslint-disable-next-line no-alert
        alert(sample);
      }
    } else {
      // eslint-disable-next-line no-alert
      alert(sample);
    }
  }

  function applyGravePreset() {
    // attempt to pick a deep French voice and set pitch/rate to a grave timbre
    const pref = voices.find((v) => /fr/i.test(v.lang) && /male|homme|garçon|antoine|thomas|quentin|antoine/i.test(v.name)) || voices.find((v) => /fr/i.test(v.lang));
    if (pref) setSelectedVoice(pref.name);
    setPitch(0.8);
    setRate(0.95);
    // inform user about limitations
    // eslint-disable-next-line no-alert
    alert("Remarque : ceci est une approximation du timbre grave, pas une imitation exacte d'une personne réelle.");
  }

  function handleClickGeom(id = "main") {
    setClickedId(id);
    setSpeakingId(id);
    handleSpeak(id);
    setTimeout(() => setClickedId(null), 400);
    setTimeout(() => setSpeakingId(null), 1800);
  }

  function handleKeyGeom(e, id = "main") {
    if (e.key === "Enter" || e.key === " ") {
      handleClickGeom(id);
    }
  }

  return (
    <main className="pnf-wrap">
      <section className="pnf-card">
        <div className="follow-geom">
          <button
            type="button"
            className={`shape ${clickedId === "main" ? "clicked" : ""}`}
            aria-pressed={clickedId === "main"}
            aria-label="Personnage interactif — appuyez pour entendre un message"
            onClick={() => handleClickGeom("main")}
            onKeyDown={(e) => handleKeyGeom(e, "main")}
          >
            <div className="eye left-eye"><span className="pupil" ref={leftPupil} /></div>
            <div className="eye right-eye"><span className="pupil" ref={rightPupil} /></div>
            {speakingId === "main" && (
              <div className="speech-bubble" aria-live="assertive">{speeches.main}</div>
            )}
          </button>

          {/* three smaller decorative shapes (non-interactive) */}
          <button
            type="button"
            className={`mini-shape one size-sm c1 ${clickedId === "one" ? "clicked" : ""}`}
            aria-pressed={clickedId === "one"}
            aria-label="Figure secondaire — appuyez pour entendre un message"
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
            aria-label="Figure secondaire — appuyez pour entendre un message"
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
            aria-label="Figure secondaire — appuyez pour entendre un message"
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
          <h1 className="pnf-title">404 — Page introuvable</h1>
          <p className="pnf-sub">Oups — cette page a pris un raccourci vers l'inconnu.
            Revenons sur des terres connues.</p>

          <div className="pnf-actions">
            <Link to="/" className="btn primary">Retour à l'accueil</Link>
            <Link to="/accueil" className="btn ghost">Voir l'accueil</Link>
          </div>

          <p className="pnf-hint">Astuce : essayez de vérifier l'URL ou revenez en arrière.</p>
        </div>
      </section>
    </main>
  );
}

export default PageNotFound;

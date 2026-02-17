import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalGameOver from "./modals/ModalGameOver.jsx";
import { useLanguage } from "../autres/Language.jsx";

// Import des modules de jeu
import {
  initDayNightSystem,
  updateDayNightCycle,
  resetDayNight,
  initWeatherSystem,
  updateWeatherSystem,
  addNightStars,
  isNight,
  getTimeOfDay,
  getSunProgress,
  getMoonProgress,
} from "./utils/GameDayNight.js";
import {
  createBackgroundSystem,
  updateBackgroundParallax,
  updateStarsVisibility,
  updateSkyGradient,
} from "./utils/GameBackground.js";
import {
  initObstacles,
  spawnObstacle,
  recycleObstacles,
  updateStage,
  getStage,
  resetObstacles,
  getObstacles,
} from "./utils/GameObstacles.js";
import {
  initPhysics,
  handleJump,
  toggleInvincible,
  getInvincibility,
  getPlayer,
  resetPhysicsState,
  setupCollisions,
} from "./utils/GamePhysics.js";
import {
  initControls,
  isJumpRequested,
} from "./utils/GameControls.js";
import {
  calculateXPReward,
  checkAchievements,
} from "./utils/GameGamification.js";
import {
  initParticles,
  updateParticles,
  createExplosion,
  createScorePopup,
  createElectricSpark,
  createDustCloud,
  createShockWave,
} from "./utils/GameParticles.js";
import {
  initEnhancements,
  createImpactEffect,
  addVignette,
  createEnergyAura,
} from "./utils/GameEnhancements.js";
import { getActiveUser } from "../utils/userSession.js";

// État du jeu
let score = 0;
let gameOver = false;
let currentSessionId = null;
let processingDeath = false;
let sessionPosted = false;
let showGameOverModalCallback = null;
let gameScene = null;

/**
 * Précharge les assets Phaser
 */
function preload() {
  this.load.image("ground", "/assets/platform.png");
  this.load.image("obstacle", "/assets/bomb.png");
  this.load.spritesheet("dude", "/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48,
  });
}

/**
 * Initialise la scène de jeu
 */
function create() {
  gameScene = this;

  // IMPORTANT: Initialiser le timer de la partie
  this.startTime = Date.now();

  score = 0;
  gameOver = false;
  currentSessionId = Math.random().toString(36).slice(2);
  sessionPosted = false;
  processingDeath = false;

  globalThis.getPhaserScene = () => this;

  // Initialiser tous les systèmes
  initDayNightSystem(this);
  initWeatherSystem(this);
  createBackgroundSystem(this);
  initPhysics(this);
  initObstacles(this);
  initControls(this, handleAdminInvincible);
  initParticles(this);
  initEnhancements(this);
  addVignette(this);
  addNightStars(this); // Étoiles visibles dès le départ

  setupCollisions(this);

  // Ajouter la collision avec les obstacles
  this.physics.add.overlap(
    getPlayer(),
    getObstacles(),
    handleObstacleCollision
  );

  // Spawn first obstacle
  spawnObstacle(this);
}

/**
 * Met à jour la scène à chaque frame
 */
function update() {
  if (!gameScene || gameOver) return;

  const player = getPlayer();

  if (!player) return;

  // Mettre à jour les systèmes
  updateBackgroundParallax();
  updateDayNightCycle(gameScene);
  updateWeatherSystem(gameScene);
  updateParticles(this.game.loop.delta / 1000); // Convertir en secondes

  // Mettre à jour la visibilité des étoiles et le dégradé du ciel
  const nightTime = isNight();
  updateStarsVisibility(nightTime, gameScene);

  // Mettre à jour le dégradé du ciel selon l'heure
  const timeOfDay = getTimeOfDay();
  const sunProg = getSunProgress();
  const moonProg = getMoonProgress();
  updateSkyGradient(timeOfDay, sunProg, moonProg);

  // Gérer le saut
  if (isJumpRequested()) {
    handleJump(() => {
        // Effet de particules au saut
        createDustCloud(gameScene, player.x, player.y + 25, 0x00ffff);
    });
  }

  // Augmenter le stage tous les 100 points
  const newStage = Math.floor((score + 10) / 100) + 1;
  if (newStage !== getStage()) {
    updateStage(newStage);
    createScorePopup(gameScene, 400, 100, `Stage ${newStage}`);
    globalThis.dispatchEvent(new CustomEvent("stage-up", { detail: newStage }));
  }

  // Recycler les obstacles et compter les points
  recycleObstacles(gameScene, () => {
    score += 10;
    createScorePopup(gameScene, 400, 150, "+10");
    globalThis.dispatchEvent(new CustomEvent("score-up", { detail: score }));
  });

  // Mettre à jour et spawner les obstacles
  spawnObstacle(gameScene);
}

/**
 * Gère les collisions avec les obstacles
 */
function handleObstacleCollision(_player, _obstacle) {
  const { isInvincible } = getInvincibility();
  const username = getActiveUser()

  // Si mode invincible (admin), ne pas mourir
  if (isInvincible) {
    // Créer une explosion au point d'impact
    createExplosion(gameScene, _obstacle.x, _obstacle.y, 0xff00ff);
    createElectricSpark(gameScene, _obstacle.x, _obstacle.y);
    createShockWave(gameScene, _obstacle.x, _obstacle.y + 30);
    createImpactEffect(gameScene, _obstacle.x, _obstacle.y + 30);
    createEnergyAura(gameScene, _obstacle.x, _obstacle.y, 0x00ffff);
    createScorePopup(gameScene, _obstacle.x, _obstacle.y, "INVINCIBLE");
    _obstacle.destroy();
    return;
  }

  // Créer une explosion rouge à la mort avec effets supplémentaires
  createExplosion(gameScene, _obstacle.x, _obstacle.y, 0xff0000);
  createDustCloud(gameScene, _obstacle.x, _obstacle.y, 0xff0000);
  createShockWave(gameScene, _obstacle.x, _obstacle.y + 30);
  createImpactEffect(gameScene, _obstacle.x, _obstacle.y + 30);

  if (processingDeath) return;
  processingDeath = true;

  gameOver = true;
  const finalScore = score;
  const timerSeconds = Math.floor(
    (Date.now() - (gameScene ? gameScene.startTime : Date.now())) / 1000
  );

  if (currentSessionId && !sessionPosted) {
    sessionPosted = true;

    if (username) {
      fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          score: finalScore,
          stage: getStage(),
          timer: timerSeconds,
          state: "Solo"
        }),
      })
        .then((r) => r.json())
        .then(() => {
          try {
            // Utiliser le nouveau système d'XP amélioré
            const xpAmount = calculateXPReward(
              finalScore,
              getStage(),
              timerSeconds
            );

            // Vérifier les achievements
            const userAchievementsStr =
              localStorage.getItem("userAchievements");
            const userAchievements = userAchievementsStr
              ? JSON.parse(userAchievementsStr)
              : [];
            const newAchievements = checkAchievements(
              finalScore,
              getStage(),
              timerSeconds,
              userAchievements
            );

            // Sauvegarder les nouveaux achievements
            if (newAchievements.length > 0) {
              const updatedAchievements = [
                ...userAchievements,
                ...newAchievements,
              ];
              localStorage.setItem(
                "userAchievements",
                JSON.stringify(updatedAchievements)
              );
            }

            fetch("/api/user/xp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, xp: xpAmount }),
            })
              .then((r) => r.json())
              .catch((err) => console.warn("Failed to award XP", err));
          } catch (e) {
            console.warn("Error while awarding XP", e);
          }
        })
        .catch((err) => console.warn("Failed to submit score", err));
    }
  }

  if (showGameOverModalCallback) {
    showGameOverModalCallback();
  }
}

/**
 * Gère le raccourci clavier admin pour l'invincibilité
 */
function handleAdminInvincible() {
  const { isAdminMode } = getInvincibility();
  if (isAdminMode) {
    toggleInvincible();
  }
}

/**
 * Réinitialise le jeu
 */
function resetGameState() {
  processingDeath = false;
  score = 0;

  resetPhysicsState();
  resetObstacles();
  resetDayNight();

  // Respawner les obstacles
  try {
    for (let i = 0; i < 3; i++) {
      spawnObstacle(gameScene);
    }
  } catch (e) {
    console.warn("Error spawning obstacles during reset", e);
  }

  gameOver = false;
  sessionPosted = false;
}

/**
 * Composant React GameSolo
 */
function GameSolo() {
  const gameContainer = useRef(null);
  const [stage, setStage] = useState(1);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleReplay = () => {
    setShowGameOverModal(false);
    try {
      gameScene.scene.resume();
    } catch (e) {
      console.warn("Failed to resume scene", e);
    }
    setScoreDisplay(0);
    setStage(1);
    setTimerSeconds(0);
    resetGameState();
  };

  const handleReturnHome = async () => {
    setShowGameOverModal(false);
    try {
      gameScene.scene.resume();
    } catch (e) {
      console.warn("Failed to resume scene", e);
    }
    navigate("/");
  };

  useEffect(() => {
    showGameOverModalCallback = () => {
      try {
        gameScene.scene.pause();
      } catch (e) {
        console.warn("Failed to pause scene", e);
      }
      setShowGameOverModal(true);
    };
  }, []);

  useEffect(() => {
    globalThis.dispatchEvent(new CustomEvent("score-up", { detail: score }));
  }, []);

  useEffect(() => {
    const handleScoreUp = (e) => {
      setScoreDisplay(e.detail);
    };
    const handleStageUp = (e) => {
      setStage(e.detail);
    };

    globalThis.addEventListener("score-up", handleScoreUp);
    globalThis.addEventListener("stage-up", handleStageUp);

    return () => {
      globalThis.removeEventListener("score-up", handleScoreUp);
      globalThis.removeEventListener("stage-up", handleStageUp);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver) {
        setTimerSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.FIT,
        parent: gameContainer.current,
        width: 800,
        height: 600,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 300 },
          debug: false,
        },
      },
      scene: {
        preload,
        create,
        update,
      },
    };

    const phaserGame = new Phaser.Game(config);

    return () => {
      phaserGame.destroy(true);
    };
  }, []);

  return (
    <div className="game-wrap">
      <div className="phaser-container" ref={gameContainer} />

      <div className="game-overlay">
        <div className="game-info">
          <div className="info-item">
            <span className="info-label">{t("game.score")}</span>
            <span className="info-value">{scoreDisplay}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t("game.stage")}</span>
            <span className="info-value">{stage}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t("game.timer")}</span>
            <span className="info-value">{timerSeconds}s</span>
          </div>
        </div>
      </div>

      {showGameOverModal && (
        <ModalGameOver
          isOpen={true}
          score={scoreDisplay}
          stage={stage}
          timerSeconds={timerSeconds}
          onReplay={handleReplay}
          onReturnHome={handleReturnHome}
        />
      )}
    </div>
  );
}

export default GameSolo;

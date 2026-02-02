import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalGameOver from "./modals/ModalGameOver.jsx";
import { useLanguage } from "../autres/Language.jsx";
import "../../static/css/Index.css";
import "../../static/css/Game.css";

// État du jeu (module global pour persister entre les rendus)
let score = 0;
let gameOver = false;
let touchingGround = false;
let internalStage = 1;
let startTime = 0;
let currentSessionId = null; // ID unique de session pour chaque partie
let processingDeath = false; // Flag pour éviter les appels dupliqués à hitBomb()
let sessionPosted = false; // Flag pour garantir qu'une seule requête POST par session
let showGameOverModalCallback = null; // Callback pour afficher la modal Game Over

// Variables pour le système jour/nuit et arrière-plans
let skyTint = null; // Pour teinter le ciel
let sunSprite = null; // Sprite du soleil
let moonSprite = null; // Sprite de la lune
let backgroundLayers = []; // Calques d'arrière-plan pour le parallax
let isNightTime = false; // Indicateur jour/nuit
let nightLights = []; // Lumières nocturnes (ville, feux de camp)

/**
 * Précharge les assets Phaser.
 *
 * @return {void}
 */
function preload() {
  this.load.image("sky", "src/static/assets/sky.png");
  this.load.image("ground", "src/static/assets/platform.png");
  this.load.image("obstacle", "src/static/assets/bomb.png");
  this.load.spritesheet("dude", "src/static/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48,
  });
  
  // Charger l'étoile pour le soleil et la lune (on réutilise l'asset existant)
  this.load.image("star", "src/static/assets/star.png");
}

/**
 * Crée le système d'arrière-plan avec plusieurs calques de parallax
 * et les éléments célestes (soleil/lune)
 */
function createBackgroundSystem(scene) {
  // Fond de ciel - calque le plus éloigné
  skyTint = scene.add.rectangle(400, 300, 800, 600, 0x87ceeb);
  skyTint.setDepth(-100);
  
  // Créer le soleil (commence en position levant)
  sunSprite = scene.add.circle(100, 150, 30, 0xffff00);
  sunSprite.setDepth(-90);
  
  // Créer la lune (invisible au début)
  moonSprite = scene.add.circle(100, 150, 25, 0xf0f0f0);
  moonSprite.setDepth(-90);
  moonSprite.setAlpha(0);
  
  // Créer les calques d'arrière-plan avec différents biomes
  backgroundLayers = [];
  nightLights = [];
  
  // Calque 1: Montagnes lointaines (les plus lentes)
  const mountains = createMountains(scene);
  backgroundLayers.push({ graphics: mountains, speed: 0.2, type: 'mountains' });
  
  // Calque 2: Arbres/Forêt (vitesse moyenne)
  const trees = createTrees(scene);
  backgroundLayers.push({ graphics: trees, speed: 0.5, type: 'trees' });
  
  // Calque 3: Bâtiments/Ville (plus rapide)
  const buildings = createBuildings(scene);
  backgroundLayers.push({ graphics: buildings, speed: 0.8, type: 'buildings' });
}

/**
 * Crée des montagnes stylisées en arrière-plan
 */
function createMountains(scene) {
  const graphics = scene.add.graphics();
  graphics.setDepth(-80);
  
  for (let i = 0; i < 3; i++) {
    const x = i * 400;
    graphics.fillStyle(0x8b7355, 1);
    graphics.fillTriangle(x, 400, x + 200, 150, x + 400, 400);
    graphics.fillTriangle(x + 800, 400, x + 1000, 150, x + 1200, 400);
  }
  
  return graphics;
}

/**
 * Crée des arbres pour représenter une forêt
 */
function createTrees(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-70);
  
  for (let i = 0; i < 15; i++) {
    const x = i * 80;
    const tree = scene.add.graphics();
    
    // Tronc
    tree.fillStyle(0x8b4513, 1);
    tree.fillRect(x + 35, 380, 10, 40);
    
    // Feuillage
    tree.fillStyle(0x228b22, 1);
    tree.fillTriangle(x + 20, 390, x + 40, 350, x + 60, 390);
    tree.fillTriangle(x + 20, 370, x + 40, 330, x + 60, 370);
    
    container.add(tree);
    
    // Ajouter un point pour le feu de camp (invisible par défaut)
    if (i % 3 === 0) {
      const campfire = scene.add.circle(x + 40, 410, 5, 0xff6600);
      campfire.setAlpha(0);
      container.add(campfire);
      nightLights.push({ sprite: campfire, type: 'campfire' });
    }
  }
  
  return container;
}

/**
 * Crée des bâtiments pour représenter une ville
 */
function createBuildings(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-60);
  
  for (let i = 0; i < 10; i++) {
    const x = i * 120;
    const height = 80 + Math.random() * 80;
    const building = scene.add.graphics();
    
    // Bâtiment
    building.fillStyle(0x808080, 1);
    building.fillRect(x + 20, 420 - height, 80, height);
    
    // Fenêtres (lumières nocturnes)
    for (let row = 0; row < Math.floor(height / 20); row++) {
      for (let col = 0; col < 3; col++) {
        const window = scene.add.rectangle(
          x + 30 + col * 20,
          430 - height + row * 20,
          10, 10,
          0xffff99
        );
        window.setAlpha(0);
        container.add(window);
        nightLights.push({ sprite: window, type: 'window' });
      }
    }
    
    container.add(building);
  }
  
  return container;
}

/**
 * Met à jour le cycle jour/nuit en fonction du stage
 */
function updateDayNightCycle(scene) {
  // Stage 1-2: Lever du soleil (aurore)
  // Stage 3: Coucher du soleil (crépuscule)
  // Stage 4-5: Nuit avec lune montante
  // Stage 6: Lune descendante
  // Stage 7+: Cycle se répète
  
  const cycleStage = ((internalStage - 1) % 6) + 1;
  
  if (cycleStage <= 2) {
    // Jour - Lever du soleil
    isNightTime = false;
    const progress = cycleStage === 1 ? 0 : 0.5;
    
    // Couleur du ciel: bleu clair
    skyTint.fillColor = 0x87ceeb;
    
    // Position du soleil (monte progressivement)
    sunSprite.setPosition(100 + progress * 300, 150 - progress * 50);
    sunSprite.setAlpha(1);
    moonSprite.setAlpha(0);
    
    // Éteindre les lumières nocturnes
    nightLights.forEach(light => light.sprite.setAlpha(0));
    
  } else if (cycleStage === 3) {
    // Coucher du soleil
    isNightTime = false;
    
    // Couleur du ciel: orange/rouge
    skyTint.fillColor = 0xff6347;
    
    // Soleil descend
    sunSprite.setPosition(600, 200);
    sunSprite.setAlpha(0.8);
    moonSprite.setAlpha(0);
    
  } else if (cycleStage >= 4) {
    // Nuit
    isNightTime = true;
    const nightProgress = (cycleStage - 4) / 2;
    
    // Couleur du ciel: bleu foncé/noir
    skyTint.fillColor = 0x191970;
    
    // Lune visible, soleil caché
    sunSprite.setAlpha(0);
    moonSprite.setAlpha(1);
    
    // Position de la lune
    if (cycleStage === 4 || cycleStage === 5) {
      moonSprite.setPosition(100 + nightProgress * 300, 150 - nightProgress * 30);
    } else {
      moonSprite.setPosition(600, 200);
    }
    
    // Allumer les lumières nocturnes
    nightLights.forEach(light => {
      if (light.type === 'window' || light.type === 'campfire') {
        // Effet scintillant
        light.sprite.setAlpha(0.6 + Math.random() * 0.4);
      }
    });
  }
}

/**
 * Fait défiler les calques d'arrière-plan avec effet parallax
 */
function updateBackgroundParallax() {
  backgroundLayers.forEach(layer => {
    if (layer.graphics.x !== undefined) {
      layer.graphics.x -= layer.speed;
      
      // Réinitialiser la position pour créer un défilement infini
      if (layer.graphics.x <= -800) {
        layer.graphics.x = 0;
      }
    }
  });
}

/**
 * Initialise la scène de jeu Phaser.
 *
 * @return {void}
 */
function create() {
  startTime = Date.now();
  currentSessionId = Math.random().toString(36).slice(2);
  sessionPosted = false;
  isNightTime = false;

  globalThis.getPhaserScene = () => this;

  // Créer un système d'arrière-plan dynamique avec plusieurs calques
  createBackgroundSystem(this);

  // Ground
  globalThis.platforms = this.physics.add.staticGroup();
  globalThis.platforms.create(400, 568, "ground").setScale(2).refreshBody();

  // Player
  globalThis.player = this.physics.add.sprite(120, 450, "dude");
  globalThis.player.setCollideWorldBounds(true);
  globalThis.player.setBounce(0);

  this.anims.create({
    key: "run",
    frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "idle",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20,
  });

  globalThis.player.anims.play("run");

  // Obstacles
  globalThis.obstacles = this.physics.add.group();

  // Controls
  globalThis.cursors = this.input.keyboard.createCursorKeys();

  // Collisions
  this.physics.add.collider(
    globalThis.player,
    globalThis.platforms,
    touchGround
  );
  this.physics.add.collider(globalThis.player, globalThis.obstacles, hitBomb);

  // Spawn first obstacle
  spawnObstacle(this);
}

/**
 * Met à jour la logique du jeu à chaque frame.
 *
 * @return {void}
 */
function update() {
  const username = localStorage.getItem("user");
  const player = globalThis.player;
  const cursors = globalThis.cursors;

  if (!player || gameOver) return;
  
  // Mettre à jour l'arrière-plan avec effet parallax
  updateBackgroundParallax();
  
  // Mettre à jour le cycle jour/nuit
  const scene = globalThis.getPhaserScene?.();
  if (scene) {
    updateDayNightCycle(scene);
  }

  // Jump
  if ((cursors.space.isDown || cursors.up.isDown) && touchingGround) {
    player.setVelocityY(-500);
    touchingGround = false;
    try {
      fetch("/api/game/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, input: "JUMP", date: Date.now() }),
      });
    } catch (e) {
      console.warn("Error while stocking inputs", e);
    }
  }

  // Stage increases every 100 points
  const newStage = Math.floor((score + 10) / 100) + 1;
  if (newStage !== internalStage) {
    internalStage = newStage;
    globalThis.dispatchEvent(
      new CustomEvent("stage-up", { detail: internalStage })
    );
  }

  // Recycle obstacles
  globalThis.obstacles.children.iterate((o) => {
    if (o.x < -50) {
      o.destroy();
      spawnObstacle(this);
      // Score & difficulty
      score += 10;
      globalThis.dispatchEvent(new CustomEvent("score-up", { detail: score }));
    }
  });
}

/**
 * Réinitialise les objets du jeu lors du game over.
 */
function resetGameObjects() {
  processingDeath = false; // Réinitialiser le flag pour permettre un nouvel appel à hitBomb()
  score = 0; // Réinitialiser le score pour la nouvelle partie
  internalStage = 1; // Réinitialiser la stage pour la nouvelle partie
  isNightTime = false; // Réinitialiser à jour
  
  // fait apparaitre des bombes initiales en fonction du stage
  try {
    globalThis.obstacles.children.iterate((o) => {
      o.destroy();
      spawnObstacle(globalThis.getPhaserScene());
    });
  } catch (e) {
    console.warn("spawnObstacle unavailable during reset", e);
  }
  // réinitialiser le minuteur lorsque les objets sont réinitialisés
  startTime = Date.now();
  // NE PAS créer un nouvel ID ici - le même ID doit persister jusqu'à l'écran de fin

  // Réinitialiser la position et l'état du joueur pour le respawn
  try {
    const p = globalThis.player;
    if (p) {
      // Placer le joueur au milieu du ciel (au-dessus du terrain)
      p.setPosition(120, 450);
      // Réinitialiser la vélocité et l'état physique
      if (p.body) {
        p.body.setVelocity(0, 0);
        p.body.allowGravity = true;
        p.setVelocity(0, 0);
      }
      p.setBounce(0.2);
      p.setCollideWorldBounds(true);
      touchingGround = false;
    }
  } catch (e) {
    console.warn("Failed to reset player position during resetGameObjects", e);
  }
  
  // Réinitialiser le cycle jour/nuit
  if (skyTint) {
    skyTint.fillColor = 0x87ceeb;
  }
  if (sunSprite) {
    sunSprite.setPosition(100, 150);
    sunSprite.setAlpha(1);
  }
  if (moonSprite) {
    moonSprite.setAlpha(0);
  }
  nightLights.forEach(light => light.sprite.setAlpha(0));
}

/**
 * Apparition d'une bombe dans le jeu.
 *
 * @returns {void}
 */
function spawnObstacle(scene) {
  if (!scene || !globalThis.obstacles) return;

  const x = 900;
  const y = 520 - +Math.random() * 100;

  const obstacle = globalThis.obstacles.create(x, y, "obstacle");
  obstacle.setVelocityX(-200 - internalStage * 200);
  obstacle.setImmovable(true);
  obstacle.body.allowGravity = false;
}

/**
 * Gère la collision avec une bombe (fin de partie).
 */
function hitBomb(_player, _bomb) {
  // Empêcher les appels multiples à hitBomb pendant qu'on traite la mort
  if (processingDeath) return;
  processingDeath = true;

  gameOver = true;
  // capture le score final avant de réinitialiser
  const finalScore = score;
  const elapsedMs = startTime ? Date.now() - startTime : 0;
  const timerSeconds = Math.floor(elapsedMs / 1000);
  // envoyer le score au backend si l'utilisateur est connecté et que la session n'a pas déjà été enregistrée
  if (currentSessionId && !sessionPosted) {
    sessionPosted = true; // Marquer immédiatement
    try {
      const username = localStorage.getItem("user");
      if (username) {
        fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            score: finalScore,
            stage: internalStage,
            timer: timerSeconds,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            // Award XP based on the final score (persist XP automatically)
            try {
              const xpAmount = Math.max(0, Math.floor(finalScore / 10) + 10);
              fetch("/api/user/xp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, xp: xpAmount }),
              })
                .then((r) => r.json())
                .then(() => {})
                .catch((err) => console.warn("Failed to award XP", err));
            } catch (e) {
              console.warn("Error while awarding XP", e);
            }
          })
          .catch((err) => console.warn("Failed to submit score", err));
      }
    } catch (e) {
      console.warn("Error while submitting score", e);
    }
  }
  // Afficher la modal Game Over au lieu de directement réinitialiser
  if (showGameOverModalCallback) {
    showGameOverModalCallback();
  }
}

/**
 * Détecte si le joueur touche le sol.
 */
function touchGround(_player, _ground) {
  touchingGround = true;
}

/**
 * Composant React Game : intègre le jeu Phaser et l'overlay React.
 */
function Game() {
  const gameContainer = useRef(null);
  const [stage, setStage] = useState(1);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleReplay = () => {
    setShowGameOverModal(false);
    // Reprendre la scène Phaser
    const scene = globalThis.getPhaserScene?.();
    if (scene && scene.scene) {
      try {
        scene.scene.resume();
      } catch (e) {
        console.warn("Failed to resume scene", e);
      }
    }
    // Réinitialiser les états React
    setScoreDisplay(0);
    setStage(1);
    setTimerSeconds(0);
    resetGameObjects();
    gameOver = false;
    sessionPosted = false; // Permettre l'enregistrement de la prochaine partie
  };
  const handleReturnHome = async () => {
    setShowGameOverModal(false);
    // Reprendre la scène temporairement avant de naviguer
    const scene = globalThis.getPhaserScene?.();
    if (scene && scene.scene) {
      try {
        scene.scene.resume();
      } catch (e) {
        console.warn("Failed to resume scene", e);
      }
    }
    // Réinitialiser les états React
    setScoreDisplay(0);
    setStage(1);
    setTimerSeconds(0);
    resetGameObjects();
    gameOver = false;
    sessionPosted = false; // Permettre l'enregistrement de la prochaine partie
    navigate("/");
  };
  // reset des variables globales du module à l'initialisation du composant
  useEffect(() => {
    globalThis.player = undefined;
    globalThis.bombs = undefined;
    globalThis.platforms = undefined;
    globalThis.cursors = undefined;
    globalThis.score = 0;
    globalThis.gameOver = false;
    globalThis.touchingGround = false;
    globalThis.internalStage = 1;
    currentSessionId = null;
    processingDeath = false;
    sessionPosted = false;
    // Initialiser le callback pour afficher la modal Game Over et mettre en paus
    showGameOverModalCallback = () => {
      const scene = globalThis.getPhaserScene?.();
      if (scene && scene.scene) {
        try {
          scene.scene.pause();
        } catch (e) {
          console.warn("Failed to pause scene", e);
        }
      }
      setShowGameOverModal(true);
    };
  }, []);

  /**
   * Initialise Phaser et crée le jeu dans le conteneur.
   *
   * @return {void}
   */
  useEffect(() => {
    let destroyed = false;
    let gameInstance = null;
    const container = gameContainer.current;
    // Crée l'instance du jeu Phaser
    const createGame = () => {
      if (destroyed || !container || container._phaserGame) {
        return;
      }
      const config = {
        type: globalThis.Phaser.AUTO,
        width: 800,
        height: 600,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 1000 },
            debug: false,
          },
        },
        scene: { preload, create, update },
        parent: gameContainer.current,
      };
      gameInstance = new globalThis.Phaser.Game(config);
      if (container) container._phaserGame = gameInstance;
      // Affiche le canvas une fois prêt
      setTimeout(() => {
        const canvas = container?.querySelector("canvas");
        if (canvas) {
          canvas.style.display = "block";
          canvas.style.visibility = "visible";
          canvas.style.opacity = "1";
        } else {
        }
      }, 100);
    };
    // Initialise Phaser en chargeant le script si nécessaire
    const initPhaser = () => {
      if (destroyed) return;

      if (globalThis.Phaser) {
        createGame();
        return;
      }
      // charge le script Phaser depuis le CDN
      let script = document.querySelector("script[data-phaser-dynamic]");
      if (script) {
        const checkPhaser = setInterval(() => {
          if (destroyed) {
            clearInterval(checkPhaser);
            return;
          }
          if (globalThis.Phaser) {
            clearInterval(checkPhaser);
            createGame();
          }
        }, 100);
      } else {
        // charge le script
        script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js";
        script.dataset.phaserDynamic = "1";
        script.onload = () => {
          if (!destroyed) {
            createGame();
          }
        };
        script.onerror = () => {
          console.error("Failed to load Phaser script");
        };
        document.head.appendChild(script);
      }
    };
    // utilise un timeout pour différer l'initialisation
    const timer = setTimeout(() => {
      if (!destroyed) initPhaser();
    }, 50);
    // Nettoyage à la destruction du composant
    return () => {
      destroyed = true;
      clearTimeout(timer);
      if (gameInstance) {
        gameInstance.destroy(true);
      }
      if (container) {
        container._phaserGame = null;
      }
    };
  }, []);
  // Écoute les événements de mise à jour du stage et du score
  useEffect(() => {
    const onStage = (e) => {
      if (e?.detail) setStage(e.detail);
    };
    globalThis.addEventListener("stage-up", onStage);
    return () => globalThis.removeEventListener("stage-up", onStage);
  }, []);
  // Écoute les événements de mise à jour du score
  useEffect(() => {
    const onScore = (e) => {
      if (e?.detail !== undefined) setScoreDisplay(e.detail);
    };
    globalThis.addEventListener("score-up", onScore);
    return () => globalThis.removeEventListener("score-up", onScore);
  }, []);
  // Met à jour le chronomètre affiché toutes les 500ms
  useEffect(() => {
    const updateTimer = () => {
      const elapsedMs = startTime ? Date.now() - startTime : 0;
      setTimerSeconds(Math.floor(elapsedMs / 1000));
    };
    updateTimer();
    const id = setInterval(updateTimer, 500);
    return () => clearInterval(id);
  }, []);
  // Formate le temps en mm:ss
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  // Rendu du composant Game avec l'overlay
  return (
    <div className="game-wrap">
      <div className="game-overlay">
        <div className="game-overlay__group">
          <div className="stage-pill">
            {t("common.stage")} {stage}
          </div>
        </div>
        <div className="game-overlay__group">
          <div className="score-display">
            {t("common.score")}: {scoreDisplay}
          </div>
          <div className="timer-display">
            {t("game.time")}: {formatTime(timerSeconds)}
          </div>
        </div>
      </div>
      <div
        ref={gameContainer}
        id="phaser-container"
        className="phaser-container phaser-canvas"
      />
      <div className="options-buttons">
        <button
          className="btn ghost"
          onClick={() => globalThis.location.reload()}
        >
          {t("game.reloadGame")}
        </button>
      </div>
      <ModalGameOver
        isOpen={showGameOverModal}
        score={scoreDisplay}
        stage={stage}
        onReplay={handleReplay}
        onReturnHome={handleReturnHome}
      />
    </div>
  );
}

export default Game;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalGameOver from "./ModalGameOver.jsx";
import { useLanguage } from "./Language.jsx";
import "../css/Index.css";
import "../css/Game.css";

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

/**
 * Précharge les assets Phaser.
 * 
 * @return {void}
 */
function preload() {
  this.load.image("sky", "src/assets/sky.png");
  this.load.image("ground", "src/assets/platform.png");
  this.load.image("star", "src/assets/star.png");
  this.load.image("bomb", "src/assets/bomb.png");
  this.load.spritesheet("dude", "src/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48,
  });
}

/**
 * Initialise la scène de jeu Phaser.
 * 
 * @return {void}
 */
function create() {
  // démarrer le minuteur de la partie et créer un identifiant de session unique
  startTime = Date.now();
  currentSessionId = Math.random().toString(36).slice(2);
  sessionPosted = false; // Réinitialiser pour la nouvelle partie
  // Exposer un getter au lieu d'assigner `this` à une variable
  globalThis.getPhaserScene = () => this;
  this.add.image(400, 300, "sky");
  globalThis.platforms = this.physics.add.staticGroup();
  globalThis.platforms.create(400, 568, "ground").setScale(2).refreshBody();
  globalThis.platforms.create(600, 400, "ground");
  globalThis.platforms.create(50, 250, "ground");
  globalThis.platforms.create(750, 220, "ground");
  globalThis.player = this.physics.add.sprite(100, 450, "dude");
  globalThis.player.setBounce(0.2);
  globalThis.player.setCollideWorldBounds(true);
  this.anims.create({
    key: "left",
    frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });
  this.anims.create({
    key: "turn",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20,
  });
  this.anims.create({
    key: "right",
    frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });
  globalThis.stars = this.physics.add.group({
    key: "star",
    repeat: 11,
    setXY: { x: 12, y: 0, stepX: 70 },
  });
  globalThis.stars.children.iterate(function (child) {
    child.setBounceY(globalThis.Phaser.Math.FloatBetween(0.4, 0.8));
  });
  globalThis.bombs = this.physics.add.group();
  // Initialise les contrôles du clavier au scope global
  globalThis.cursors = this.input.keyboard.createCursorKeys();
  // Raccourcis clavier : prise en charge AZERTY (ZQSD) et QWERTY (WASD), ainsi que flèches et espace
  try {
    const defaultBindings = {
      up: ["Z", "W", "UP"],
      left: ["Q", "A", "LEFT"],
      down: ["S", "DOWN"],
      right: ["D", "RIGHT"],
      jump: ["SPACE"],
    };
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem('gameKeyBindings'));
      } catch (e) {
        console.warn('Failed to parse gameKeyBindings from localStorage', e);
        return null;
      }
    })();
    const bindings = saved || defaultBindings;

    const toCode = (k) => {
      if (!globalThis.Phaser || !globalThis.Phaser.Input || !globalThis.Phaser.Input.Keyboard) return k;
      const codes = globalThis.Phaser.Input.Keyboard.KeyCodes;
      const upk = String(k).toUpperCase();
      return codes && codes[upk] ? codes[upk] : k;
    };

    globalThis.keyMap = {};
    Object.entries(bindings).forEach(([action, keysArr]) => {
      globalThis.keyMap[action] = keysArr.map((k) => this.input.keyboard.addKey(toCode(k)));
    });
  } catch (e) {
    console.warn('Failed to init custom key bindings', e);
  }
  // fait apparaitre des bombes initiales en fonction du stage actuel
  for (let i = 0; i < internalStage; i++) spawnBomb();
  this.physics.add.collider(globalThis.stars, globalThis.platforms);
  this.physics.add.collider(globalThis.bombs, globalThis.platforms);
  this.physics.add.overlap(globalThis.player, globalThis.stars, collectStar, null, this);
  this.physics.add.collider(globalThis.player, globalThis.bombs, hitBomb, null, this);
  this.physics.add.collider(globalThis.player, globalThis.platforms, touchGround, null, this);
}

/**
 * Met à jour la logique du jeu à chaque frame.
 * 
 * @return {void}
 */
function update() {
  // accès aux variables globales du module
  const cursors = globalThis.cursors;
  const player = globalThis.player;
  if (gameOver) {
    resetGameObjects();
    gameOver = false;
  }
  handlePlayerMovement(player, cursors);
}

/**
 * Réinitialise les objets du jeu lors du game over.
 */
function resetGameObjects() {
  processingDeath = false; // Réinitialiser le flag pour permettre un nouvel appel à hitBomb()
  score = 0; // Réinitialiser le score pour la nouvelle partie
  internalStage = 1; // Réinitialiser la stage pour la nouvelle partie
  globalThis.stars.children.iterate(function (child) {
    child.disableBody(true, true);
  });
  globalThis.bombs.children.iterate(function (child) {
    child.disableBody(true, true);
  });
  globalThis.stars.children.iterate(function (child) {
    child.enableBody(true, child.x, 0, true, true);
  });
  // fait apparaitre des bombes initiales en fonction du stage
  try {
    for (let i = 0; i < internalStage; i++) spawnBomb();
  } catch (e) {
    console.warn('spawnBomb unavailable during reset', e);
  }
  // réinitialiser le minuteur lorsque les objets sont réinitialisés
  startTime = Date.now();
  // NE PAS créer un nouvel ID ici - le même ID doit persister jusqu'à l'écran de fin
}

/**
 * Gère les mouvements et sauts du joueur.
 */
function handlePlayerMovement(player, cursors) {
  if (player && cursors) {
    const km = globalThis.keyMap || {};
    const isDown = (action) => {
      const arr = km[action];
      if (Array.isArray(arr) && arr.length) {
        try {
          return arr.some((k) => k && k.isDown);
        } catch (e) {
          console.warn('Error while checking keyMap state for action', action, e);
          return false;
        }
      }
      return false;
    };

    const leftPressed = cursors.left?.isDown || isDown('left');
    const rightPressed = cursors.right?.isDown || isDown('right');

    if (leftPressed) {
      player.setVelocityX(-160);
      player.anims.play("left", true);
    } else if (rightPressed) {
      player.setVelocityX(160);
      player.anims.play("right", true);
    } else {
      player.setVelocityX(0);
      player.anims.play("turn");
    }

    const upPressed = cursors.up?.isDown || isDown('up') || isDown('jump');
    if (upPressed && player.body.touching.down && touchingGround) {
      player.setVelocityY(-650);
      touchingGround = false;
    }
  }
}

/**
 * Gère la collecte d'une étoile par le joueur.
 */
function collectStar(player, star) {
  star.disableBody(true, true);
  // met à jour le score
  score += 10;
  globalThis.dispatchEvent(new CustomEvent('score-up', { detail: score }));
  const stars = globalThis.stars;
  if (stars && stars.countActive(true) === 0) {
    internalStage += 1;
    globalThis.dispatchEvent(new CustomEvent('stage-up', { detail: internalStage }));
    stars.children.iterate(function (child) {
      child.enableBody(true, child.x, 0, true, true);
    });
    // ajoute une bombe supplémentaire pour le nouveau stage
    try {
      spawnBomb();
    } catch (e) {
      console.warn('spawnBomb not available when adding bomb', e);
    }
  }
}

/**
 * Génère un nombre aléatoire entre min et max de manière sûre avec Phaser.
 * 
 * @param {number} min - valeur minimale
 * @param {number} max - valeur maximale
 * @return {number} nombre aléatoire entre min et max
 */
function PhaserSafeBetween(min, max) {
  // Utilise Phaser.Math.Between si disponible, sinon Math.random
  if (typeof globalThis?.Phaser?.Math?.Between === 'function') {
    return globalThis.Phaser.Math.Between(min, max);
  }
  // solution de repli simple
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Apparition d'une bombe dans le jeu.
 * 
 * @returns {void}
 */
function spawnBomb() {
  // accès aux variables globales du module
  if (!globalThis.bombs || !globalThis.player) return;
  const playerX = globalThis.player.x;
  let x;
  let attempts = 0;
  const minDistance = 150; // distance minimale en pixels
  do {
    x = PhaserSafeBetween(50, 750);
    attempts++;
  } while (Math.abs(x - playerX) < minDistance && attempts < 20);
  let b;
  try {
    b = globalThis.bombs.create(x, 16, "bomb");
  } catch (e) {
    console.warn('Failed to create bomb', e);
    return;
  }
  b.setBounce(1);
  b.setCollideWorldBounds(true);
  const speed = globalThis.Phaser?.Math?.Between
    ? globalThis.Phaser.Math.Between(-150 - internalStage * 10, 150 + internalStage * 10)
    : (Math.random() * 400 - 200);
  b.setVelocity(speed, 20);
  b.allowGravity = false;
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
          body: JSON.stringify({ username, score: finalScore, stage: internalStage, timer: timerSeconds }),
        })
          .then((r) => r.json())
          .then((data) => {
            // Award XP based on the final score (persist XP automatically)
            try {
              const xpAmount = Math.max(0, Math.floor(finalScore / 10) + 10);
              fetch('/api/user/xp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, xp: xpAmount }),
              })
                .then((r) => r.json())
                .then(() => {})
                .catch((err) => console.warn('Failed to award XP', err));
            } catch (e) {
              console.warn('Error while awarding XP', e);
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
    sessionPosted = false;  // Permettre l'enregistrement de la prochaine partie
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
    navigate("/");
  };
  // reset des variables globales du module à l'initialisation du composant
  useEffect(() => {
     globalThis.player = undefined;
     globalThis.stars = undefined;
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
        const canvas = container?.querySelector('canvas');
        if (canvas) {
          canvas.style.display = 'block';
          canvas.style.visibility = 'visible';
          canvas.style.opacity = '1';
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
      let script = document.querySelector('script[data-phaser-dynamic]');
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
      } else { // charge le script
        script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';
        script.dataset.phaserDynamic = '1';
        script.onload = () => {
          if (!destroyed) {
            createGame();
          }
        };
        script.onerror = () => {
          console.error('Failed to load Phaser script');
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
    globalThis.addEventListener('stage-up', onStage);
    return () => globalThis.removeEventListener('stage-up', onStage);
  }, []);
  // Écoute les événements de mise à jour du score
  useEffect(() => {
    const onScore = (e) => {
      if (e?.detail !== undefined) setScoreDisplay(e.detail);
    };
    globalThis.addEventListener('score-up', onScore);
    return () => globalThis.removeEventListener('score-up', onScore);
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
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  // Rendu du composant Game avec l'overlay  
  return (
    <div className="game-wrap">
      <div className="game-overlay">
        <div className="game-overlay__group">
          <div className="stage-pill">{t("common.stage")} {stage}</div>
        </div>
        <div className="game-overlay__group">
          <div className="score-display">{t("common.score")}: {scoreDisplay}</div>
          <div className="timer-display">{t("game.time")}: {formatTime(timerSeconds)}</div>
        </div>
      </div>
      <div ref={gameContainer} id="phaser-container" className="phaser-container phaser-canvas" />
        <div className="options-buttons">
          <button className="btn ghost" onClick={() => globalThis.location.reload()}>{t("game.reloadGame")}</button>
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

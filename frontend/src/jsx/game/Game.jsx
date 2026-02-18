/* global Phaser */
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
  applySpawnWave,
  spawnObstacle,
  recycleObstacles,
  setMultiplayerMode,
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
  getOpponent,
} from "./utils/GamePhysics.js";
import {
  initControls,
  getCursors,
  isJumpRequested,
} from "./utils/GameControls.js";
import { getWebSocketUrl } from "../utils/wsClient.js";
import {
  calculateXPReward,
  checkAchievements,
} from "./utils/GameGamification.js";
import { getActiveUser, getUserAchievementsKey } from "../utils/userSession.js";
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
import ModalGameWon from "./modals/ModalGameWon.jsx";
import GameClientPrediction from "./utils/GameClientPrediction.js";

// État du jeu
let score = 0;
let gameOver = false;
let currentSessionId = null;
let processingDeath = false;
let sessionPosted = false;
let showGameOverModalCallback = null;
let gameScene = null;
let inputSocket = null;
let clientPrediction = null; // Système de prédiction client-side
let activeMatchId = null;
let serverTimeOffsetMs = 0;
let multiplayerEnabled = false;

/**
 * Envoyer un input avec prédiction client-side
 * Le client applique immédiatement l'action et envoie au serveur
 * Le serveur valide et envoie corrections si nécessaire
 */
export function sendGameInput(type) {
  const username = getActiveUser();
  if (!inputSocket || inputSocket.readyState !== WebSocket.OPEN) return;
  if (!clientPrediction) return;

  const player = getPlayer();
  if (!player) return;

  // Créer une fonction locale pour appliquer l'action
  const applyActionLocally = (inputType, playerState) => {
    if (inputType === "JUMP") {
      handleJump(); // Applique le saut localement TOUT DE SUITE
    }
  };

  // Envoi avec prédiction: applique localement + envoie au serveur
  clientPrediction.sendInputWithPrediction(
    type,
    {
      x: player.x,
      y: player.y,
      velocityX: player.body?.velocity?.x || 0,
      velocityY: player.body?.velocity?.y || 0,
      jumping: player.body?.blocked?.down === false,
      grounded: player.body?.blocked?.down === true,
    },
    applyActionLocally,
    inputSocket,
    username,
    activeMatchId,
  );
}

export function sendGameOver() {
  const username = getActiveUser();
  if (!inputSocket || inputSocket.readyState !== WebSocket.OPEN) return;
  inputSocket.send(
    JSON.stringify({ type: "gameOver", username, matchId: activeMatchId }),
  );
}

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
  this.load.spritesheet("opponent", "/assets/opponent.png", {
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
  initPhysics(this, false);
  initObstacles(this);
  initControls(this, handleAdminInvincible);
  initParticles(this);
  initEnhancements(this);
  addVignette(this);
  addNightStars(this); // Étoiles visibles dès le départ

  // ✨ Initialiser le système de prédiction client-side
  clientPrediction = new GameClientPrediction();

  setupCollisions(this);

  // Ajouter la collision avec les obstacles
  this.physics.add.overlap(
    getPlayer(),
    getObstacles(),
    handleObstacleCollision,
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
      createDustCloud(gameScene, player.x, player.y + 25, 0x00ffff);
      sendGameInput("JUMP");
    });
  }

  // Augmenter le stage tous les 100 points
  const newStage = Math.floor((score + 10) / 100) + 1;
  if (newStage !== getStage()) {
    updateStage(newStage);
    createScorePopup(gameScene, 400, 100, `Stage ${newStage}`);
    globalThis.dispatchEvent(new CustomEvent("stage-up", { detail: newStage }));

    if (multiplayerEnabled && inputSocket?.readyState === WebSocket.OPEN) {
      inputSocket.send(
        JSON.stringify({
          type: "stage_update",
          matchId: activeMatchId,
          stage: newStage,
        }),
      );
    }
  }

  // Recycler les obstacles et compter les points
  recycleObstacles(gameScene, () => {
    score += 10;
    createScorePopup(gameScene, 400, 150, "+10");
    globalThis.dispatchEvent(new CustomEvent("score-up", { detail: score }));
  });

  // Mettre à jour et spawner les obstacles
  if (!multiplayerEnabled) {
    spawnObstacle(gameScene);
  }
}

/**
 * Gère les collisions avec les obstacles
 */
function handleObstacleCollision(_player, _obstacle) {
  const { isInvincible } = getInvincibility();

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

  sendGameOver();

  gameOver = true;
  const finalScore = score;
  const timerSeconds = Math.floor(
    (Date.now() - (gameScene ? gameScene.startTime : Date.now())) / 1000,
  );

  if (currentSessionId && !sessionPosted) {
    sessionPosted = true;
    const username = getActiveUser();

    if (username) {
      fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          score: finalScore,
          stage: getStage(),
          timer: timerSeconds,
          state: "Defeat",
        }),
      })
        .then((r) => r.json())
        .then(() => {
          try {
            // Utiliser le nouveau système d'XP amélioré
            const xpAmount = calculateXPReward(
              finalScore,
              getStage(),
              timerSeconds,
            );

            // Vérifier les achievements
            const userAchievementsKey = getUserAchievementsKey(username);
            const userAchievementsStr =
              localStorage.getItem(userAchievementsKey);
            const userAchievements = userAchievementsStr
              ? JSON.parse(userAchievementsStr)
              : [];
            const newAchievements = checkAchievements(
              finalScore,
              getStage(),
              timerSeconds,
              userAchievements,
            );

            // Sauvegarder les nouveaux achievements
            if (newAchievements.length > 0) {
              const updatedAchievements = [
                ...userAchievements,
                ...newAchievements,
              ];
              localStorage.setItem(
                userAchievementsKey,
                JSON.stringify(updatedAchievements),
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
 * Composant React Game
 */
function Game() {
  const gameContainer = useRef(null);
  const leavePromptedRef = useRef(false);
  const [stage, setStage] = useState(1);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showGameWonModal, setShowGameWonModal] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [confirmedLeavingGame, setConfirmedLeavingGame] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Vérifier si l'utilisateur essaie d'accéder directement sans passer par le lobby
  useEffect(() => {
    const storedMatchId = sessionStorage.getItem("activeMatchId");
    const confirmedLeaving = sessionStorage.getItem("confirmedLeavingGame");

    // Si pas de matchId et pas de replay confirmé, rediriger vers le lobby
    if (!storedMatchId && !confirmedLeaving) {
      navigate("/lobby", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const confirmedLeaving = sessionStorage.getItem("confirmedLeavingGame");
    if (confirmedLeaving) {
      sessionStorage.removeItem("confirmedLeavingGame");
    }
    const storedMatchId = sessionStorage.getItem("activeMatchId");
    const storedOffset = sessionStorage.getItem("serverTimeOffsetMs");
    activeMatchId = storedMatchId;
    serverTimeOffsetMs = storedOffset ? Number(storedOffset) : 0;
    multiplayerEnabled = Boolean(storedMatchId);
    setMultiplayerMode(multiplayerEnabled);
  }, []);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    const username = getActiveUser();
    inputSocket = ws;
    let isUnmounting = false;
    let closeAfterOpen = false;

    ws.onopen = () => {
      if (closeAfterOpen) {
        ws.close();
        return;
      }
      console.log("WS connected");
      if (activeMatchId) {
        ws.send(
          JSON.stringify({
            type: "join_game",
            username,
            matchId: activeMatchId,
          }),
        );
      }
    };
    ws.onerror = (e) => {
      if (isUnmounting) return;
      console.error("WS error", e);
    };
    ws.onclose = () => {
      if (isUnmounting) return;
      console.log("WS closed");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "join_ok") {
          setOpponentDisconnected(false);
          return;
        }

        // ========== CONFIRMATION D'INPUT ==========
        // Le serveur confirme que l'input a été reçu et validé
        if (data.type === "input_ack") {
          if (clientPrediction) {
            if (data.valid) {
              clientPrediction.confirmAction(data.sequence);
              console.log(`✅ Input confirmé (seq: ${data.sequence})`);
            } else {
              console.warn(
                `❌ Input rejeté par le serveur (seq: ${data.sequence})`,
              );
            }
          }
          return;
        }

        // ========== CORRECTION D'ÉTAT ==========
        // Le serveur corrige si désynchronisation détectée
        if (data.type === "state_correction") {
          if (clientPrediction) {
            const player = getPlayer();
            console.warn(`[!] Correction du serveur reçue`);
            clientPrediction.processServerCorrection(
              {
                sequence: data.sequence || 0,
                x: data.x,
                y: data.y,
                velocityX: data.velocityX,
                velocityY: data.velocityY,
                valid: true,
              },
              player,
              null,
            );
          }
          return;
        }

        // ========== INPUT REÇU (adversaire) ==========
        // Mise à jour de l'adversaire avec interpolation
        if (data.type === "input") {
          if (data.matchId && data.matchId !== activeMatchId) return;
          const usernameOpponent = data.username;
          if (username === usernameOpponent) return; // C'est notre action, on ignore

          setOpponentDisconnected(false);

          // Mettre à jour l'état de l'adversaire dans la prédiction
          if (clientPrediction && data.serverState) {
            clientPrediction.updateOpponentState(
              usernameOpponent,
              data.serverState,
            );
          }

          // Appliquer l'action immédiatement
          if (data.input === "JUMP") {
            const opponent = getOpponent();
            if (opponent) {
              opponent.setVelocityY(-500);
            }
          }
          console.log(
            `[X] Action adversaire: ${usernameOpponent} ${data.input}`,
          );
        }

        if (data.type === "spawn_wave") {
          if (data.matchId !== activeMatchId) return;
          const spawnAt = Number(data.spawnAt || 0);
          const targetTime = spawnAt - serverTimeOffsetMs;
          const delay = Math.max(0, targetTime - Date.now());
          setTimeout(() => {
            applySpawnWave(gameScene, data.wave);
          }, delay);
        }

        // ========== ADVERSAIRE DÉCONNECTÉ ==========
        if (data.type === "opponent_disconnected") {
          if (data.matchId && data.matchId !== activeMatchId) return;
          if (!confirmedLeavingGame) {
            setOpponentDisconnected(true);
          }
          return;
        }

        // ========== FIN DE PARTIE ==========
        if (data.type === "gameOver") {
          if (data.matchId && data.matchId !== activeMatchId) return;
          const usernameOpponent = data.username;
          if (username === usernameOpponent) return;

          gameOver = true;
          const finalScore = score;
          const timerSeconds = Math.floor(
            (Date.now() - (gameScene ? gameScene.startTime : Date.now())) /
              1000,
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
                  state: "Victory",
                }),
              })
                .then((r) => r.json())
                .then(() => {
                  try {
                    // Utiliser le nouveau système d'XP amélioré
                    const xpAmount = calculateXPReward(
                      finalScore,
                      getStage(),
                      timerSeconds,
                    );

                    // Vérifier les achievements
                    const userAchievementsKey =
                      getUserAchievementsKey(username);
                    const userAchievementsStr =
                      localStorage.getItem(userAchievementsKey);
                    const userAchievements = userAchievementsStr
                      ? JSON.parse(userAchievementsStr)
                      : [];
                    const newAchievements = checkAchievements(
                      finalScore,
                      getStage(),
                      timerSeconds,
                      userAchievements,
                    );

                    // Sauvegarder les nouveaux achievements
                    if (newAchievements.length > 0) {
                      const updatedAchievements = [
                        ...userAchievements,
                        ...newAchievements,
                      ];
                      localStorage.setItem(
                        userAchievementsKey,
                        JSON.stringify(updatedAchievements),
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
          try {
            gameScene?.scene?.pause();
          } catch (e) {
            console.warn("Failed to pause scene", e);
          }
          setShowGameWonModal(true);
        }
      } catch (err) {
        console.error("Invalid WS message", event.data);
      }
    };

    return () => {
      isUnmounting = true;
      if (ws.readyState === WebSocket.CONNECTING) {
        closeAfterOpen = true;
      } else {
        ws.close();
      }
      inputSocket = null;
    };
  }, []);

  const handleReplay = () => {
    setShowGameOverModal(false);
    setShowGameWonModal(false);
    setConfirmedLeavingGame(true);
    sessionStorage.setItem("confirmedLeavingGame", "1");
    sessionStorage.removeItem("activeMatchId");
    sessionStorage.removeItem("serverTimeOffsetMs");
    navigate("/lobby");
  };

  const handleReturnHome = async () => {
    setShowGameOverModal(false);
    setConfirmedLeavingGame(true);
    sessionStorage.setItem("confirmedLeavingGame", "1");
    try {
      gameScene.scene.resume();
    } catch (e) {
      console.warn("Failed to resume scene", e);
    }
    sessionStorage.removeItem("activeMatchId");
    sessionStorage.removeItem("serverTimeOffsetMs");
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

  // Demander confirmation avant de quitter via un changement d'onglet
  useEffect(() => {
    if (confirmedLeavingGame || showGameOverModal || showGameWonModal) {
      return;
    }

    const handleBlur = () => {
      if (!activeMatchId) return;
      if (leavePromptedRef.current) return;
      leavePromptedRef.current = true;
      globalThis.dispatchEvent(
        new CustomEvent("request-leave-match", {
          detail: { target: "/lobby", reason: "tab" },
        }),
      );
    };

    const handleCancel = () => {
      leavePromptedRef.current = false;
    };

    globalThis.addEventListener("blur", handleBlur);
    globalThis.addEventListener("leave-match-cancelled", handleCancel);
    return () => {
      globalThis.removeEventListener("blur", handleBlur);
      globalThis.removeEventListener("leave-match-cancelled", handleCancel);
      leavePromptedRef.current = false;
    };
  }, [confirmedLeavingGame, showGameOverModal, showGameWonModal]);

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
    <>
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

        {opponentDisconnected && (
          <div className="opponent-disconnected-notification">
            <div className="notification-content">
              <span className="notification-icon">⚠️</span>
              <span className="notification-text">
                {t("game.opponentDisconnected") ||
                  "L'adversaire s'est déconnecté"}
              </span>
            </div>
          </div>
        )}

        {showGameWonModal && (
          <ModalGameWon
            isOpen={true}
            score={scoreDisplay}
            stage={stage}
            timerSeconds={timerSeconds}
            onReplay={handleReplay}
            onReturnHome={handleReturnHome}
          />
        )}
      </div>
    </>
  );
}

export default Game;

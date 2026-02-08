import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });
const MIN_PLAYERS = 2;

// Gestion des joueurs et de leurs états
let players = new Set();
let playerStates = new Map(); // username -> { x, y, vx, vy, lastSequence, ... }

// Configuration anti-cheat
const ANTI_CHEAT_CONFIG = {
  MAX_VELOCITY: 1000, // pixels/frame
  MAX_JUMP_HEIGHT: 500,
  MIN_TIME_BETWEEN_JUMPS: 100, // ms
  MAX_POSITION_CHANGE: 300, // pixels/frame
};

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

/**
 * Valider un input reçu d'un client
 * Détecte les tentatives de triche
 */
function validateInput(username, inputData) {
  const state = playerStates.get(username) || {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastSequence: -1,
    lastJumpTime: 0,
  };

  // Vérifier le numéro de séquence
  if (inputData.sequence <= state.lastSequence) {
    console.warn(`⚠️ Séquence invalide: ${username} (seq: ${inputData.sequence}, last: ${state.lastSequence})`);
    return { valid: false, reason: "sequence_out_of_order" };
  }

  // Vérifier les sauts trop rapides
  if (inputData.input === "JUMP") {
    const timeSinceLastJump = Date.now() - state.lastJumpTime;
    if (timeSinceLastJump < ANTI_CHEAT_CONFIG.MIN_TIME_BETWEEN_JUMPS) {
      console.warn(`⚠️ Trop de sauts trop rapides: ${username}`);
      return { valid: false, reason: "jump_spam" };
    }
  }

  // Validation réussie
  return { valid: true };
}

/**
 * Mettre à jour l'état serveur d'un joueur
 */
function updatePlayerState(username, inputData) {
  let state = playerStates.get(username) || {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastSequence: -1,
    lastJumpTime: 0,
    velocityY: 0,
  };

  // Mettre à jour le numéro de séquence
  state.lastSequence = inputData.sequence;

  // Mettre à jour selon le type d'input
  if (inputData.input === "JUMP") {
    state.velocityY = -500; // Vitesse de saut
    state.lastJumpTime = Date.now();
  }

  // Sauvegarder l'état
  playerStates.set(username, state);

  return state;
}

/**
 * Envoyer une confirmation d'input au client
 */
function sendInputAck(ws, inputData, valid) {
  try {
    ws.send(
      JSON.stringify({
        type: "input_ack",
        sequence: inputData.sequence,
        valid: valid,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.error("Failed to send ACK:", e);
  }
}

/**
 * Envoyer une correction d'état au client
 */
function sendStateCorrection(ws, username, state) {
  try {
    ws.send(
      JSON.stringify({
        type: "state_correction",
        username,
        x: state.x || 0,
        y: state.y || 0,
        velocityX: state.vx || 0,
        velocityY: state.velocityY || 0,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.error("Failed to send correction:", e);
  }
}

wss.on("connection", (ws) => {
  let username = null;
  let clientSequence = 0;

  console.log(`✅ Client connecté. Total: ${wss.clients.size}`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // ========== CONNEXION ==========
      if (msg.type === "join") {
        username = msg.username;
        players.add(username);

        // Initialiser l'état du joueur
        playerStates.set(username, {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          velocityY: 0,
          lastSequence: -1,
          lastJumpTime: 0,
        });

        console.log(`🎮 ${username} rejoint (total: ${players.size})`);

        broadcast({ type: "player_count", count: players.size });

        if (players.size >= MIN_PLAYERS) {
          console.log("🚀 Démarrage du jeu!");
          broadcast({ type: "start_game" });
        }
      }

      // ========== INPUT REÇU ==========
      if (msg.type === "input") {
        const inputUsername = msg.username;
        const sequence = msg.sequence || 0;

        // ✅ VALIDATION (anti-cheat)
        const validation = validateInput(inputUsername, {
          input: msg.input,
          sequence: sequence,
        });

        if (!validation.valid) {
          console.warn(`❌ Input invalide de ${inputUsername}: ${validation.reason}`);
          sendInputAck(ws, { sequence }, false);
          return;
        }

        // ✅ MISE À JOUR DE L'ÉTAT SERVEUR
        const updatedState = updatePlayerState(inputUsername, {
          input: msg.input,
          sequence: sequence,
        });

        // ✅ CONFIRMATION AU CLIENT
        sendInputAck(ws, { sequence }, true);

        // ✅ BROADCAST AUX AUTRES JOUEURS
        // Seul l'état serveur validé est envoyé
        broadcast({
          type: "input",
          username: inputUsername,
          input: msg.input,
          sequence: sequence,
          // État serveur validé pour correction client si besoin
          serverState: {
            x: updatedState.x || 0,
            y: updatedState.y || 0,
            velocityX: updatedState.vx || 0,
            velocityY: updatedState.velocityY || 0,
          },
        });

        console.log(`📨 Input validé de ${inputUsername}: ${msg.input} (seq: ${sequence})`);
      }

      // ========== FIN DE PARTIE ==========
      if (msg.type === "gameOver") {
        const gameOverUsername = msg.username;
        console.log(`💀 ${gameOverUsername} game over`);

        broadcast({
          type: "gameOver",
          username: gameOverUsername,
          timestamp: Date.now(),
        });
      }

      // ========== SYNC D'ÉTAT ==========
      if (msg.type === "sync_state") {
        // Le client envoie son état pour vérification
        const state = msg.state;
        const receivedState = playerStates.get(username);

        // Vérifier si l'état du client est trop désynchronisé
        const deltaX = Math.abs((state.x || 0) - (receivedState?.x || 0));
        const deltaY = Math.abs((state.y || 0) - (receivedState?.y || 0));

        if (deltaX > 100 || deltaY > 100) {
          console.warn(`⚠️ Désynchronisation détectée pour ${username}`);
          sendStateCorrection(ws, username, receivedState);
        }
      }
    } catch (e) {
      console.error("Erreur parsing message:", e);
    }
  });

  ws.on("close", () => {
    if (username) {
      players.delete(username);
      playerStates.delete(username);
      console.log(`❌ ${username} déconnecté (total: ${players.size})`);
      broadcast({ type: "player_count", count: players.size });
    }
  });

  ws.on("error", (error) => {
    console.error("Erreur WebSocket:", error);
  });
});

console.log("🎮 Serveur de jeu WebSocket démarré sur le port 3001");
console.log("Anti-cheat activé avec configuration:", ANTI_CHEAT_CONFIG);

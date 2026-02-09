import crypto from "crypto";
import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });
const MIN_PLAYERS = 2;

const BASE_OBSTACLE_SPEED = 200;
const SPEED_INCREMENT = 150;
const MAX_SPAWN_RATE = 4000;
const MIN_SPAWN_RATE = 1000;

// Lobby et matchs
const lobby = new Map(); // ws -> username
const matches = new Map(); // matchId -> match
const assignments = new Map(); // username -> matchId
const connectionInfo = new Map(); // ws -> { username, matchId, inLobby }

// Configuration anti-cheat
const ANTI_CHEAT_CONFIG = {
  MAX_VELOCITY: 1000, // pixels/frame
  MAX_JUMP_HEIGHT: 500,
  MIN_TIME_BETWEEN_JUMPS: 10, // ms
  MAX_POSITION_CHANGE: 300, // pixels/frame
};

function makeMatchId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString("hex");
}

function broadcastToClients(clients, data) {
  const msg = JSON.stringify(data);
  const list = Array.from(clients);
  list.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function broadcastToLobby(data) {
  broadcastToClients(lobby.keys(), data);
}

function broadcastToMatch(matchId, data) {
  const match = matches.get(matchId);
  if (!match) return;
  broadcastToClients(match.players.values(), data);
}

function getSpawnInterval(stage) {
  return Math.max(MIN_SPAWN_RATE, MAX_SPAWN_RATE - (stage - 1) * 150);
}

function buildSpawnWave(stage) {
  let bombCount = 1;
  let speedBoost = 0;

  if (stage >= 3) {
    if (Math.random() < 0.8) {
      speedBoost = (stage - 2) * 15;
    } else {
      bombCount = 2 + Math.floor((stage - 3) / 3);
    }
  }

  const obstacleSpeed =
    -(BASE_OBSTACLE_SPEED + (stage - 1) * SPEED_INCREMENT + speedBoost);

  const heightLevels = [540, 420];
  const selectHeight = () => {
    const rand = Math.random();
    if (rand < 0.5) return heightLevels[0];
    return heightLevels[1];
  };

  const selectedHeights = [];
  for (let i = 0; i < bombCount; i += 1) {
    let randomHeight;
    do {
      randomHeight = selectHeight();
    } while (selectedHeights.includes(randomHeight));
    selectedHeights.push(randomHeight);
  }

  const bombs = selectedHeights.map((baseY, i) => {
    const x = 900 + i * 100;
    const y = baseY + (Math.random() * 30 - 15);
    return { x, y };
  });

  return { speed: obstacleSpeed, bombs };
}

function scheduleNextSpawn(matchId) {
  const match = matches.get(matchId);
  if (!match) return;

  const interval = getSpawnInterval(match.stage);
  const now = Date.now();
  const last = match.lastSpawnAt || now;
  const nextAt = Math.max(now, last + interval);
  const delay = Math.max(0, nextAt - now);

  match.spawnTimer = setTimeout(() => {
    const wave = buildSpawnWave(match.stage);
    match.lastSpawnAt = Date.now();
    const spawnAt = match.lastSpawnAt + 200;
    broadcastToMatch(matchId, {
      type: "spawn_wave",
      matchId,
      spawnAt,
      wave,
    });
    scheduleNextSpawn(matchId);
  }, delay);
}

function createMatch(playerEntries) {
  const matchId = makeMatchId();
  const match = {
    id: matchId,
    players: new Map(),
    playerStates: new Map(),
    stage: 1,
    lastSpawnAt: 0,
    spawnTimer: null,
    overPlayers: new Set(),
  };

  matches.set(matchId, match);

  const serverTime = Date.now();
  playerEntries.forEach(({ username, ws }) => {
    assignments.set(username, matchId);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "start_game",
          matchId,
          serverTime,
        })
      );
    }
  });

  scheduleNextSpawn(matchId);
}

/**
 * Valider un input reçu d'un client
 * Détecte les tentatives de triche
 */
function validateInput(match, username, inputData) {
  const state = match.playerStates.get(username) || {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastSequence: -1,
    lastJumpTime: 0,
  };

  // Vérifier le numéro de séquence
  if (inputData.sequence <= state.lastSequence) {
    console.warn(`[!] Séquence invalide: ${username} (seq: ${inputData.sequence}, last: ${state.lastSequence})`);
    return { valid: false, reason: "sequence_out_of_order" };
  }

  // Vérifier les sauts trop rapides
  /*if (inputData.input === "JUMP") {
    const timeSinceLastJump = Date.now() - state.lastJumpTime;
    if (timeSinceLastJump < ANTI_CHEAT_CONFIG.MIN_TIME_BETWEEN_JUMPS) {
      console.warn(`[!] Trop de sauts trop rapides: ${username}`);
      return { valid: false, reason: "jump_spam" };
    }
  }*/ //TODO: à revoir

  // Validation réussie
  return { valid: true };
}

/**
 * Mettre à jour l'état serveur d'un joueur
 */
function updatePlayerState(match, username, inputData) {
  let state = match.playerStates.get(username) || {
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
  match.playerStates.set(username, state);

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
  console.log(`[X] Client connecté. Total: ${wss.clients.size}`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "join_lobby" || msg.type === "join") {
        const username = msg.username;
        if (!username) return;

        if (lobby.has(ws)) return;

        lobby.set(ws, username);
        connectionInfo.set(ws, { username, matchId: null, inLobby: true });
        console.log(`[X] ${username} rejoint le lobby (total: ${lobby.size})`);

        broadcastToLobby({ type: "player_count", count: lobby.size });

        if (lobby.size >= MIN_PLAYERS) {
          const entries = [];
          for (const [socket, user] of lobby.entries()) {
            if (entries.length >= MIN_PLAYERS) break;
            lobby.delete(socket);
            entries.push({ username: user, ws: socket });
          }
          if (entries.length === MIN_PLAYERS) {
            createMatch(entries);
          }
          broadcastToLobby({ type: "player_count", count: lobby.size });
        }
        return;
      }

      if (msg.type === "join_game") {
        const username = msg.username;
        const matchId = msg.matchId;
        const assignedMatch = assignments.get(username);
        if (!username || !matchId || assignedMatch !== matchId) {
          ws.send(JSON.stringify({ type: "error", message: "invalid_match" }));
          return;
        }

        const match = matches.get(matchId);
        if (!match) {
          ws.send(JSON.stringify({ type: "error", message: "match_not_found" }));
          return;
        }

        match.players.set(username, ws);
        match.playerStates.set(username, {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          velocityY: 0,
          lastSequence: -1,
          lastJumpTime: 0,
        });
        connectionInfo.set(ws, { username, matchId, inLobby: false });

        ws.send(JSON.stringify({ type: "join_ok", matchId }));
        return;
      }

      const info = connectionInfo.get(ws);
      const matchId = msg.matchId || info?.matchId;
      const match = matchId ? matches.get(matchId) : null;

      if (msg.type === "stage_update" && match) {
        const newStage = Number(msg.stage || 1);
        if (!Number.isNaN(newStage)) {
          match.stage = Math.max(match.stage, newStage);
        }
        return;
      }

      if (msg.type === "input") {
        const inputUsername = msg.username;
        const sequence = msg.sequence || 0;

        if (match) {
          const validation = validateInput(match, inputUsername, {
            input: msg.input,
            sequence,
          });

          if (!validation.valid) {
            console.warn(
              `[!] Input invalide de ${inputUsername}: ${validation.reason}`
            );
            sendInputAck(ws, { sequence }, false);
            return;
          }

          const updatedState = updatePlayerState(match, inputUsername, {
            input: msg.input,
            sequence,
          });

          sendInputAck(ws, { sequence }, true);

          broadcastToMatch(matchId, {
            type: "input",
            matchId,
            username: inputUsername,
            input: msg.input,
            sequence,
            serverState: {
              x: updatedState.x || 0,
              y: updatedState.y || 0,
              velocityX: updatedState.vx || 0,
              velocityY: updatedState.velocityY || 0,
            },
          });
        } else {
          sendInputAck(ws, { sequence }, true);
          broadcastToClients(wss.clients, {
            type: "input",
            username: inputUsername,
            input: msg.input,
            sequence,
          });
        }
      }

      if (msg.type === "gameOver") {
        const gameOverUsername = msg.username;
        console.log(`[X] ${gameOverUsername} game over`);

        if (match) {
          match.overPlayers.add(gameOverUsername);
          broadcastToMatch(matchId, {
            type: "gameOver",
            matchId,
            username: gameOverUsername,
            timestamp: Date.now(),
          });

          if (match.overPlayers.size >= match.players.size) {
            if (match.spawnTimer) {
              clearTimeout(match.spawnTimer);
            }
            match.players.forEach((_, user) => assignments.delete(user));
            matches.delete(matchId);
          }
        } else {
          broadcastToClients(wss.clients, {
            type: "gameOver",
            username: gameOverUsername,
            timestamp: Date.now(),
          });
        }
      }

      if (msg.type === "sync_state" && match) {
        const state = msg.state;
        const receivedState = match.playerStates.get(info?.username);

        const deltaX = Math.abs((state.x || 0) - (receivedState?.x || 0));
        const deltaY = Math.abs((state.y || 0) - (receivedState?.y || 0));

        if (deltaX > 100 || deltaY > 100) {
          console.warn(`[!] Désynchronisation détectée pour ${info?.username}`);
          sendStateCorrection(ws, info?.username, receivedState);
        }
      }
    } catch (e) {
      console.error("[!] Erreur parsing message:", e);
    }
  });

  ws.on("close", () => {
    const info = connectionInfo.get(ws);
    if (!info) return;

    if (info.inLobby && info.username) {
      lobby.delete(ws);
      broadcastToLobby({ type: "player_count", count: lobby.size });
    }

    if (info.matchId) {
      const match = matches.get(info.matchId);
      if (match) {
        match.players.delete(info.username);
        match.playerStates.delete(info.username);
        match.overPlayers.delete(info.username);
        if (match.players.size === 0) {
          if (match.spawnTimer) {
            clearTimeout(match.spawnTimer);
          }
          matches.delete(info.matchId);
        }
      }
      assignments.delete(info.username);
    }

    connectionInfo.delete(ws);
    console.log(`[!] ${info.username} déconnecté`);
  });

  ws.on("error", (error) => {
    console.error("Erreur WebSocket:", error);
  });
});

console.log("[X] Serveur de jeu WebSocket démarré sur le port 3001");
console.log("[X] Anti-cheat activé avec configuration:", ANTI_CHEAT_CONFIG);

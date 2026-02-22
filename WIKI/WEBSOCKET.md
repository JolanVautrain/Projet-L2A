# Système WebSocket et Multijoueur

## Vue d'ensemble

Le système multijoueur utilise **WebSocket** pour la communication en temps réel. Un serveur Node.js dédié gère les connexions et synchronise l'état du jeu entre tous les participants.

## Architecture WebSocket

```
┌─────────────────────────────────────────────────────┐
│                    Clients (Navigateurs)            │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│  │ Joueur 1 │     │ Joueur 2 │     │ Joueur N │     │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘     │
└───────┼──────────────────┼──────────────────┼───────┘
        │    WebSocket     │                  │
        │   Connection     │                  │
        └────────┬─────────┴──────────────────┘
                 │
        ┌────────▼─────────────┐
        │ Node.js Server       │
        │ (gameServeur.js)     │
        │ Port 3001            │
        │                      │
        │ ├─ Room Manager      │
        │ ├─ Message Broker    │
        │ └─ Player Tracker    │
        └────────┬─────────────┘
                 │
        ┌────────▼──────────────┐
        │ Flask Backend (REST)  │
        │ Port 5000             │
        │ - Persistance bd      │
        │ - Validation scores   │
        └───────────────────────┘
```

## Serveur WebSocket (gameServeur.js)

### Configuration et Démarrage

```javascript
const io = require("socket.io")(3001, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:15256",
      "http://192.168.60.202:15256",
      // ... autres origins
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("New player connected:", socket.id);
});
```

### Gestion des Salles (Rooms)

Chaque partie est une **salle Socket.io** :

```javascript
// Créer/rejoindre une salle
socket.on("join", (data) => {
  const { gameId, username, userId } = data;

  socket.join(gameId);

  // Tracer le joueur
  socket.gameId = gameId;
  socket.username = username;
  socket.userId = userId;

  // Obtenir le nombre de joueurs dans cette salle
  const room = io.sockets.adapter.rooms.get(gameId);
  const playerCount = room ? room.size : 0;

  // Notifier tous les joueurs de cette salle
  io.to(gameId).emit("player_joined", {
    username: username,
    count: playerCount,
  });

  // Si 2+ joueurs, lancer la partie
  if (playerCount >= 2) {
    io.to(gameId).emit("start_game", {
      timestamp: Date.now(),
    });
  }
});
```

### Types de Messages

#### 1. Rejoindre une Partie

**Client → Serveur** :

```javascript
socket.emit("join", {
  gameId: "uuid-123",
  username: "player1",
  userId: 42,
});
```

**Serveur → Clients** :

```javascript
socket.on("player_joined", (data) => {
  // {username: 'player1', count: 1}
});

socket.on("start_game", (data) => {
  // {timestamp: 1645262400000}
});
```

#### 2. Actions de Jeu

Le joueur envoie ses actions (sauts, mouvements, etc.) :

**Client → Serveur** :

```javascript
// Quand le joueur appuie sur espace (saut)
socket.emit("action", {
  type: "jump",
  timestamp: Date.now(),
  x: 150, // Position X pour validation serveur
  y: 50, // Position Y
});

// Quand le joueur se déplace
socket.emit("action", {
  type: "move",
  direction: "left", // 'left', 'right', ou 'stop'
  timestamp: Date.now(),
});
```

**Serveur** :

```javascript
socket.on("action", (data) => {
  const { type, timestamp, x, y } = data;

  // Validation simple
  if (!type || !timestamp) {
    return;
  }

  // Broadcast à tous les joueurs de la salle
  io.to(socket.gameId).emit("player_action", {
    playerId: socket.userId,
    action: {
      type: type,
      x: x,
      y: y,
      timestamp: timestamp,
    },
  });
});
```

**Serveur → Autres Clients** :

```javascript
socket.on("player_action", (data) => {
  // {playerId: 42, action: {type: 'jump', x: 150, y: 50, timestamp: ...}}
  updateOtherPlayer(data.playerId, data.action);
});
```

#### 3. État du Jeu Synchronisé

Périodiquement, le serveur synchronise l'état complet :

**Serveur** :

```javascript
setInterval(() => {
  const rooms = io.sockets.adapter.rooms;

  rooms.forEach((players, roomId) => {
    // Récupérer tous les joueurs de la salle
    const playerList = Array.from(players).map((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      return {
        userId: socket.userId,
        username: socket.username,
        x: socket.x || 0,
        y: socket.y || 0,
        alive: socket.alive !== false,
      };
    });

    // Envoyer l'état à tous les joueurs
    io.to(roomId).emit("game_state", {
      players: playerList,
      timestamp: Date.now(),
    });
  });
}, 100); // Tous les 100ms (10 Hz)
```

**Client** :

```javascript
socket.on("game_state", (data) => {
  // {players: [...], timestamp: ...}
  updateAllPlayers(data.players);
});
```

#### 4. Fin de Partie

**Serveur détecte fin** :

```javascript
socket.on("game_end", (data) => {
  const { finalScore, duration } = data;

  // Envoyer l'événement à tous les joueurs de la salle
  io.to(socket.gameId).emit("game_over", {
    results: {
      playerId: socket.userId,
      username: socket.username,
      score: finalScore,
    },
    timestamp: Date.now(),
  });
});
```

**Client** :

```javascript
socket.on("game_over", (data) => {
  // Afficher modal de fin de partie
  showGameOverModal({
    results: data.results,
    allPlayerResults: getAllPlayerResults(),
  });
});
```

#### 5. Déconnexion

```javascript
socket.on("disconnect", () => {
  console.log("Player disconnected:", socket.username);

  const gameId = socket.gameId;
  const room = io.sockets.adapter.rooms.get(gameId);
  const playerCount = room ? room.size : 0;

  // Notifier les autres joueurs
  io.to(gameId).emit("player_left", {
    username: socket.username,
    count: playerCount,
  });

  // Si plus assez de joueurs, terminer la salle
  if (playerCount < 1) {
    io.to(gameId).emit("room_closed", {
      reason: "Not enough players",
    });
  }
});
```

## Flux Complet d'une Partie

### 1. Préparation

```
Joueur A → Click "Jouer"
         → POST /game/join (REST)
         ← Response: {game_id: 'abc123', ws_server: 'ws://...'}
         → Connect WebSocket
         → emit('join', {gameId: 'abc123', ...})
         ← receive('player_joined', {count: 1})

Joueur B → Click "Jouer"
         → POST /game/join (REST)
         ← Response: {game_id: 'abc123', ...}
         → Connect WebSocket
         → emit('join', {gameId: 'abc123', ...})
         ← receive('player_joined', {count: 2})
         ← receive('start_game', {timestamp: ...})
```

### 2. Gameplay

```
Joueur A appuie SPACE
       → emit('action', {type: 'jump', ...})

Serveur reçoit
       → emit('player_action', {playerId: A, action: {...}})

Joueur B reçoit
       → receive('player_action', {...})
       → updateOtherPlayer(A, action)
```

### 3. Fin de Partie

**Côté Client** (détecte fin :60 secondes) :

```javascript
socket.emit("game_end", {
  finalScore: 1250,
  duration: 60000,
});
```

**Serveur** :

```javascript
io.to(gameId).emit("game_over", {
  results: [
    { playerId: A, score: 1250 },
    { playerId: B, score: 980 },
  ],
});
```

**Client** :

```javascript
socket.on("game_over", (data) => {
  // POST REST API pour sauvegarder le score
  apiCall("/game/end", {
    method: "POST",
    body: JSON.stringify({
      game_id: gameId,
      score: 1250,
      duration_seconds: 60,
    }),
  });
});
```

## Configuration et Déploiement

### Fichier docker-compose pour WebSocket

```yaml
websocket:
  build:
    context: ./backend
    dockerfile: Dockerfile.websocket
  ports:
    - "3001:3001"
  environment:
    - NODE_ENV=production
    - PORT=3001
  depends_on:
    - backend
```

### Nginx Proxy pour WebSocket

```nginx
location /socket.io {
    proxy_pass http://websocket:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Monitoring et Debug

### Logs Serveur

```javascript
// Activer les logs détaillés
const io = require("socket.io")(3001, {
  transports: ["websocket"], // Force WebSocket, évite polling
  debug: true,
});

io.on("connection", (socket) => {
  console.log(`[${new Date().toISOString()}] Connection: ${socket.id}`);

  socket.on("action", (data) => {
    console.log(`Action from ${socket.username}: ${data.type}`);
  });
});
```

### Statistiques de Serveur

```javascript
app.get("/admin/websocket/stats", (req, res) => {
  const stats = {
    totalConnections: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.entries()).map(
      ([roomId, players]) => ({
        roomId,
        playerCount: players.size,
      }),
    ),
  };

  return res.json(stats);
});
```

## Optimisations et Bonnes Pratiques

### 1. Reduce Message Frequency

```javascript
// Limiter le nombre de messages émis
let lastActionTime = {};

socket.on('action', (data) => {
  if (Date.now() - (lastActionTime[socket.id] || 0) < 50) {
    return; // Ignorer les actions trop fréquentes
  }
  lastActionTime[socket.id] = Date.now();

  io.to(socket.gameId).emit('player_action', {...});
});
```

### 2. Client-Side Prediction

Le client **prédit** la position du joueur localement pour une meilleure réactivité :

```javascript
// Client-side prediction
function movePlayer(direction) {
  // Mettre à jour la position localement
  myPlayer.x += direction === "right" ? 10 : -10;

  // Envoyer l'action au serveur
  socket.emit("action", {
    type: "move",
    direction,
    clientTimestamp: Date.now(),
  });
}

socket.on("game_state", (data) => {
  // Corriger la position si différence détectée
  if (Math.abs(data.myPosition.x - myPlayer.x) > threshold) {
    myPlayer.x = data.myPosition.x;
  }
});
```

### 3. Connection Fallback

```javascript
const socket = io(wsServer, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    // Serveur volontairement fermé
  } else {
    // Reconnexion automatique
  }
});
```

---

**Voir aussi** :

- [BACKEND.md](BACKEND.md) - Module Jeu
- [FRONTEND.md](FRONTEND.md) - Composant Game
- [ARCHITECTURE.md](ARCHITECTURE.md) - Vue globale

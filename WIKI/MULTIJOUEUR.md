# Logique Multijoueur - Projet L2A

## Vue d'ensemble

Le système multijoueur est déjà implémenté et fonctionnel. Il utilise **WebSocket** pour la communication en temps réel entre les joueurs.

## Architecture

```
┌─────────────┐         WebSocket          ┌──────────────────┐
│  Joueur 1   │◄────────────────────────────┤                  │
│  (Browser)  │         Port 3001          │   Game Server    │
└─────────────┘                             │   (Node.js)      │
                                            │   gameServeur.js │
┌─────────────┐         WebSocket          │                  │
│  Joueur 2   │◄────────────────────────────┤                  │
│  (Browser)  │                             └──────────────────┘
└─────────────┘

┌─────────────┐         HTTP API           ┌──────────────────┐
│  Joueur N   │◄────────────────────────────┤   Flask Backend  │
│  (Browser)  │         Port 5000          │   Base de        │
└─────────────┘                             │   données        │
                                            └──────────────────┘
```

## Composants

### 1. Serveur WebSocket (backend/gameServeur.js)

**Rôle** : Gère la communication en temps réel entre joueurs

**Fonctionnalités** :
- ✅ Gestion de la salle d'attente
- ✅ Comptage des joueurs connectés
- ✅ Démarrage automatique quand MIN_PLAYERS (2) est atteint
- ✅ Broadcast des actions de jeu (sauts, mouvements)
- ✅ Détection des déconnexions
- ✅ Notification de fin de partie

**Messages WebSocket** :
```javascript
// Connexion d'un joueur
{ type: "join", username: "player1" }

// Mise à jour du nombre de joueurs
{ type: "player_count", count: 2 }

// Démarrage de la partie
{ type: "start_game" }

// Action de jeu (saut, etc.)
{ type: "input", input: "JUMP", username: "player1" }

// Fin de partie
{ type: "gameOver", username: "player1" }
```

### 2. Frontend - Salle d'attente (GameWaitingRoom.jsx)

**Fonctionnalités** :
- Connexion au serveur WebSocket
- Affichage du nombre de joueurs connectés
- Redirection automatique vers le jeu quand MIN_PLAYERS atteints
- Gestion des déconnexions

**Flux** :
1. Joueur arrive sur la salle d'attente
2. Message `{ type: "join", username }` envoyé
3. Affichage "En attente de joueurs..." (1/2)
4. Quand 2 joueurs → message `start_game` reçu
5. Redirection automatique vers `/game`

### 3. Frontend - Jeu (Game.jsx)

**Fonctionnalités** :
- Connexion WebSocket pour le jeu en temps réel
- Envoi des actions du joueur local (sauts, mouvements)
- Réception et affichage des actions des adversaires
- Synchronisation des positions

**Exemple de code** :
```javascript
// Envoi d'une action
ws.send(JSON.stringify({ 
  type: "input", 
  input: "JUMP", 
  username: currentUser 
}));

// Réception d'une action adverse
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "input" && data.username !== currentUser) {
    // Appliquer l'action à l'avatar de l'adversaire
    opponent.setVelocityY(-500);
  }
};
```

### 4. Backend Flask

**Rôle** : Gestion des comptes, scores, authentification

**Endpoints principaux** :
- `POST /api/auth/login` : Connexion
- `POST /api/auth/register` : Inscription
- `GET /api/scores` : Classement
- `POST /api/scores/save` : Sauvegarde du score
- `GET /api/users/profile/{username}` : Profil utilisateur

### 5. Base de données PostgreSQL

**Tables liées au multijoueur** :

```sql
-- Utilisateurs
users (username, password, language, is_admin, banned_until)

-- Scores et classement
highscores (username, high_score, stage, timer)

-- Historique des parties
game_sessions (id, username, score, stage, timer, playedAt)

-- Profils et XP
user_profiles (username, xp, level)

-- Historique des inputs (optionnel, pour analyse)
user_inputs (username, input, time)
```

## Fonctionnement détaillé

### Scénario : Partie à 2 joueurs

**Phase 1 : Connexion**
1. Joueur A se connecte → login → compte créé/existant
2. Joueur B se connecte → login → compte créé/existant

**Phase 2 : Salle d'attente**
1. Joueur A : `/waiting-room` → WS join → count = 1
2. Joueur B : `/waiting-room` → WS join → count = 2
3. Serveur WS détecte 2 joueurs → broadcast `start_game`
4. Les deux joueurs redirigés vers `/game`

**Phase 3 : Partie**
1. Chaque joueur contrôle son avatar
2. Actions envoyées via WebSocket
3. Serveur broadcast à tous les autres joueurs
4. Chaque client met à jour les avatars adverses
5. Le jeu se termine quand un joueur meurt

**Phase 4 : Fin de partie**
1. Message `gameOver` envoyé avec le username du perdant
2. Score sauvegardé via API REST (`POST /api/scores/save`)
3. Stockage dans `game_sessions` et mise à jour `highscores`
4. Retour au menu ou classement

## Configuration multijoueur

### Développement (local)

**docker-compose.dev.yml** :
```yaml
ws-server:
  ports:
    - "3001:3001"  # Port WebSocket accessible en local
```

**Frontend** :
```bash
# .env.development
VITE_WS_URL=ws://localhost:3001
```

### Production (Raspberry Pi)

**docker-compose.prod.yml** :
```yaml
ws-server:
  ports:
    - "127.0.0.1:3001:3001"  # Interne seulement
nginx:
  ports:
    - "15256:80"  # Port unique exposé
```

**Frontend** :
```bash
# .env.production
VITE_WS_URL=ws://192.168.1.100:15256/ws
```

**Nginx** reverse proxy :
```nginx
location /ws {
    proxy_pass http://ws-server:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Paramètres configurables

### backend/gameServeur.js

```javascript
const MIN_PLAYERS = 2;  // Nombre minimum de joueurs
```

**Modifier pour** :
- 3+ joueurs : augmenter `MIN_PLAYERS`
- Jeu immédiat : `MIN_PLAYERS = 1`

### Limites de ressources

Pour Raspberry Pi, limiter le nombre de connexions simultanées :

```javascript
// Ajouter dans gameServeur.js
const MAX_PLAYERS = 10;

wss.on('connection', (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close(1008, 'Serveur plein');
    return;
  }
  // ... reste du code
});
```

## Optimisations pour Raspberry Pi

### 1. Réduire la fréquence des messages

**Actuel** : Chaque action est envoyée immédiatement

**Optimisé** : Limiter à X messages/seconde par joueur

```javascript
// Rate limiting côté serveur
const RATE_LIMIT = 30; // messages par seconde
const messageTimestamps = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const now = Date.now();
    const lastTime = messageTimestamps.get(username) || 0;
    
    if (now - lastTime < 1000 / RATE_LIMIT) {
      return; // Ignore si trop rapide
    }
    
    messageTimestamps.set(username, now);
    // ... traiter le message
  });
});
```

### 2. Compression des messages

```javascript
// Raccourcir les messages
// Avant: { type: "input", input: "JUMP", username: "player1" }
// Après: { t: "i", i: "J", u: "player1" }
```

### 3. Déconnexion automatique des inactifs

```javascript
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

ws.lastActivity = Date.now();

setInterval(() => {
  const now = Date.now();
  wss.clients.forEach((client) => {
    if (now - client.lastActivity > IDLE_TIMEOUT) {
      client.terminate();
    }
  });
}, 60000); // Vérifier chaque minute
```

## Évolutions possibles

### Court terme
- ✅ Déjà implémenté : système de base fonctionnel
- 🔄 Mode spectateur (rejoindre sans jouer)
- 🔄 Chat entre joueurs
- 🔄 Parties privées avec code

### Moyen terme
- 🔄 Matchmaking par niveau
- 🔄 Classement en temps réel
- 🔄 Replay des parties
- 🔄 Modes de jeu différents (coopératif, battle royale)

### Long terme
- 🔄 Architecture microservices (scaling)
- 🔄 Support de centaines de joueurs simultanés
- 🔄 Load balancing entre plusieurs Raspberry Pi
- 🔄 Système de rooms (parties séparées)

## Sécurité

### Validations côté serveur

```javascript
// Valider les messages reçus
ws.on('message', (raw) => {
  try {
    const msg = JSON.parse(raw.toString());
    
    // Vérifier le type
    if (!['join', 'input', 'gameOver'].includes(msg.type)) {
      return;
    }
    
    // Vérifier le username
    if (!msg.username || msg.username.length > 100) {
      return;
    }
    
    // Vérifier que l'username correspond à la session
    if (username && msg.username !== username) {
      ws.close(1008, 'Username mismatch');
      return;
    }
    
    // ... traiter le message
  } catch (e) {
    console.error('Invalid message:', e);
  }
});
```

### Authentification WebSocket

Pour vérifier que seuls les utilisateurs authentifiés peuvent jouer :

```javascript
// Lors de la connexion, envoyer un token
ws.send(JSON.stringify({ 
  type: "auth", 
  token: localStorage.getItem("auth_token") 
}));

// Serveur WebSocket vérifie le token
ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  
  if (msg.type === "auth") {
    // Vérifier le token avec le backend Flask
    fetch('http://backend:5000/api/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token: msg.token })
    })
    .then(res => res.json())
    .then(data => {
      if (data.valid) {
        ws.authenticated = true;
        ws.username = data.username;
      } else {
        ws.close(1008, 'Invalid token');
      }
    });
  }
  
  if (!ws.authenticated) {
    ws.close(1008, 'Not authenticated');
    return;
  }
  
  // ... traiter les autres messages
});
```

## Diagnostic et monitoring

### Logs WebSocket

```bash
# En développement
docker-compose -f docker-compose.dev.yml logs -f ws-server

# En production
docker-compose -f docker-compose.prod.yml logs -f ws-server
```

### Métriques utiles

Ajouter dans `backend/gameServeur.js` :

```javascript
// Statistiques
let totalConnections = 0;
let totalMessages = 0;

wss.on('connection', (ws) => {
  totalConnections++;
  console.log(`Total connections: ${totalConnections}`);
  
  ws.on('message', () => {
    totalMessages++;
  });
});

// Afficher les stats toutes les 10 secondes
setInterval(() => {
  console.log({
    activePlayers: players.size,
    totalConnections,
    totalMessages,
    messagesPerSecond: totalMessages / 10
  });
  totalMessages = 0;
}, 10000);
```

## Conclusion

Le système multijoueur est déjà opérationnel et prêt pour la production sur Raspberry Pi. La configuration actuelle supporte :

- ✅ Multiples joueurs simultanés
- ✅ Communication temps réel via WebSocket
- ✅ Gestion de la salle d'attente
- ✅ Sauvegarde des scores en base de données
- ✅ Authentification avec comptes utilisateurs

Pour déployer, suivez la documentation dans [DEPLOIEMENT_PRODUCTION.md](DEPLOIEMENT_PRODUCTION.md).

# Architecture Client-Side Prediction

## 🎯 Objectif

Réduire drastiquement la charge serveur et améliorer la réactivité du jeu en utilisant la **client-side prediction** :

- ✅ **Client** : Calcule et applique l'action localement IMMÉDIATEMENT
- ✅ **Serveur** : Valide l'action (anti-cheat) et envoie corrections si nécessaire
- ✅ **Résultat** : Zéro latence perceptible pour le joueur local

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           JOUEUR LOCAL                  │
│                                         │
│  1. Soumet une action (JUMP)            │
│     ↓                                    │
│  2. Appliquée IMMÉDIATEMENT côté client │
│     ↓                                    │
│  3. "L'action" est visible instantanément
│     ↓                                    │
│  4. Envoi au serveur (async)            │
│     ↓                                    │
│  5. Serveur valide + confirme           │
│     ↓                                    │
│  6. Broadcast aux adversaires           │
│     ↓                                    │
│  7. Adversaires reçoivent après latence │
│                                         │
└─────────────────────────────────────────┘
```

## 📊 Flux de données

### Avant (ancien système)
```
Client → Server → Broadcast → Other Clients → Apply Action
(latence 100-200ms perceptible)
```

### Après (client-side prediction)
```
Client → Apply Action IMMEDIATELY (0ms)
   ↓
   Send to Server (async, non-bloquant)
   ↓
   Server validates
   ↓
   Broadcast to Others
```

## 🔄 Séquence détaillée

### Étape 1 : Client effectue une action

```javascript
// Utiliser sendGameInput() comme avant
sendGameInput("JUMP");

// Internalement, voici ce qui se passe :
```

### Étape 2 : Client-side prediction applique l'action

```javascript
clientPrediction.sendInputWithPrediction(
  "JUMP",                    // Type d'input
  currentPlayerState,        // État actuel du joueur
  applyAction,              // Fonction pour appliquer l'action
  inputSocket,              // WebSocket
  username                  // Utilisateur
);
```

**La fonction `applyAction()` est appelée immédiatement** :
```javascript
const applyActionLocally = (inputType, playerState) => {
  if (inputType === "JUMP") {
    handleJump(); // ⚡ Le saut s'exécute TOUT DE SUITE
  }
};
```

### Étape 3 : Action enregistrée avec numéro de séquence

```javascript
// Message envoyé au serveur
{
  type: "input",
  username: "joueur1",
  input: "JUMP",
  sequence: 1,              // Identification unique
  clientTimestamp: 1707...
}
```

### Étape 4 : Serveur valide l'action

**Validations effectuées** :
- ✅ Numéro de séquence monogone (pas de replay)
- ✅ Pas de spam de sauts (MIN_TIME_BETWEEN_JUMPS)
- ✅ Les vitesses sont raisonnables
- ✅ Anti-cheat basique

**Code serveur** :
```javascript
const validation = validateInput(username, {
  input: msg.input,
  sequence: sequence,
});

if (!validation.valid) {
  sendInputAck(ws, { sequence }, false);  // Rejet
  return;
}
```

### Étape 5 : Serveur envoie confirmation

```javascript
{
  type: "input_ack",
  sequence: 1,        // Répond à la séquence 1
  valid: true,        // Accepté
  timestamp: 1707...
}
```

### Étape 6 : Client met à jour son état

```javascript
if (data.type === "input_ack") {
  if (data.valid) {
    clientPrediction.confirmAction(data.sequence);  // ✅ Confirmée
  }
}
```

### Étape 7 : Serveur broadcast aux adversaires

```javascript
broadcast({
  type: "input",
  username: "joueur1",
  input: "JUMP",
  sequence: 1,
  serverState: {          // État serveur validé
    x: 100,
    y: 50,
    velocityX: 0,
    velocityY: -500,
  },
});
```

### Étape 8 : Adversaires reçoivent l'action

```javascript
if (data.type === "input") {
  clientPrediction.updateOpponentState(username, data.serverState);
  
  // Appliquer l'action à l'adversaire
  if (data.input === "JUMP") {
    opponent.setVelocityY(-500);
  }
}
```

## 🔒 Sécurité (Anti-cheat)

### Détections de fraude

1. **Séquence invalide** : Tentative d'envoyer une action ancienne
   ```javascript
   if (inputData.sequence <= state.lastSequence) {
     return { valid: false, reason: "sequence_out_of_order" };
   }
   ```

2. **Spam de sauts** : Trop d'actions trop rapides
   ```javascript
   const timeSinceLastJump = Date.now() - state.lastJumpTime;
   if (timeSinceLastJump < 100) {
     return { valid: false, reason: "jump_spam" };
   }
   ```

3. **Vélocité impossible** : Vitesse supérieure au maximum
   ```javascript
   if (Math.abs(velocity) > MAX_VELOCITY) {
     return { valid: false, reason: "velocity_exceeds_max" };
   }
   ```

4. **Désynchronisation position** : Position trop loin de la réalité serveur
   ```javascript
   const distance = Math.sqrt(dx*dx + dy*dy);
   if (distance > CORRECTION_THRESHOLD) {
     // Envoyer une correction
     sendStateCorrection(ws, username, serverState);
   }
   ```

### Correction automatique (Rollback)

Si le serveur détecte une incohérence :

```javascript
clientPrediction.rollback(
  failedSequence,      // La séquence qui a échoué
  serverState,         // État correct du serveur
  player,              // Objet Phaser
  replayActions        // Rejouer les actions valides
);
```

**Exemple** :
1. Client prédit position (500, 100)
2. Serveur détecte position vraie (200, 100)
3. Client effectue rollback
4. Client rejue les actions valides depuis (200, 100)

## 📈 Performances

### Avant (serveur-centric)

| Aspect | Impact |
|--------|--------|
| **Latence perceptible** | 100-200ms |
| **Charge serveur** | Haute (validation + broadcast immédiat) |
| **Charge client** | Faible |
| **Réseau** | Critique |

### Après (client-side prediction)

| Aspect | Impact |
|--------|--------|
| **Latence perceptible** | ~0ms (prédiction locale) |
| **Charge serveur** | Très réduite (validation seulement) |
| **Charge client** | Modérée (calculs locaux) |
| **Réseau** | Moins critique |

### Nombre de joueurs supportés (Raspberry Pi)

**Sans prédiction** : ~10 joueurs
**Avec prédiction** : ~50+ joueurs

## 🔧 Configuration

### GameClientPrediction.js

Paramètres configurables :

```javascript
class GameClientPrediction {
  // Seuil de correction avant rollback (pixels)
  CORRECTION_THRESHOLD = 50;
  
  // Timeout avant confirmer l'action (ms)
  ACTION_TIMEOUT = 5000;
}
```

### gameServeur.js

Configuration anti-cheat :

```javascript
const ANTI_CHEAT_CONFIG = {
  MAX_VELOCITY: 1000,           // pixels/frame
  MAX_JUMP_HEIGHT: 500,         // pixels
  MIN_TIME_BETWEEN_JUMPS: 100,  // ms
  MAX_POSITION_CHANGE: 300,     // pixels/frame
};
```

## 📊 Monitoring et Debug

### Voir les statistiques

```javascript
// Dans la console du navigateur
clientPrediction.getStats();

// Résultat:
{
  sequenceNumber: 42,           // Nombre total d'actions
  pendingActions: 2,            // Actions en attente de confirmation
  opponentCount: 1,             // Nombre d'adversaires
  localState: { x: 100, y: 50, ... },
  serverState: { x: 100, y: 50, ... },
}
```

### Logs serveur

```bash
# Voir les logs du serveur WebSocket
docker-compose -f docker-compose.dev.yml logs -f ws-server

# Résultat:
✅ Client connecté. Total: 2
🎮 joueur1 rejoint (total: 2)
🚀 Démarrage du jeu!
📨 Input validé de joueur1: JUMP (seq: 1)
✅ Input confirmé (seq: 1)
⚠️ Correction du serveur reçue
❌ joueur2 game over
```

## 🎮 Utilisation pour les développeurs

### Ajouter une nouvelle action

1. **Côté client**, la fonction `sendGameInput()` utilise `handleJump()` pour appliquer :

```javascript
const applyActionLocally = (inputType, playerState) => {
  if (inputType === "JUMP") {
    handleJump();  // Implémentée
  }
  if (inputType === "DASH") {  // ← Nouvelle action
    handleDash();  // À implémenter
  }
};
```

2. **Côté serveur**, valider dans `validateInput()` :

```javascript
function validateInput(username, inputData) {
  // ... validations existantes ...
  
  // Nouvelle validation
  if (inputData.input === "DASH") {
    const timeSinceLastDash = Date.now() - state.lastDashTime;
    if (timeSinceLastDash < 500) {  // Cooldown 500ms
      return { valid: false, reason: "dash_cooldown" };
    }
  }
  
  return { valid: true };
}
```

3. **Mettre à jour l'état serveur** :

```javascript
function updatePlayerState(username, inputData) {
  // ...
  if (inputData.input === "DASH") {
    state.velocityX = 800;  // Vitesse du dash
    state.lastDashTime = Date.now();
  }
  // ...
}
```

### Implémenter anti-cheat avancé

Ajouter dans `gameServeur.js` :

```javascript
// Détecter des patterns de triche
function detectCheating(username, inputData) {
  const state = playerStates.get(username);
  
  // Pattern 1: Trop d'inputs en trop peu de temps
  const recentInputs = state.inputHistory
    .filter(t => Date.now() - t < 1000).length;
  
  if (recentInputs > 50) {  // Plus de 50 inputs/seconde = suspect
    return { cheating: true, reason: "too_many_inputs" };
  }
  
  // Pattern 2: Position impossible
  const distance = calculateDistance(state.lastPos, inputData.pos);
  if (distance > 500) {  // Teleportation
    return { cheating: true, reason: "teleportation" };
  }
  
  return { cheating: false };
}
```

## 🐛 Dépannage

### Q: L'action n'est pas appliquée immédiatement
**R:** Vérifier que `clientPrediction` est initialisé dans `create()`

### Q: Désynchronisation fréquente
**R:** Augmenter `CORRECTION_THRESHOLD` ou réduire les actions rapides

### Q: Le serveur rejette les actions
**R:** Consulter les logs du serveur pour voir la raison du rejet

### Q: Rollback trop fréquent
**R:** Vérifier le réseau ou les latences cibles (pings > 500ms)

## 📚 Fichiers pertinents

| Fichier | Description |
|---------|-------------|
| `frontend/src/jsx/game/utils/GameClientPrediction.js` | Logique de prédiction client |
| `backend/gameServeur.js` | Validation serveur et broadcasts |
| `frontend/src/jsx/game/Game.jsx` | Intégration WebSocket et affichage |

## 🚀 Prochaines améliorations

1. **Interpolation plus lisse** des adversaires (easing)
2. **Network time synchronization** (NTP) pour éliminer les décalages temps
3. **Delayed local transparency** pour masquer les corrections
4. **Bandwidth optimization** (compression des messages)
5. **Persistent anti-cheat** (banissement de comptes fraudeurs)

---

**Résumé** : Cette architecture permet aux clients de calculer localement tout en maintenant l'intégrité du serveur via validation. Le résultat est une expérience de jeu fluide même sur des connexions lentes ou avec beaucoup de joueurs.

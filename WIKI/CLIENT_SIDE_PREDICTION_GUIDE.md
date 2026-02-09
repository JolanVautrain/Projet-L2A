# Guide d'implémentation rapide - Client-Side Prediction

## 🚀 Démarrage (5 minutes)

### 1. Le système est déjà intégré !

Les fichiers suivants ont été créés/modifiés :

```
✅ frontend/src/jsx/game/utils/GameClientPrediction.js  (NEW)
✅ backend/gameServeur.js                              (MODIFIÉ)
✅ frontend/src/jsx/game/Game.jsx                      (MODIFIÉ)
```

### 2. Vérifier que ça marche

```bash
# Terminal 1: Développement
docker-compose -f docker/docker-compose.dev.yml up -d

# Terminal 2: Voir les logs du serveur WebSocket
docker-compose -f docker/docker-compose.dev.yml logs -f ws-server

# Terminal 3: Ouvrir le navigateur
# http://localhost:5173
# Tester avec 2 joueurs
```

### 3. Vérifier les logs

Dans le navigateur (Console DevTools - F12) :
```
✅ Input confirmé (seq: 1)
✅ Action adversaire: joueur2 JUMP
```

Dans les logs du serveur :
```
✅ Input validé de joueur1: JUMP (seq: 1)
📨 Input validé de joueur2: JUMP (seq: 1)
```

---

## 🔧 Utilisation courante

### Ajouter une nouvelle action

**Étape 1** : Dans `Game.jsx`, modifier `sendGameInput()` pour supporter la nouvelle action :

```javascript
export function sendGameInput(type) {
  // ... code existant ...
  
  const applyActionLocally = (inputType, playerState) => {
    if (inputType === "JUMP") {
      handleJump();
    }
    if (inputType === "DASH") {           // ← NOUVELLE ACTION
      handleDash();  // À implémenter dans GamePhysics.js
    }
    if (inputType === "SHIELD") {         // ← NOUVELLE ACTION
      activateShield();  // À implémenter
    }
  };
  
  // Reste du code...
}
```

**Étape 2** : Dans `gameServeur.js`, ajouter la validation :

```javascript
function validateInput(username, inputData) {
  const state = playerStates.get(username) || { /* ... */ };

  // Validations existantes
  if (inputData.sequence <= state.lastSequence) {
    return { valid: false, reason: "sequence_out_of_order" };
  }

  // NOUVELLE VALIDATION pour DASH
  if (inputData.input === "DASH") {
    const timeSinceLastDash = Date.now() - (state.lastDashTime || 0);
    if (timeSinceLastDash < 500) {  // Cooldown 500ms
      return { valid: false, reason: "dash_cooldown" };
    }
  }

  // NOUVELLE VALIDATION pour SHIELD
  if (inputData.input === "SHIELD") {
    if (!state.shieldEnergy || state.shieldEnergy < 20) {
      return { valid: false, reason: "insufficient_energy" };
    }
  }

  return { valid: true };
}
```

**Étape 3** : Mettre à jour l'état serveur :

```javascript
function updatePlayerState(username, inputData) {
  let state = playerStates.get(username) || { /* ... */ };

  state.lastSequence = inputData.sequence;

  if (inputData.input === "JUMP") {
    state.velocityY = -500;
    state.lastJumpTime = Date.now();
  }

  if (inputData.input === "DASH") {        // ← NOUVELLE
    state.velocityX = 800;
    state.lastDashTime = Date.now();
  }

  if (inputData.input === "SHIELD") {      // ← NOUVELLE
    state.shieldEnergy = Math.max(0, state.shieldEnergy - 20);
  }

  playerStates.set(username, state);
  return state;
}
```

---

## 🐛 Debug et monitoring

### Voir les stats de prédiction

Dans la console du navigateur (F12) :

```javascript
// Obtenir les stats
console.log(clientPrediction.getStats());

// Résultat:
{
  sequenceNumber: 42,
  pendingActions: 2,
  opponentCount: 1,
  localState: { x: 100, y: 50, velocityX: 0, velocityY: -500, ... },
  serverState: { x: 100, y: 50, velocityX: 0, velocityY: -500, ... }
}
```

### Voir les actions en attente

```javascript
// Nombre d'actions non confirmées
console.log(clientPrediction.pendingActions);

// Chaque action contient:
// { sequence, type, timestamp, clientState }
```

### Voir les logs du serveur

```bash
# En temps réel
docker-compose -f docker/docker-compose.dev.yml logs -f ws-server

# Filtrer les inputs
docker-compose -f docker/docker-compose.dev.yml logs ws-server | grep "Input validé"
```

---

## ⚙️ Configuration

### Modifier les paramètres

**Seuil de correction** (dans `GameClientPrediction.js`) :

```javascript
// Pixels avant de considérer comme désynchronisé
this.CORRECTION_THRESHOLD = 50;  // ← Augmenter pour plus tolérant
```

**Anti-cheat** (dans `gameServeur.js`) :

```javascript
const ANTI_CHEAT_CONFIG = {
  MAX_VELOCITY: 1000,              // Plus permissif
  MAX_JUMP_HEIGHT: 500,
  MIN_TIME_BETWEEN_JUMPS: 100,     // Plus strict = moins de spam
  MAX_POSITION_CHANGE: 300,
};
```

**Timeout d'action** (dans `GameClientPrediction.js`) :

```javascript
// Combien de temps mémoriser une action
this.ACTION_TIMEOUT = 5000;  // 5 secondes
```

---

## 🧪 Tests

### Test d'action instantanée

```javascript
// Avant
// - Appuyer sur JUMP
// - Voir l'animation après ~100ms

// Après
// - Appuyer sur JUMP
// - Voir l'animation IMMÉDIATEMENT (~5ms)
```

### Test de correction

Simuler une désynchronisation :

```javascript
// Dans GameClientPrediction.js, modifier CORRECTION_THRESHOLD à 10
// Puis, sur le serveur, forcer une position différente

// Résultat:
// - Character jump immédiatement
// - Si position dévie de 10px, correction appliquée
// - Rollback et rejeu des actions
```

### Test d'anti-cheat

```javascript
// Dans la console
for (let i = 0; i < 100; i++) {
  sendGameInput("JUMP");
}

// Résultat:
// - Logs: "jump_spam" rejected
// - Character peut sauter max 1x/100ms
// - Actions spam ignorées
```

---

## 📊 Validation

### Checklist avant production

- [ ] Actions appliquées instantanément (pas de latence perceptible)
- [ ] Confirmations reçues des serveur dans les logs
- [ ] Corrections appliquées en cas de désynchronisation
- [ ] Anti-cheat empêche les fraudes (spam, teleportation)
- [ ] Les adversaires se voient les uns les autres
- [ ] Scores sauvegardés correctement
- [ ] Aucun crash serveur avec 10+ joueurs
- [ ] Pas de message d'erreur en console

### Performance

Vérifier avec DevTools (F12 → Network) :

```
WebSocket messages:
- Dans: ~50 messages/joueur/seconde (normal)
- Out: ~50 confirmations/joueur/seconde (normal)
- Taille: < 200 bytes par message

CPU usage: < 20% sur client (JavaScript)
RAM: < 100MB sur client
```

---

## 🔍 Résolution de problèmes

### Problème: Actions pas immédiate

**Symptôme**: Character saute après latence réseau

**Solution 1**: Vérifier que `clientPrediction` est initialisé
```javascript
if (!clientPrediction) {
  console.error("clientPrediction not initialized!");
}
```

**Solution 2**: Vérifier que `applyAction` est appelée
```javascript
const applyActionLocally = (inputType) => {
  console.log("Applying:", inputType);  // ← Doit s'afficher
  handleJump();
};
```

### Problème: Rollback fréquent

**Symptôme**: Character "jumps back"

**Cause**: Position du client trop différente du serveur

**Solution**:
1. Augmenter `CORRECTION_THRESHOLD` (moins sensible)
2. Vérifier la latence réseau (ping > 500ms?)
3. Vérifier les calculs de physique sont cohérents

### Problème: Adversaire "jumps erratically"

**Symptôme**: Adversaire teleporte ou saute bizarrement

**Cause**: Interpolation non lissée

**Solution**: 
```javascript
// Dans GameClientPrediction.js
// Améliorer interpolateOpponentPosition()
// Utiliser easing ou spline au lieu de linéaire
```

### Problème: Serveur plein de logs "Correction"

**Symptôme**: Beaucoup de corrections appliquées

**Cause**: Désynchronisation fréquente

**Solution**:
```javascript
// Vérifier que les deux clients calculent pareil
// Vérifier que les inputs arrivent dans le bon ordre
// Vérifier la latence réseau
```

---

## 💡 Optimisations avancées

### Message compression

Réduire la taille des messages JSON :

```javascript
// Avant (200 bytes)
{
  type: "input",
  username: "joueur1",
  input: "JUMP",
  sequence: 1,
  clientTimestamp: 1707...
}

// Après (50 bytes)
{
  t: "i",
  u: "j1",
  i: "J",
  s: 1
}
```

### Rate limiting côté client

Limiter les messages envoyés :

```javascript
class RateLimiter {
  constructor(maxPerSecond) {
    this.maxPerSecond = maxPerSecond;
    this.lastMessageTime = 0;
  }
  
  canSend() {
    const now = Date.now();
    if (now - this.lastMessageTime < 1000 / this.maxPerSecond) {
      return false;
    }
    this.lastMessageTime = now;
    return true;
  }
}

// Usage
const limiter = new RateLimiter(30);  // Max 30 messages/sec
if (limiter.canSend()) {
  sendGameInput("JUMP");
}
```

### Interpolation lissée

Utiliser easing pour smooth opponent movement :

```javascript
// Easing function
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Application
const t = (Date.now() % 100) / 100;  // Lerp over 100ms
const eased = easeInOutQuad(t);
opponent.x = startX + (endX - startX) * eased;
```

---

## 📚 Fichiers de référence

| Fichier | Ligne | Contenu |
|---------|-------|---------|
| `GameClientPrediction.js` | 1-200 | Classe principale de prédiction |
| `gameServeur.js` | 1-100 | Validation anti-cheat |
| `Game.jsx` | 91-130 | Intégration WebSocket |
| `Game.jsx` | 410-460 | Gestion des messages |

---

## ✅ Résumé

1. **C'est déjà implémenté** - Pas besoin de faire grand chose
2. **Pour tester** - Lancer 2 clients et jouer
3. **Pour ajouter action** - 3 étapes : client → serveur validation → serveur update
4. **Pour debug** - Utiliser console et logs serveur
5. **Pour optimiser** - Configuration + compression + rate limiting

Enjoy la fluidité améliorée ! 🚀

# Tests WebSocket - Scénarios Multijoueur

## Description

Le fichier `test_scenario_multijoueur_websocket.py` contient des tests pour valider le système multijoueur basé sur WebSocket du projet. Ces tests simulent des joueurs connectés en simultané au serveur de jeu.

## Tests inclus

### 1. `test_10_joueurs_connectes` 
Simule 10 joueurs connectés simultanement qui :
- Se connectent au serveur WebSocket (port 3001)
- Rejoignent le lobby
- Reçoivent les mises à jour du nombre de joueurs
- Attendant le démarrage automatique du jeu (quand MIN_PLAYERS=2 est atteint)
- Rejoignent la partie
- Envoient des inputs (actions de saut)
- Reçoivent les confirmations (input_ack)
- Signalent la fin de partie (gameOver)
- Se déconnectent proprement

**Durée estimée** : ~10-15 secondes

### 2. `test_message_broadcast_vers_groupe`
Vérifie que les messages sont correctement broadcastés à tous les joueurs d'un groupe :
- 3 joueurs se connectent
- Rejoignent le lobby
- Reçoivent les mises à jour de comptage (player_count)
- Vérifient que chaque joueur reçoit les mises à jour global du groupe

**Durée estimée** : ~3-5 secondes

### 3. `test_reconnexion_apres_deconnexion`
Teste la reconnexion d'un joueur après déconnexion :
- Un joueur se connecte et rejoint le lobby
- Se déconnecte
- Se reconnecte au serveur
- Rejoint à nouveau le lobby
- Vérifie qu'il reçoit les messages

**Durée estimée** : ~3-5 secondes

## Exécution des tests

### Via le script principal
```bash
./script/run_tests.sh
```

Le script va automatiquement :
1. Démarrer le serveur WebSocket sur le port 3001
2. Exécuter tous les tests frontend (incluant les tests websocket)
3. Arrêter le serveur WebSocket
4. Générer les rapports dans `test/reports/`

### Exécution isolée des tests websocket
```bash
# Démarrer d'abord le serveur WebSocket dans un terminal
cd backend && npm install && node gameServeur.js

# Dans un autre terminal, exécuter les tests
cd projet-l2a-g34
python3 -m pytest test/frontend/test_scenario_multijoueur_websocket.py -v
```

### Exécution d'un test spécifique
```bash
python3 -m pytest test/frontend/test_scenario_multijoueur_websocket.py::TestScenarioMultijoueurWebSocket::test_10_joueurs_connectes -v
```

### Exécution avec output verbose
```bash
python3 -m pytest test/frontend/test_scenario_multijoueur_websocket.py -v -s
```

L'option `-s` affiche les messages print() pour suivre la progression en direct.

## Architecture des tests

Les tests utilisent la classe `WebSocketPlayer` qui simule un joueur avec :
- Connexion WebSocket gérée
- Listeners pour recevoir les messages serveur
- Méthodes pour envoyer les actions (join, input, gameOver, etc.)
- État local (match_id, game_started, game_over, received_messages)

### Flux de communication WebSocket

```
Client                          Serveur (gameServeur.js)
  │                                     │
  ├─ join_lobby ──────────────────────► │
  │                        (MAJ lobby)  │
  ◄─ player_count ───────────────────── │
  │                     (n joueurs)     │
  │                                     │ (Si n >= MIN_PLAYERS=2)
  │                                     ├─ Création match
  ◄─ start_game ─────────────────────── │
  │                    (avec matchId)   │
  │                                     │
  ├─ join_game ───────────────────────► │
  │                 (username+matchId)  │
  ◄─ join_ok ───────────────────────── │
  │                                     │
  ├─ input ───────────────────────────► │ (JUMP)
  │                                     │ (validation + broadcast)
  ◄─ input_ack ──────────────────────── │
  │                                     │
  ◄─ input ──────────────────────────── │ (autre joueur)
  │                   (broadcast)       │
  │                                     │
  ├─ gameOver ────────────────────────► │
  │                                     │
  ◄─ gameOver ────────────────────────── │
  │                 (broadcast à groupe)│
```

## Dépendances

Les tests nécessitent :
- `pytest` : Framework de test
- `pytest-asyncio` : Support des tests async/await
- `websockets` : Bibliothèque WebSocket Python
- `Node.js` : Pour lancer le serveur gameServeur.js

Ces dépendances sont dans `backend/requirements-dev.txt`.

## Debugging

### Vérifier que le serveur WebSocket est en cours d'exécution
```bash
netstat -tlnp | grep 3001
# ou
lsof -i :3001
```

### Consulter les logs du serveur WebSocket
```bash
tail -f test/reports/websocket-server.log
```

### Consulter les logs des tests
```bash
tail -f test/reports/pytest-frontend.log
```

## Points importants à noter

1. **Port 3001** : Le serveur WebSocket doit être accessible sur `ws://localhost:3001`
2. **MIN_PLAYERS=2** : Le jeu démarre avec seulement 2 joueurs, pas 10. Les 10 joueurs sont organisés en plusieurs matchs.
3. **Async/await** : Les tests utilisent `asyncio` pour gérer les connexions parallèles
4. **Timeouts** : Les tests incluent des timeouts pour éviter les blocages infinis
5. **Nettoyage** : Les listeners sont correctement cancellés et les connexions fermées en fin de test

## Améliorations possibles

- [ ] Tester la synchronisation d'état entre joueurs
- [ ] Tester les détections de triche (anti-cheat)
- [ ] Tests de performance (latence, throughput)
- [ ] Tests de reconnexion automatique
- [ ] Tester la gestion des disconnexions inattendues
- [ ] Tests des messages d'erreur

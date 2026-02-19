# Concepts Fondamentaux du Projet L2A

## Vue d'ensemble

Cette page explique les **concepts clés** qui structurent le projet L2A.

## 1. Authentification et Sessions

### Concept

Chaque utilisateur doit s'identifier pour accéder aux fonctionnalités du jeu. Le système maintient des **sessions actives** qui expirent après une période d'inactivité.

### Composants

**Côté Frontend** :

- Modal de connexion/inscription
- Stockage du token en `localStorage`
- Redirection vers la page de connexion si session invalide

**Côté Backend** :

- Table `sessions` en PostgreSQL
- Vérification du token dans les headers HTTP (`X-Session-Token`)
- Génération de tokens aléatoires
- Expiration des sessions après 30 minutes d'inactivité

### Flux

```
1. Utilisateur → Formulaire d'inscription
2. Backend créé un nouvel utilisateur
3. Backend génère un token de session
4. Frontend stocke le token
5. Frontend ajoute le token à chaque requête
6. Backend valide le token et traite la requête
```

### Implémentation Clé

**Backend** : `backend/pages/accueil/auth.py`

- `POST /auth/register` - Création de compte
- `POST /auth/login` - Connexion
- `POST /auth/logout` - Déconnexion

## 2. Système de Jeu Multijoueur

### Concept

Le jeu se joue en **parties** avec 2+ joueurs. Chaque partie est une session WebSocket où les joueurs voient les actions les uns des autres **en temps réel**.

### Composants

**Parties** :

- Créées quand un joueur clique "Jouer"
- Attendent au minimum 2 joueurs
- Démarrent automatiquement
- Durent environ 5-10 minutes

**Salles d'attente** :

- Les joueurs attendent que d'autres les rejoignent
- WebSocket affiche le nombre de joueurs connectés
- "En attente d'adversaires..." → "Partie démarre dans 3s"

### Flux

```
1. Joueur A clique "Jouer"
2. Serveur crée une partie
3. Joueur A se connecte en WebSocket
4. Joueur B clique "Jouer"
5. Rejoindre la même partie
6. Serveur détecte 2+ joueurs → Lance le jeu
7. Joueurs jouent et envoient actions via WebSocket
8. À la fin, scores calculés et sauvegardés
```

### États de Partie

```
WAITING    ─────► IN_PROGRESS ─────► FINISHED
(En attente      (Jeu actif)     (Fin, scores
 de joueurs)                       sauvegardés)
```

## 3. Système de Scores et Classement

### Concept

Chaque partie gagnée donne des **points XP** (expérience) basé sur la performance. Un **classement en direct** affiche les meilleurs joueurs.

### Calcul des Scores

```
XP gagnée = Score × Multiplicateur_Difficulté

Classement = Basé sur le total XP de l'utilisateur
Position ≈ Nombre de joueurs avec plus de XP
```

### Endpoints

- `GET /leaderboard` - Top 100 global
- `GET /user/:id/stats` - Statistiques d'un joueur
- `POST /game/end` - Terminer partie et sauvegarder le score

### Détails Implémentation

**Backend** : `backend/pages/classement/scores.py`

- Calculation en base de données pour éviter les fraudes
- Cache possible des résultats top 100
- Mise à jour en temps réel possible via WebSocket

## 4. Système de Boutique (Shop)

### Concept

Les joueurs peuvent acheter des **items** avec leurs points. Ces items peuvent donner des bonus de jeu ou être cosmétiques.

### Types d'Items

- **Cosmétiques** : Skins, avatars (sans bon de jeu)
- **Bonus** : Multiplicateurs XP, vies supplémentaires (affectent le gameplay)
- **Limités** : Disponibles quelque temps seulement

### Mécanique

```
1. Joueur gagne XP en partie
2. Visite la boutique
3. Sees items à acheter
4. Clique "Acheter"
5. Serveur déduit les points
6. Item ajouté à l'inventaire
7. Item peut être équippé pour le jeu
```

### Implémentation

**Backend** : `backend/pages/shop/shop.py`

- `GET /shop` - Liste items disponibles
- `POST /shop/buy` - Acheter un item
- `GET /user/:id/inventory` - Inventaire d'un joueur

## 5. Système de Signalement (Report)

### Concept

Les joueurs peuvent signaler des comportements **toxiques ou tricher**. Les administrateurs examinent et prennent des mesures.

### Types de Signalements

- Triche suspectée
- Langage abusif
- Harcèlement
- Contenu inapproprié

### Flux

```
1. Joueur clique "Signaler ce joueur"
2. Choisit une raison et ajoute des commentaires
3. Backend enregistre le signalement
4. Admin reçoit une notification
5. Admin examine et agit (avertissement, ban, etc.)
```

### Données Conservées

- ID du signalant et du signalé
- Raison et description
- Timestamp du signalement
- Suite donnée (resolved_at, action_taken)

## 6. Panneau d'Administration

### Concept

Les administrateurs ont accès à des **outils de modération** :

- Voir tous les utilisateurs
- Consulter les signalements
- Bannir/suspendre des comptes
- Voir les statistiques du serveur

### Pages Admin

- Liste des utilisateurs + filtrage
- File des signalements non traités
- Journal d'activité (logs)
- Maintenance du serveur

### Sécurité

- Requête `/admin/*` vérifie que l'utilisateur est admin
- Logs de toutes les actions admin
- Accès restreint par IP possible

## 7. Gestion d'État et Synchronisation

### Frontend

**État Global** (React Context ou état local) :

```javascript
{
  user: { id, username, xp, level },
  session: { token, expiresAt },
  game: {
    gameId,
    players: [],
    myScore,
    isLive: boolean
  },
  ui: { currentPage, modalsOpen }
}
```

### Backend

**Session** :

```python
session = {
    "user_id": 123,
    "token": "abc123...",
    "created_at": timestamp,
    "expires_at": timestamp,
    "last_activity": timestamp
}
```

### WebSocket

Le réel temps de la partie est **synchronisé via WebSocket** :

```javascript
// Joueur A effectue une action
socket.emit("action", { type: "jump", x: 100 });

// Tous les autres reçoivent
socket.on("action", (data) => {
  updatePlayerPosition(data);
});
```

---

## Concepts Transversaux

### Validation et Sécurité

- **Côté client** : Validation rapide pour UX
- **Côté serveur** : Validation stricte (seule source de vérité)
- Pas de confiance au client pour les données critiques (scores, argent)

### Pagination et Performance

- Leaderboard pagine par 100 joueurs
- Requêtes optimisées avec indexes PostgreSQL
- Cache possible des résultats fréquents

### Multi-langue

- Frontend supporte plusieurs langues via fichiers JSON
- Backend retourne des messages en langue demandée
- Fichiers dans `frontend/public/locales/`

---

**Voir aussi** :

- [BACKEND.md](BACKEND.md) - Implémentation Backend
- [FRONTEND.md](FRONTEND.md) - Implémentation Frontend
- [WEBSOCKET.md](WEBSOCKET.md) - Détails WebSocket

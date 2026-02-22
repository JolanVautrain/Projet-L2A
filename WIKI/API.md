# Référence API Complète

## Vue d'overview

Cette page documente tous les **endpoints REST API** disponibles dans le backend Flask. Les formats de requête et réponse sont en JSON.

## Authentication

### Headers Requis

```
X-Session-Token: <token>          # Token de session (sauf endpoints publics)
Content-Type: application/json    # Pour POST/PUT
```

### Endpoints d'Authentification

#### POST `/auth/register`

**Description** : Créer un nouveau compte utilisateur.

**Requête** :

```json
{
  "username": "newplayer",
  "password": "securepassword123"
}
```

**Réponse (200)** :

```json
{
  "token": "abc123def456xyz...",
  "user": {
    "id": 42,
    "username": "newplayer",
    "xp": 0,
    "level": 1
  },
  "expires_at": "2026-02-19T11:30:00Z"
}
```

**Erreurs** :

- `400` : Username déjà utilisé or mot de passe invalide
- `500` : Erreur serveur

---

#### POST `/auth/login`

**Description** : Authentifier un utilisateur existant.

**Requête** :

```json
{
  "username": "newplayer",
  "password": "securepassword123"
}
```

**Réponse (200)** :

```json
{
  "token": "abc123def456xyz...",
  "user": {
    "id": 42,
    "username": "newplayer",
    "xp": 5000,
    "level": 5
  },
  "expires_at": "2026-02-19T11:30:00Z"
}
```

**Erreurs** :

- `401` : Identifiants incorrects
- `403` : Compte banni

---

#### POST `/auth/logout`

**Description** : Invalider la session courante.

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "message": "Logged out successfully"
}
```

---

#### GET `/auth/verify`

**Description** : Vérifier si une session est valide.

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "valid": true,
  "user": {
    "id": 42,
    "username": "newplayer"
  }
}
```

**Réponse (401)** :

```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

---

## Jeu

### POST `/game/join`

**Description** : Créer ou rejoindre une partie multijoueur.

**Headers requis** :

```
X-Session-Token: <token>
```

**Requête (optionnel)** :

```json
{
  "mode": "normal", // "normal", "hard", "ultra"
  "private": false // Partie privée?
}
```

**Réponse (200)** :

```json
{
  "game_id": "a1b2c3d4-e5f6-7890-abcd",
  "websocket_server": "ws://localhost:3001",
  "player_count": 1,
  "min_players": 2,
  "status": "waiting"
}
```

**Erreurs** :

- `401` : Non authentifié
- `403` : Compte banni
- `409` : Compte déjà dans une partie

---

### POST `/game/end`

**Description** : Terminer une partie et enregistrer les scores.

**Headers requis** :

```
X-Session-Token: <token>
```

**Requête** :

```json
{
  "game_id": "a1b2c3d4-e5f6-7890-abcd",
  "score": 1250,
  "duration_seconds": 60,
  "difficulty": "normal"
}
```

**Réponse (200)** :

```json
{
  "success": true,
  "xp_earned": 500,
  "total_xp": 5500,
  "level_up": false,
  "new_level": 5
}
```

---

### GET `/game/:game_id`

**Description** : Obtenir les détails d'une partie (résultats).

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "game_id": "a1b2c3d4-e5f6-7890-abcd",
  "status": "finished",
  "duration_seconds": 60,
  "results": [
    {
      "user_id": 42,
      "username": "newplayer",
      "score": 1250,
      "xp_earned": 500,
      "rank": 1
    },
    {
      "user_id": 43,
      "username": "otherplayer",
      "score": 980,
      "xp_earned": 400,
      "rank": 2
    }
  ]
}
```

---

## Classement et Statistiques

### GET `/leaderboard`

**Description** : Obtenir le classement global pagé.

**Paramètres Query** :

```
?page=1        # Numéro de page (défaut: 1)
&limit=100     # Items par page (défaut: 100, max: 100)
&sort=xp       # Tri par "xp" ou "level" (défaut: xp)
```

**Réponse (200)** :

```json
{
  "players": [
    {
      "rank": 1,
      "user_id": 1,
      "username": "TopPlayer",
      "xp": 15000,
      "level": 15,
      "games_played": 127,
      "win_rate": 0.63
    },
    {
      "rank": 2,
      "user_id": 2,
      "username": "SecondBest",
      "xp": 14500,
      "level": 14,
      "games_played": 98,
      "win_rate": 0.61
    }
    // ... jusqu'à 100 joueurs
  ],
  "total": 342,
  "page": 1,
  "pages": 4
}
```

---

### GET `/leaderboard/friends`

**Description** : Classement des amis (si amis implémentés).

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "you": {
    "rank": 15,
    "username": "yourname",
    "xp": 8500
  },
  "friends": [
    {
      "rank": 3,
      "username": "friend1",
      "xp": 12000
    }
  ]
}
```

---

### GET `/stats/:user_id`

**Description** : Statistiques détaillées d'un joueur.

**Réponse (200)** :

```json
{
  "user": {
    "id": 42,
    "username": "newplayer",
    "avatar_url": "https://...",
    "bio": "Competitive player"
  },
  "statistics": {
    "rank": 15,
    "total_xp": 8500,
    "level": 8,
    "games_played": 42,
    "games_won": 26,
    "games_lost": 16,
    "win_rate": 0.619,
    "average_score": 847,
    "best_score": 2100,
    "total_playtime_seconds": 25200,
    "join_date": "2025-10-15T10:30:00Z",
    "last_played": "2026-02-19T10:30:00Z"
  }
}
```

---

### GET `/stats/:user_id/games`

**Description** : Historique des parties d'un joueur (paginé).

**Paramètres Query** :

```
?page=1&limit=20
```

**Réponse (200)** :

```json
{
  "games": [
    {
      "id": 1,
      "game_id": "a1b2c3d4...",
      "score": 1250,
      "xp_earned": 500,
      "duration_seconds": 60,
      "difficulty": "normal",
      "rank": 1,
      "opponents": [{ "id": 43, "username": "opponent1", "score": 980 }],
      "played_at": "2026-02-19T10:30:00Z"
    }
    // ... autres parties
  ]
}
```

---

## Utilisateur

### GET `/user/me`

**Description** : Profil de l'utilisateur connecté.

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "id": 42,
  "username": "newplayer",
  "xp": 8500,
  "level": 8,
  "avatar_url": "https://...",
  "bio": "Competitive player",
  "created_at": "2025-10-15T10:30:00Z",
  "inventory": [
    {
      "item_id": 1,
      "item_name": "Blue Speed Boost",
      "is_equipped": true
    }
  ]
}
```

---

### GET `/user/:user_id`

**Description** : Profil public d'un utilisateur.

**Réponse (200)** :

```json
{
  "id": 42,
  "username": "newplayer",
  "xp": 8500,
  "level": 8,
  "avatar_url": "https://...",
  "bio": "Competitive player",
  "is_ban": false,
  "games_played": 42,
  "win_rate": 0.619
}
```

---

### POST `/user/me/update`

**Description** : Mettre à jour le profil utilisateur.

**Headers requis** :

```
X-Session-Token: <token>
```

**Requête** :

```json
{
  "bio": "New biography",
  "avatar_url": "https://cdn.com/avatars/new.png"
}
```

**Réponse (200)** :

```json
{
  "message": "Profile updated",
  "user": {
    "id": 42,
    "username": "newplayer",
    "bio": "New biography",
    "avatar_url": "https://cdn.com/avatars/new.png"
  }
}
```

---

### POST `/user/me/password`

**Description** : Changer le mot de passe.

**Headers requis** :

```
X-Session-Token: <token>
```

**Requête** :

```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456"
}
```

**Réponse (200)** :

```json
{
  "message": "Password changed successfully"
}
```

**Erreurs** :

- `400` : Mot de passe actuel incorrect

---

### GET `/user/me/inventory`

**Description** : Inventaire de l'utilisateur connecté.

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "items": [
    {
      "id": 1,
      "item_id": 10,
      "name": "Blue Speed Boost",
      "type": "bonus",
      "cost": 500,
      "icon_url": "https://...",
      "is_equipped": true,
      "acquired_at": "2026-02-15T10:30:00Z"
    },
    {
      "id": 2,
      "item_id": 5,
      "name": "Purple Skin",
      "type": "cosmetic",
      "cost": 100,
      "icon_url": "https://...",
      "is_equipped": false,
      "acquired_at": "2026-02-10T14:22:00Z"
    }
  ]
}
```

---

## Boutique

### GET `/shop`

**Description** : Liste complète des items disponibles.

**Paramètres Query (optionnel)** :

```
?type=bonus        # Filtrer par type
&rarity=rare       # Filtrer par rareté
&sort=cost         # Trier par (cost, rarity, new)
```

**Réponse (200)** :

```json
{
  "items": [
    {
      "id": 1,
      "name": "Speed Boost 1.5x",
      "description": "Increase movement speed by 50%",
      "type": "bonus",
      "cost": 500,
      "rarity": "common",
      "icon_url": "https://...",
      "effect": "Speed increase",
      "limited_time": false,
      "in_inventory": true
    },
    {
      "id": 2,
      "name": "Purple Skin",
      "description": "Purple character skin",
      "type": "cosmetic",
      "cost": 100,
      "rarity": "common",
      "icon_url": "https://...",
      "limited_time": false,
      "in_inventory": false
    }
    // ... plus d'items
  ],
  "total": 45
}
```

---

### POST `/shop/buy`

**Description** : Acheter un item.

**Headers requis** :

```
X-Session-Token: <token>
```

**Requête** :

```json
{
  "item_id": 1,
  "quantity": 1
}
```

**Réponse (200)** :

```json
{
  "success": true,
  "item": {
    "id": 1,
    "name": "Speed Boost 1.5x",
    "cost": 500
  },
  "remaining_xp": 9500,
  "inventory_id": 42
}
```

**Erreurs** :

- `400` : XP insuffisant
- `404` : Item inexistant
- `409` : Item déjà possédé (si limite)

---

### POST `/shop/equip/:item_id`

**Description** : Équipper un item (si type bonus).

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "message": "Item equipped",
  "equipped_items": [{ "id": 1, "name": "Speed Boost 1.5x", "slot": "speed" }]
}
```

---

## Signalements

### POST `/report/create`

**Description** : Créer un signalement de joueur.

**Headers requis** :

```
X-Session-Token: <token>
```

**Requête** :

```json
{
  "reported_user_id": 99,
  "reason": "cheating",
  "description": "Impossible scores, seems to use auto-clicker"
}
```

**Réponse (200)** :

```json
{
  "report_id": 42,
  "message": "Report submitted successfully",
  "status": "open"
}
```

**Erreurs** :

- `400` : Raison invalide
- `409` : Déjà signalé récemment

---

### GET `/report/status/:report_id`

**Description** : Vérifier le statut d'un signalement (pour celui qui a signalé).

**Headers requis** :

```
X-Session-Token: <token>
```

**Réponse (200)** :

```json
{
  "id": 42,
  "status": "open",
  "reason": "cheating",
  "reported_user": {
    "id": 99,
    "username": "cheater_user"
  },
  "created_at": "2026-02-19T10:00:00Z",
  "resolved_at": null,
  "resolution": null
}
```

---

## Administration

**Note** : Tous les endpoints `/admin/*` requièrent `X-Admin-User` header avec credentials admin.

### GET `/admin/users`

**Description** : Lista complète des utilisateurs.

**Paramètres Query** :

```
?page=1&limit=50
&search=username       # Recherche
&sort=xp              # Trier
&is_banned=false      # Filtrer
```

**Réponse (200)** :

```json
{
  "users": [
    {
      "id": 1,
      "username": "user1",
      "xp": 5000,
      "level": 5,
      "is_admin": false,
      "is_banned": false,
      "created_at": "2025-10-15T10:30:00Z",
      "last_login": "2026-02-19T10:00:00Z"
    }
    // ... autres utilisateurs
  ],
  "total": 342,
  "page": 1
}
```

---

### GET `/admin/reports`

**Description** : Signalements non traités.

**Réponse (200)** :

```json
{
  "reports": [
    {
      "id": 42,
      "reported_by": { "id": 1, "username": "reporter" },
      "reported_user": { "id": 99, "username": "cheater" },
      "reason": "cheating",
      "description": "Impossible scores",
      "status": "open",
      "created_at": "2026-02-19T10:00:00Z"
    }
  ]
}
```

---

### POST `/admin/user/:user_id/ban`

**Description** : Bannir un utilisateur.

**Requête** :

```json
{
  "reason": "Cheating detected"
}
```

**Réponse (200)** :

```json
{
  "message": "User banned",
  "user": { "id": 99, "username": "cheater", "is_banned": true }
}
```

---

### POST `/admin/report/:report_id/resolve`

**Description** : Marquer un signalement comme résolu.

**Requête** :

```json
{
  "action_taken": "ban",
  "resolution": "User banned for 7 days for cheating"
}
```

**Réponse (200)** :

```json
{
  "report": {
    "id": 42,
    "status": "resolved",
    "action_taken": "ban",
    "resolved_at": "2026-02-19T11:00:00Z"
  }
}
```

---

### GET `/admin/stats`

**Description** : Statistiques serveur.

**Réponse (200)** :

```json
{
  "total_users": 342,
  "active_games": 5,
  "open_reports": 3,
  "banned_users": 2,
  "database_size_mb": 45.2,
  "api_requests_today": 15234,
  "websocket_connections": 12
}
```

---

## Codes de Status

| Code  | Signification                 |
| ----- | ----------------------------- |
| `200` | Requête réussie               |
| `201` | Ressource créée               |
| `204` | Succès (pas de contenu)       |
| `400` | Requête invalide              |
| `401` | Non authentifié               |
| `403` | Non autorisé / Banni          |
| `404` | Ressource non trouvée         |
| `409` | Conflit (ex: compte existant) |
| `429` | Trop de requêtes (rate limit) |
| `500` | Erreur serveur                |

---

**Voir aussi** :

- [BACKEND.md](BACKEND.md) - Implémentation des routes
- [ARCHITECTURE.md](ARCHITECTURE.md) - Vue globale

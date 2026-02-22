# Architecture Générale du Projet L2A

## Vue d'ensemble d'ensemble

Le projet L2A utilise une **architecture client-serveur moderne** avec séparation claire des responsabilités :

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│                   React + Vite + WebSocket                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
        REST API (HTTP)          WebSocket (Real-time)
        (Port 5000)              (Port 3001)
                    │                     │
    ┌───────────────┴──────────┬──────────┴────────────────┐
    │                          │                            │
    ▼                          ▼                            ▼
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Flask API     │   │  Node.js Socket  │   │   PostgreSQL     │
│   (Port 5000)   │   │  (Port 3001)     │   │   (Port 5432)    │
└─────────────────┘   └──────────────────┘   └──────────────────┘
        │                      │                       │
        │                      └───────────────────────┘
        └──────────────────────────────────────────────┘
```

## Couches de l'Architecture

### 1. Couche Présentation (Frontend)

**Technologie** : React 18 + Vite

**Responsabilités** :

- Rendu de l'interface utilisateur
- Gestion de l'état client (authentification, jeu)
- Validation des formulaires côté client
- Communication avec le backend (API + WebSocket)

**Structure** :

```
frontend/src/
├── jsx/
│   ├── Index.jsx              # Routeur principal
│   ├── main.jsx               # Point d'entrée
│   ├── accueil/               # Page d'accueil (connexion, inscription)
│   ├── game/                  # Système de jeu
│   ├── classement/            # Leaderboard
│   ├── compte/                # Profil utilisateur
│   ├── report/                # Système de signalement
│   ├── shop/                  # Boutique in-game
│   └── admin/                 # Panneau d'administration
└── assets/
    ├── css/                   # Feuilles de style
    └── locales/               # Fichiers de traduction (i18n)
```

### 2. Couche API (Backend)

**Technologie** : Python Flask

**Responsabilités** :

- Authentification et gestion des sessions
- Logique métier (jeu, scores, boutique)
- Validation des données
- Accès à la base de données
- Gestion des erreurs

**Structure** :

```
backend/
├── app.py                    # Bootstrap Flask + enregistrement des blueprints
├── core/
│   ├── db.py                 # Connexion PostgreSQL et utilitaires
│   ├── admin.py              # Routes administration
│   └── utils.py              # Fonctions communes
├── pages/                    # Routes organisées par feature
│   ├── accueil/
│   │   ├── auth.py           # Authentification, login, register
│   │   └── game.py           # Gestion du jeu
│   ├── classement/
│   │   ├── scores.py         # Scores et classement
│   │   └── topUsers.py       # Top des meilleurs joueurs
│   ├── compte/
│   │   └── users.py          # Profils et statistiques utilisateur
│   ├── report/
│   │   └── report.py         # Signalements et modération
│   └── shop/
│       └── shop.py           # Boutique et items
└── init_db/
    ├── db_init.py            # Script d'initialisation
    └── db_init.json          # Données de test
```

### 3. Couche Temps Réel (WebSocket)

**Technologie** : Node.js avec Socket.io

**Fichier** : `backend/gameServeur.js`

**Responsabilités** :

- Gestion des salles d'attente
- Synchronisation de l'état du jeu
- Broadcast des actions de joueurs
- Détection des déconnexions

**Communication** :

- Les clients se connectent en WebSocket au serveur Node.js
- Les messages sont envoyés en JSON
- Les états de jeu sont synchronisés en temps réel entre tous les joueurs

### 4. Couche Données (PostgreSQL)

**Base de données** : PostgreSQL

**Responsabilités** :

- Stockage persistant des données
- Gestion des utilisateurs et authentification
- Enregistrement des scores et statistiques
- Gestion de l'inventaire et de la boutique

**Schéma principal** :

- `users` - Comptes utilisateurs
- `sessions` - Sessions actives
- `game_scores` - Scores et statistiques
- `items` - Inventaire
- `reports` - Signalements

## Flux de Communication

### Authentification

```
1. Client → API : POST /auth/register ou login
2. API → PostgreSQL : Vérifier/créer utilisateur
3. API → Client : Token de session
4. Client stocke le token en localStorage
5. Client → API : Headers incluent X-Session-Token
```

### Gameplay Multijoueur

```
1. Client A → API : POST /game/join
2. API → PostgreSQL : Créer/rejoindre partie
3. API → Client A : Game ID + serveur WebSocket
4. Client A → WebSocket Server : join(gameId)
5. WebSocket Server → Client B : "players_joined" event
6. Client A, B → WebSocket : Émettent actions de jeu (action_type)
7. WebSocket → Client A, B : Broadcast des actions
8. Client A, B : Mettent à jour l'état du jeu localement
```

### Gestion des Scores

```
1. Client → API : POST /game/end (résultat du jeu)
2. API → PostgreSQL : Insérer score + calculer classement
3. API → Client : Données mises à jour
4. Client → API : GET /leaderboard
5. API → PostgreSQL : Requête du classement
6. API → Client : Top 100 utilisateurs
```

## Patterns Utilisés

### Pattern MVP (Model-View-Presenter)

- **Model** : PostgreSQL + fonctions de base de données
- **View** : Composants React
- **Presenter** : API Flask qui orchestre les données

### Pattern API REST

- Endpoints suivent les conventions REST
- Méthodes HTTP appropriées (GET, POST, DELETE)
- Codes de statut HTTP corrects
- Réponses JSON standardisées

### Pattern WebSocket (Publisher-Subscriber)

- Les clients se **subscribeent** à des événements
- Le serveur **publie** des mises à jour
- Communication bidirectionnelle en temps réel

## Sécurité

### Authentification

- Tokens de session stockés en localStorage (client) et en session PostgreSQL (serveur)
- Vérification du token à chaque requête API
- CORS configurable pour différents environnements

### Validation

- Validation côté serveur de toutes les données
- Protection contre les injections SQL via requêtes paramétrées
- Sanitization des entrées utilisateur

### Infrastructure

- Docker isolé pour chaque service
- Nginx en reverse proxy
- Connexions HTTPS en production
- Variables d'environnement pour les secrets

## Déploiement

### Développement

- Docker Compose local avec hot-reload
- Volumes montés pour modifications en direct
- Base de données PostgreSQL dans un conteneur

### Production

- Optimisé pour Raspberry Pi 4 (2GB RAM)
- Nginx comme reverse proxy
- PostgreSQL configuré pour faible consommation RAM
- Images Docker pré-compilées

```
┌─────────────────────────────────────────┐
│        Internet / Utilisateurs           │
└────────────────────┬────────────────────┘
                     │
            ┌────────▼─────────┐
            │   Nginx Reverse  │
            │   Proxy (Port 80)│
            └────────┬─────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼─────┐          ┌────────▼──────┐
   │  Backend │          │  Frontend SPA │
   │  API     │          │  Static Files │
   │ (Flask)  │          │  (React)      │
   └────┬─────┘          └───────────────┘
        │
   ┌────▼──────────────┐
   │   PostgreSQL      │
   │   (Persistance)   │
   └───────────────────┘
```

---

**Voir aussi** :

- [Backend.md](BACKEND.md) - Détails de l'implémentation serveur
- [Frontend.md](FRONTEND.md) - Détails de l'interface utilisateur
- [WebSocket.md](WEBSOCKET.md) - Système temps réel

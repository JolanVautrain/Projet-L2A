# Guide du Backend - Flask

## Vue d'ensemble

Le backend est une API **RESTful** construite avec Flask. Il gère tous les appels métier, la base de données, et la logique de jeu.

## Structure du Modules

```
backend/
├── app.py                     # Point d'entrée, enregistrement blueprints
├── __init__.py
├── core/
│   ├── db.py                  # Connexion PostgreSQL, pool, utilitaires
│   ├── admin.py               # Routes /admin
│   └── utils.py               # Fonctions communes (response, validation)
├── pages/
│   ├── accueil/
│   │   ├── auth.py            # Routes d'authentification
│   │   └── game.py            # Routes du jeu
│   ├── classement/
│   │   ├── scores.py          # Scores et classement
│   │   └── topUsers.py        # Top joueurs
│   ├── compte/
│   │   └── users.py           # Profil, statistiques, inventaire
│   ├── report/
│   │   └── report.py          # Signalements
│   └── shop/
│       └── shop.py            # Boutique et achats
└── init_db/
    ├── db_init.py             # Script d'initialisation
    └── db_init.json           # Données de test
```

## Installation et Lancement

### Dépendances

Voir `backend/requirements-prod.txt` :

```
Flask==2.3.2
Flask-Cors==4.0.0
psycopg2-binary==2.9.7  # PostgreSQL driver
python-dotenv==1.0.0
gunicorn==21.2.0        # Production server
```

### Démarrage

```bash
# En développement (auto-reload)
python -m flask run

# En production
gunicorn --bind 0.0.0.0:5000 backend.wsgi:app
```

## Modules Principaux

### 1. `core/db.py` - Gestion Base de Données

**Responsabilités** :

- Connexion pool à PostgreSQL
- Exécution de requêtes
- Gestion des transactions
- Création/vérification du schéma

**Fonctions clés** :

```python
get_db_connection()       # Obtenir une connexion
execute_query(sql, params)  # Exécuter une requête
execute_many(sql, params)   # Batch inserts
fetch_one(sql, params)      # Obtenir un résultat
fetch_all(sql, params)      # Obtenir tous les résultats
check_and_recreate_schema() # Initialiser la BD
```

**Exemple d'utilisation** :

```python
from core import db

# Récupérer un utilisateur
user = db.fetch_one(
    "SELECT * FROM users WHERE id = %s",
    (user_id,)
)

# Obtenir tous les scores
scores = db.fetch_all(
    "SELECT * FROM game_scores ORDER BY xp DESC LIMIT 100"
)

# Insérer un nouveau score
db.execute_query(
    "INSERT INTO game_scores (user_id, score, xp) VALUES (%s, %s, %s)",
    (user_id, score, xp)
)
```

### 2. `core/utils.py` - Utilitaires Communs

**Fonctions principales** :

```python
make_response(data, status=200)  # Réponse JSON standardisée
get_session_token()              # Extraire token depuis headers
verify_session(token)            # Valider une session
require_auth(func)               # Décorateur auth
get_admin_flag()                 # Vérifier si admin
```

**Réponse Standardisée** :

```python
return utils.make_response(
    {"message": "Success", "data": {...}},
    200
)
# Retourne :
# {
#   "message": "Success",
#   "data": {...},
#   "timestamp": "2026-02-19T10:30:00"
# }
```

### 3. Module Authentification (`pages/accueil/auth.py`)

#### Routes

**POST** `/auth/register`

Crée un nouvel utilisateur et une session.

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "player1", "password": "secret123"}'

# Réponse :
# {
#   "token": "abc123xyz789...",
#   "user": {"id": 1, "username": "player1", "xp": 0, "level": 1}
# }
```

**POST** `/auth/login`

Authentifie un utilisateur existant.

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "player1", "password": "secret123"}'
```

**POST** `/auth/logout`

Invalide la session courante.

```bash
curl -X POST http://localhost:5000/auth/logout \
  -H "X-Session-Token: abc123xyz789..."
```

**GET** `/auth/verify`

Vérifie si une session est valide (utile au démarrage du client).

```bash
curl -X GET http://localhost:5000/auth/verify \
  -H "X-Session-Token: abc123xyz789..."

# Réponse si valide :
# {"valid": true, "user": {...}}
```

#### Implémentation Détails

```python
# Hashage du mot de passe (bcrypt ou similaire)
password_hash = hash_password(password)

# Génération token (UUID aléatoire)
token = generate_secure_token()

# Stockage session en BD
execute_query(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES ...",
    (user_id, token, expiration_time)
)
```

### 4. Module Jeu (`pages/accueil/game.py`)

#### Routes

**POST** `/game/join`

Crée ou rejoint une partie.

```bash
curl -X POST http://localhost:5000/game/join \
  -H "X-Session-Token: token..." \
  -H "Content-Type: application/json" \
  -d '{"mode": "normal"}'

# Réponse :
# {
#   "game_id": "uuid...",
#   "websocket_server": "ws://localhost:3001",
#   "player_count": 1
# }
```

**POST** `/game/end`

Termine une partie et sauvegarde les scores.

```bash
curl -X POST http://localhost:5000/game/end \
  -H "X-Session-Token: token..." \
  -H "Content-Type: application/json" \
  -d {
#    "game_id": "uuid...",
#    "score": 1250,
#    "duration_seconds": 480
# }
```

**GET** `/game/:game_id`

Récupère les détails d'une partie (résultats finaux).

### 5. Module Classement (`pages/classement/scores.py`)

#### Routes

**GET** `/leaderboard?page=1&limit=100`

Récupère le classement pagé.

```bash
curl http://localhost:5000/leaderboard?page=1&limit=100

# Réponse :
# {
#   "players": [
#     {"rank": 1, "username": "TopPlayer", "xp": 15000},
#     {"rank": 2, "username": "SecondBest", "xp": 14500},
#     ...
#   ],
#   "total": 342,
#   "page": 1
# }
```

**GET** `/stats/:user_id`

Statistiques détaillées d'un joueur.

```bash
curl http://localhost:5000/stats/42

# Réponse :
# {
#   "user": {...},
#   "rank": 15,
#   "total_xp": 8500,
#   "level": 5,
#   "games_played": 127,
#   "win_rate": 0.63,
#   "average_score": 847
# }
```

### 6. Module Utilisateur (`pages/compte/users.py`)

#### Routes

**GET** `/user/me`

Profil de l'utilisateur connecté.

```bash
curl http://localhost:5000/user/me \
  -H "X-Session-Token: token..."
```

**GET** `/user/:id`

Profil d'un autre utilisateur (public).

**POST** `/user/me/update`

Mettre à jour le profil (username, bio, etc.).

```bash
curl -X POST http://localhost:5000/user/me/update \
  -H "X-Session-Token: token..." \
  -H "Content-Type: application/json" \
  -d '{"bio": "New bio", "avatar": "avatar_url"}'
```

### 7. Module Boutique (`pages/shop/shop.py`)

#### Routes

**GET** `/shop`

Liste de tous les items disponibles.

```bash
curl http://localhost:5000/shop

# Réponse :
# {
#   "items": [
#     {"id": 1, "name": "Speed Boost", "cost": 500, "type": "bonus"},
#     {"id": 2, "name": "Blue Skin", "cost": 100, "type": "cosmetic"},
#     ...
#   ]
# }
```

**POST** `/shop/buy`

Acheter un item.

```bash
curl -X POST http://localhost:5000/shop/buy \
  -H "X-Session-Token: token..." \
  -H "Content-Type: application/json" \
  -d '{"item_id": 1}'

# Réponse :
# {"success": true, "remaining_xp": 9500}
```

**GET** `/user/me/inventory`

Inventaire de l'utilisateur.

### 8. Module Signalements (`pages/report/report.py`)

#### Routes

**POST** `/report/create`

Créer un signalement.

```bash
curl -X POST http://localhost:5000/report/create \
  -H "X-Session-Token: token..." \
  -H "Content-Type: application/json" \
  -d '{
    "reported_user_id": 99,
    "reason": "cheating",
    "description": "Suspicious high scores"
  }'
```

**GET** `/report/status/:report_id`

Statut d'un signalement (pour celui qui a signalé).

### 9. Routes Administrateur (`core/admin.py`)

**GET** `/admin/users` - Liste tous les utilisateurs

```bash
curl http://localhost:5000/admin/users \
  -H "X-Admin-User: admin_token" \
  -H "X-Session-Token: admin_session_token"
```

**GET** `/admin/reports` - Signalements en attente

**POST** `/admin/user/:id/ban` - Bannir un utilisateur

**POST** `/admin/report/:id/resolve` - Marquer un signalement comme résolu

## Modèles de Données

### Users

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE
);
```

### Sessions

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW()
);
```

### Game Scores

```sql
CREATE TABLE game_scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    game_id UUID NOT NULL,
    score INT NOT NULL,
    xp INT NOT NULL,
    duration_seconds INT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Shop Items

```sql
CREATE TABLE shop_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cost INT NOT NULL,
    type VARCHAR(20), -- 'bonus' ou 'cosmetic'
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    item_id INT NOT NULL REFERENCES shop_items(id),
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT NOW()
);
```

### Reports

```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reported_by INT NOT NULL REFERENCES users(id),
    reported_user_id INT NOT NULL REFERENCES users(id),
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    action_taken VARCHAR(100)
);
```

## Patterns et Bonnes Pratiques

### Décorateur d'Authentification

```python
from functools import wraps
from flask import request

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('X-Session-Token')
        if not token or not verify_session(token):
            return make_response({"error": "Unauthorized"}, 401)
        return f(*args, **kwargs)
    return decorated_function

# Utilisation
@app.route('/protected')
@require_auth
def protected_route():
    user = get_current_user()
    return make_response({"message": f"Hello {user['username']}"})
```

### Blueprint pour Modulabilité

```python
# Définir un blueprint
bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/login', methods=['POST'])
def login():
    # Logique...
    pass

# Enregistrer en main
from pages.accueil import auth
app.register_blueprint(auth.bp)
```

### Validation des Données

```python
def validate_score_input(data):
    required = ['game_id', 'score', 'duration_seconds']
    for key in required:
        if key not in data:
            raise ValueError(f"Missing {key}")

    if not isinstance(data['score'], int) or data['score'] < 0:
        raise ValueError("Invalid score")

    return True
```

## Gestion des Erreurs

```python
try:
    # Logique métier
    result = process_game_end(game_data)
    return make_response({"success": true, "data": result}, 200)
except ValueError as e:
    return make_response({"error": str(e)}, 400)
except Exception as e:
    logging.error(f"Unexpected error: {e}")
    return make_response({"error": "Internal server error"}, 500)
```

---

**Voir aussi** :

- [ARCHITECTURE.md](ARCHITECTURE.md) - Vue globale
- [DATABASE.md](DATABASE.md) - Schéma détaillé
- [API.md](API.md) - Référence API complète

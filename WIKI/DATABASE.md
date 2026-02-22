# Base de Données PostgreSQL

## Vue d'overview

Le projet utilise **PostgreSQL** comme système de gestion de base de données. Toutes les données persistantes (utilisateurs, scores, sessions, etc.) y sont stockées.

## Schéma des Tables

### Table `users`

Stocke les informations des comptes utilisateurs.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    avatar_url VARCHAR(255),
    bio TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_xp ON users(xp DESC);
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_users_is_banned ON users(is_banned);
```

**Champs** :

- `id` : Identifiant unique auto-incrémenté
- `username` : Nom d'utilisateur unique (50 caractères max)
- `password_hash` : Mot de passe hashé (jamais stocké en clair)
- `xp` : Expérience totale accumulée
- `level` : Niveau calculé basé sur XP (ex: niveau = XP / 1000)
- `avatar_url` : URL vers l'avatar de l'utilisateur
- `bio` : Biographie/description personnelle
- `is_admin` : Flag d'administrateur
- `is_banned` : Flag si l'utilisateur est banni
- `banned_reason` : Raison du ban si applicable
- `created_at` : Date de création du compte
- `last_login` : Dernière connexion
- `updated_at` : Dernière mise à jour du profil

**Exemple** :

```json
{
  "id": 1,
  "username": "TopPlayer",
  "password_hash": "$2b$12$...",
  "xp": 15000,
  "level": 15,
  "avatar_url": "https://cdn.com/avatars/1.png",
  "bio": "Passionate gamer",
  "is_admin": false,
  "is_banned": false
}
```

### Table `sessions`

Gère les sessions actives des utilisateurs.

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Champs** :

- `id` : Identifiant de la session
- `user_id` : Référence à l'utilisateur
- `token` : Token de session aléatoire (UUID)
- `ip_address` : Adresse IP pour sécurité
- `user_agent` : User agent du navigateur
- `created_at` : Création de la session
- `expires_at` : Expiration automatique (ex: 30 minutes)
- `last_activity` : Dernière activité (pour déconnexion auto)
- `is_active` : Flag de session valide

**Durée de vie** :

- Sessions actives : 30 minutes d'inactivité
- Lors d'une requête, `last_activity` est mis à jour

### Table `game_scores`

Enregistre chaque score et partie jouée.

```sql
CREATE TABLE game_scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL,
    score INT NOT NULL,
    xp_earned INT NOT NULL,
    duration_seconds INT,
    status VARCHAR(20),  -- 'win', 'loss', 'draw'
    difficulty VARCHAR(20),  -- 'easy', 'normal', 'hard'
    players_count INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX idx_game_scores_game_id ON game_scores(game_id);
CREATE INDEX idx_game_scores_created_at ON game_scores(created_at DESC);
CREATE INDEX idx_game_scores_xp_earned ON game_scores(xp_earned DESC);
```

**Champs** :

- `id` : Identifiant du score
- `user_id` : Joueur concerné
- `game_id` : ID unique de la partie
- `score` : Score brut obtenu
- `xp_earned` : XP gagnée (peut être multiplié)
- `duration_seconds` : Durée de la partie
- `status` : Résultat ('win', 'loss')
- `difficulty` : Difficulté de la partie
- `players_count` : Nombre de joueurs
- `created_at` : Timestamp de la partie

**Exemple** :

```json
{
  "id": 42,
  "user_id": 1,
  "game_id": "a1b2c3d4-e5f6-7890",
  "score": 1250,
  "xp_earned": 500,
  "duration_seconds": 60,
  "status": "win",
  "difficulty": "normal",
  "players_count": 2,
  "created_at": "2026-02-19T10:30:00Z"
}
```

### Table `shop_items`

Catalogue des items achetables.

```sql
CREATE TABLE shop_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cost INT NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'bonus' ou 'cosmetic'
    effect VARCHAR(255),        -- Description de l'effet si bonus
    rarity VARCHAR(20),         -- 'common', 'rare', 'epic', 'legendary'
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    limited_time BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shop_items_type ON shop_items(type);
CREATE INDEX idx_shop_items_is_active ON shop_items(is_active);
```

**Types d'items** :

- **Cosmetic** : Visuels uniquement (skins, avatars)
- **Bonus** : Affectent le gameplay (multiplicateurs XP, vies supplémentaires)

**Rareté** :

- Common : Peu coûteux, courants
- Rare : Plus chers, plus rares
- Epic : Très rares, coûteux
- Legendary : Extrêmement rares

### Table `user_inventory`

Inventaire de chaque utilisateur.

```sql
CREATE TABLE user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES shop_items(id),
    quantity INT DEFAULT 1,
    is_equipped BOOLEAN DEFAULT FALSE,  -- Item activé pour le jeu
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_is_equipped ON user_inventory(is_equipped);
```

**Champs** :

- `id` : Identifiant unique
- `user_id` : Propriétaire de l'item
- `item_id` : Référence à l'item
- `quantity` : Nombre de cet item (généralement 1)
- `is_equipped` : Item activé dans le jeu
- `acquired_at` : Date d'achat

**Exemple** :

```json
{
  "user_id": 1,
  "item_id": 5,
  "quantity": 1,
  "is_equipped": true,
  "item_name": "Blue Speed Boost"
}
```

### Table `reports`

Système de signalement pour modération.

```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reported_by INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,  -- 'cheating', 'harassment', 'abuse', etc.
    description TEXT NOT NULL,
    evidence_data JSONB,  -- Données additionnelles (scores suspects, etc.)
    status VARCHAR(20) DEFAULT 'open',  -- 'open', 'investigating', 'resolved'
    resolution VARCHAR(255),  -- Description de la résolution
    action_taken VARCHAR(100),  -- 'warning', 'suspension', 'ban', 'dismissed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INT REFERENCES users(id)  -- Admin qui a traité
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
```

**Champs** :

- `id` : Identifiant du signalement
- `reported_by` : ID du signalant
- `reported_user_id` : ID du signalé
- `reason` : Catégorie du problème
- `description` : Détails du signalement
- `evidence_data` : Données JSON (scores suspects, screenshots, etc.)
- `status` : État du traitement
- `action_taken` : Action prise par les modos
- `created_at` : Date du signalement
- `resolved_at` : Date de résolution
- `resolved_by` : Admin responsable

### Table `admin_logs`

Audit trail pour actions administrateur.

```sql
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- 'ban_user', 'delete_score', 'resolve_report'
    target_user_id INT REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## Requêtes Courantes

### Classement Global

```sql
-- Top 100 joueurs
SELECT
    ROW_NUMBER() OVER (ORDER BY xp DESC) as rank,
    id,
    username,
    xp,
    level,
    COUNT(gs.id) as games_played
FROM users u
LEFT JOIN game_scores gs ON u.id = gs.user_id
WHERE NOT is_banned
GROUP BY u.id
ORDER BY xp DESC
LIMIT 100;
```

### Statistiques d'un Joueur

```sql
-- Stats détaillées d'un joueur
SELECT
    u.id,
    u.username,
    u.xp,
    u.level,
    COUNT(gs.id) as games_played,
    SUM(CASE WHEN gs.status = 'win' THEN 1 ELSE 0 END)::float /
    COUNT(gs.id) as win_rate,
    AVG(gs.score) as avg_score,
    MAX(gs.score) as best_score,
    (SELECT ROW_NUMBER() OVER (ORDER BY xp DESC) FROM users) as rank
FROM users u
LEFT JOIN game_scores gs ON u.id = gs.user_id
WHERE u.id = ?
GROUP BY u.id;
```

### Inventaire d'un Joueur

```sql
-- Items possédés avec détails
SELECT
    ui.id,
    si.id as item_id,
    si.name,
    si.type,
    si.icon_url,
    si.effect,
    ui.is_equipped,
    ui.acquired_at
FROM user_inventory ui
JOIN shop_items si ON ui.item_id = si.id
WHERE ui.user_id = ?
ORDER BY ui.acquired_at DESC;
```

### Signalements en Attente

```sql
-- Reports non traités, triés par date
SELECT
    r.id,
    r.reported_by,
    u1.username as reporter_name,
    r.reported_user_id,
    u2.username as reported_name,
    r.reason,
    r.description,
    r.created_at
FROM reports r
JOIN users u1 ON r.reported_by = u1.id
JOIN users u2 ON r.reported_user_id = u2.id
WHERE r.status = 'open'
ORDER BY r.created_at ASC;
```

## Options de Performance

### Indexes Recommandés

```sql
-- Recherche d'utilisateurs par username (autocomplete)
CREATE INDEX idx_users_username_prefix ON users (username);

-- Filtrage par XP pour leaderboard
CREATE INDEX idx_users_xp_desc ON users (xp DESC);

-- Filtrage par date (derniers scores)
CREATE INDEX idx_game_scores_created_at_desc ON game_scores (created_at DESC);

-- Retrouver les scores d'un utilisateur
CREATE INDEX idx_game_scores_user_id_date ON game_scores (user_id, created_at DESC);
```

### Partitioning pour Tables Larges

Si la table `game_scores` grossit énormément, partitionner par date :

```sql
CREATE TABLE game_scores_2026_01 PARTITION OF game_scores
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE game_scores_2026_02 PARTITION OF game_scores
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

## Configuration PostgreSQL

### Connection Pool (pour haute charge)

```python
# backend/core/db.py - Configuration PgBouncer
import psycopg2.pool

db_pool = psycopg2.pool.SimpleConnectionPool(
    5,    # min_size
    20,   # max_size
    database="l2a_db",
    user="postgres",
    password="password",
    host="postgres",
    port=5432
)
```

### Configuration pour Raspberry Pi (Low Memory)

Dans `postgres-prod.conf` :

```ini
# Réduire la mémoire utilisée
shared_buffers = 128MB          # 25% de 512MB RAM (RPi 4)
effective_cache_size = 256MB
work_mem = 8MB
maintenance_work_mem = 64MB
```

## Migrations et Versioning

### Outil de Migration (Alembic)

```bash
# Initialiser Alembic
alembic init migrations

# Créer une nouvelle migration
alembic revision -m "Add users table"

# Appliquer les migrations
alembic upgrade head

# Revenir en arrière
alembic downgrade -1
```

### Script d'Initialisation

Voir `backend/init_db/db_init.py` - Crée le schéma initial et charge les données de test.

## Backup et Restore

### Backup Automatique

```bash
# Dump base de données
pg_dump -U postgres l2a_db > backup.sql

# Avec compression
pg_dump -U postgres l2a_db | gzip > backup.sql.gz
```

### Restore

```bash
# Depuis un dump
psql -U postgres l2a_db < backup.sql

# Depuis gzip
gunzip -c backup.sql.gz | psql -U postgres l2a_db
```

### Backup avec Docker

```bash
# Backup depuis container
docker-compose exec postgres pg_dump -U postgres l2a_db > backup.sql

# Restore dans container
cat backup.sql | docker-compose exec -T postgres psql -U postgres l2a_db
```

## Sécurité

### Hachage des Mots de Passe

```python
# Backend - Utiliser bcrypt
import bcrypt

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

def verify_password(password, hash):
    return bcrypt.checkpw(password.encode(), hash)
```

### Protection SQL Injection

Toujours utiliser les **requêtes paramétrées** :

```python
# BÓN : Paramétré
db.execute_query("SELECT * FROM users WHERE id = %s", (user_id,))

# MAUVAIS : Concaténation
db.execute_query(f"SELECT * FROM users WHERE id = {user_id}")
```

### Permissions au Niveau Base de Données

```sql
-- Créer utilisateur sans privilèges admin
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Donner accès seulement aux tables nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
GRANT SELECT, INSERT ON game_scores TO app_user;
GRANT SELECT ON users TO public;  -- Scores publics
```

---

**Voir aussi** :

- [BACKEND.md](BACKEND.md) - Utilisation dans le code
- [ARCHITECTURE.md](ARCHITECTURE.md) - Vue globale

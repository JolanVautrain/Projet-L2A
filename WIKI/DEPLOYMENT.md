# Déploiement et Infrastructure

## Vue d'overview

Le projet L2A peut être déployé en **développement** (local) ou en **production** (Raspberry Pi). Cette page explique la configuration Docker, le déploiement, et la gestion de l'infrastructure.

## Environnements

### Développement

**Conditions** :

- Hot-reload automatique du code
- Base de données locale
- Volumes montés pour modifications directes
- Outils de debug accessibles

**Commande** :

```bash
bash ./script/docker-dev.sh
```

**Accès** :

- Frontend : http://localhost:5173
- Backend API : http://localhost:5000
- WebSocket : ws://localhost:3001
- Reverse Proxy : http://localhost:15256

### Production

**Conditions** :

- Optimisé pour Raspberry Pi 4 (2GB RAM)
- Images pré-compilées
- Nginx en reverse proxy
- PostgreSQL configuré pour basse consommation

**Cible** :

- Déploiement sur serveur Raspberry Pi
- Accès via domaine HTTPS
- Port 80/443 uniquement

## Architecture Docker Compose

### Fichiers de Configuration

```
docker/
├── docker-compose.dev.yml     # Développement
├── docker-compose.prod.yml    # Production
├── docker-compose.test.yml    # Tests
├── nginx-prod.conf            # Config Nginx production
├── postgres-prod.conf         # Config PostgreSQL production
├── backend/
│   ├── Dockerfile
│   ├── script_build.sh
│   ├── script_run.sh
│   └── script_stop.sh
└── frontend/
    ├── Dockerfile
    ├── script_build.sh
    ├── script_run.sh
    └── script_stop.sh
```

### Composition des Services

```
┌──────────────────────────────────────────────────────┐
│                docker-compose.dev.yml                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  frontend          backend          postgres         │
│   (Vite)           (Flask)          (Database)       │
│    5173             5000              5432           │
│                   3001 (WebSocket)                   │
│                                                      │
│  gameServeur.js                                      │
│  (Node.js)                                           │
│  3001                                                │
└──────────────────────────────────────────────────────┘
```

#### docker-compose.dev.yml

```yaml
version: "3.8"

services:
  ##########################
  # Frontend (React + Vite)
  ##########################
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: l2a-frontend-dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src # Hot reload
      - ./frontend/package.json:/app/package.json
    environment:
      - NODE_ENV=development
    command: npm run dev

  ##########################
  # Backend (Flask)
  ##########################
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: l2a-backend-dev
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app/backend # Hot reload
    environment:
      - FLASK_ENV=development
      - FLASK_APP=backend.app
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/l2a_db
      - LOG_LEVEL=DEBUG
    depends_on:
      - postgres
    command: python -m flask run --host=0.0.0.0

  ##########################
  # WebSocket (Node.js)
  ##########################
  gameServeur:
    build:
      context: ./backend
      dockerfile: Dockerfile.websocket
    container_name: l2a-websocket-dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend/gameServeur.js:/app/gameServeur.js
    environment:
      - NODE_ENV=development
      - PORT=3001
    depends_on:
      - backend

  ##########################
  # Base de Données
  ##########################
  postgres:
    image: postgres:13-alpine
    container_name: l2a-postgres-dev
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=l2a_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker-init-db.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:

networks:
  default:
    driver: bridge
```

#### docker-compose.prod.yml

Pour production sur Raspberry Pi :

```yaml
version: "3.8"

services:
  ##########################
  # Nginx (Reverse Proxy)
  ##########################
  nginx:
    image: nginx:alpine
    container_name: l2a-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx-prod.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./certs:/etc/nginx/certs:ro # SSL certificates
    depends_on:
      - backend
      - gameServeur
    restart: always

  ##########################
  # Backend (Flask + Gunicorn)
  ##########################
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        - ENVIRONMENT=production
    container_name: l2a-backend-prod
    expose:
      - "5000"
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://app_user:pwd@postgres:5432/l2a_db
      - LOG_LEVEL=INFO
    depends_on:
      - postgres
    restart: always
    command: gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 backend.wsgi:app

  ##########################
  # WebSocket (Node.js)
  ##########################
  gameServeur:
    build:
      context: ./backend
      dockerfile: Dockerfile.websocket
    container_name: l2a-websocket-prod
    expose:
      - "3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    depends_on:
      - backend
    restart: always

  ##########################
  # PostgreSQL (Optimisé RPi)
  ##########################
  postgres:
    image: postgres:13-alpine
    container_name: l2a-postgres-prod
    expose:
      - "5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=l2a_db
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./docker/postgres-prod.conf:/etc/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql.conf
    restart: always

volumes:
  postgres_prod_data:
```

## Configuration Nginx

### nginx-prod.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json;

    ##########################
    # Server Block Principal
    ##########################
    server {
        listen 80;
        server_name _;

        # Redirects HTTP → HTTPS (en production avec certificat)
        # return 301 https://$server_name$request_uri;

        # Frontend SPA
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;

            # Cache busting pour les fichier JS/CSS
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 30d;
                add_header Cache-Control "public, immutable";
            }

            # HTML pas en cache (pour les updates)
            location ~* \.html$ {
                add_header Cache-Control "public, max-age=3600";
            }
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend:5000/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_send_timeout 60s;
        }

        # WebSocket
        location /socket.io {
            proxy_pass http://gameServeur:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
```

## Scripts de Déploiement

### script/docker-dev.sh

```bash
#!/bin/bash

case "${1:-}" in
  "update")
    echo "Mise à jour complète des containers..."
    docker-compose -f docker/docker-compose.dev.yml down
    docker-compose -f docker/docker-compose.dev.yml up -d --build
    ;;
  *)
    echo "Démarrage mode dev (redémarrage rapide)..."
    docker-compose -f docker/docker-compose.dev.yml up -d
    ;;
esac

echo
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:5000"
echo "WebSocket: ws://localhost:3001"
echo "Proxy:     http://localhost:15256"
echo
echo "Logs backend:"
docker-compose -f docker/docker-compose.dev.yml logs -f backend
```

### script/deploy-prod.sh

```bash
#!/bin/bash

set -e

TARGET_HOST=${1:-pi@raspberry.local}
DEPLOY_PATH="/home/pi/l2a"

echo "Déploiement production sur $TARGET_HOST"

# 1. Backup base de données
echo "Backup BDD..."
ssh $TARGET_HOST "docker-compose -f $DEPLOY_PATH/docker/docker-compose.prod.yml exec -T postgres pg_dump -U postgres l2a_db | gzip > $DEPLOY_PATH/backup-$(date +%s).sql.gz"

# 2. Pull du code
echo "Pull du code..."
ssh $TARGET_HOST "cd $DEPLOY_PATH && git pull origin main"

# 3. Build et démarrage
echo "Build containers..."
ssh $TARGET_HOST "cd $DEPLOY_PATH && docker-compose -f docker/docker-compose.prod.yml down"
ssh $TARGET_HOST "cd $DEPLOY_PATH && docker-compose -f docker/docker-compose.prod.yml up -d --build"

# 4. Migrations BD
echo "Migrations BD..."
ssh $TARGET_HOST "cd $DEPLOY_PATH && docker-compose -f docker/docker-compose.prod.yml exec -T backend python -m backend.init_db.db_init"

# 5. Santé check
echo "Vérification..."
ssh $TARGET_HOST "curl -f http://localhost/health || exit 1"

echo "Déploiement réussi!"
```

## Monitoring et Logs

### Voir les Logs

```bash
# Tous les services en dev
docker-compose -f docker/docker-compose.dev.yml logs -f

# Service spécifique
docker-compose -f docker/docker-compose.dev.yml logs -f backend

# Produciton
docker-compose -f docker/docker-compose.prod.yml logs -f nginx

# Nombre de lignes spécifique
docker-compose logs --tail 100 backend
```

### Monitoring de Ressources

```bash
# CPU et mémoire
docker stats

# Vérifier l'espace disque
docker system df

# Health check personnalisé
curl -i http://localhost:5000/health
```

## Troubleshooting

### Problèmes Courants

#### Le frontend ne se met pas à jour (Dev)

```bash
# Vider cache + recharger
CTRL + MAJ + R (ou CMD + SHIFT + R sur Mac)

# Ou redémarrer le container
docker-compose -f docker/docker-compose.dev.yml restart frontend
```

#### Erreurs de Connexion Base de Données

```bash
# Vérifier que Postgres est accessible
docker-compose exec postgres psql -U postgres -d l2a_db -c "SELECT version();"

# Vérifier les variables d'environnement
docker-compose exec backend env | grep DATABASE
```

#### WebSocket ne fonctionne pas

```bash
# Tester la connexion direct
curl -i http://localhost:3001/socket.io/?transport=websocket

# Voir les logs du serveur
docker-compose logs -f gameServeur
```

#### augmenter la mémoire vive en production (raspberry pi 4 model b 2gb)

```bash
# Réduire les processus Gunicorn
# Dans docker-compose.prod.yml :
command: gunicorn --bind 0.0.0.0:5000 --workers 1 ...

# Augmenter les temps d'expiration session
# Dans backend/core/db.py
SESSION_TIMEOUT = 60 * 60  # 1 heure au lieu de 30 min
```

## Sauvegardes et Récupération

### Backup Automatique

```bash
#!/bin/bash
# backup-daily.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

docker-compose -f /home/pi/l2a/docker/docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres l2a_db | \
  gzip > "$BACKUP_DIR/l2a_db_$TIMESTAMP.sql.gz"

# Conserver les 7 derniers backups
find $BACKUP_DIR -name "l2a_db_*.sql.gz" -mtime +7 -delete
```

### Restore d'un Backup

```bash
# Arrêter les services
docker-compose -f docker/docker-compose.prod.yml down

# Restaurer
docker-compose -f docker/docker-compose.prod.yml up -d postgres

# Attendre PostgreSQL
sleep 5

# Importer le dump
cat backup-1708345200.sql.gz | gunzip | \
  docker-compose -f docker/docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d l2a_db

# Relancer tous les services
docker-compose -f docker/docker-compose.prod.yml up -d
```

---

**Voir aussi** :

- [ARCHITECTURE.md](ARCHITECTURE.md) - Vue globale du système
- [BACKEND.md](BACKEND.md) - Configuration Backend détaillée
- [DATABASE.md](DATABASE.md) - Configuration PostgreSQL

# Déploiement Production sur Raspberry Pi 4

## Vue d'ensemble

Ce guide explique comment déployer l'application multijoueur sur un Raspberry Pi 4 Model B (2GB RAM). L'application sera accessible sur le port **15256**.

## Architecture de Production

```
┌─────────────────────────────────────────────────┐
│         Raspberry Pi 4 (Port 15256)             │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │         Nginx (Reverse Proxy)             │  │
│  │  - Sert le frontend statique (React)      │  │
│  │  - Proxy vers Backend Flask (/api)        │  │
│  │  - Proxy vers WebSocket (/ws)             │  │
│  └───────────────────────────────────────────┘  │
│                     │                           │
│         ┌───────────┴───────────┐               │
│         │                       │               │
│  ┌──────▼──────┐        ┌──────▼─────────┐      │
│  │   Backend   │        │   WebSocket    │      │
│  │   Flask     │        │   Node.js      │      │
│  │  (Port 5000)│        │  (Port 3001)   │      │
│  └──────┬──────┘        └────────────────┘      │
│         │                                       │
│  ┌──────▼──────────────────────┐                │
│  │   PostgreSQL (Port 5432)    │                │
│  │   Optimisé pour 2GB RAM     │                │
│  └─────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

## Prérequis sur le Raspberry Pi

1. **Système d'exploitation** : Raspberry Pi OS (64-bit recommandé)
2. **Docker & Docker Compose** installés
3. **Connexion réseau** stable
4. **Port 15256** ouvert sur le firewall

### Installation de Docker sur Raspberry Pi

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt install docker-compose -y

# Redémarrer pour appliquer les changements
sudo reboot
```

## Configuration avant le déploiement

### 1. Configuration des variables d'environnement

Dans le dossier `/docker`, créer un fichier `.env` basé sur `.env.prod.example` :

```bash
cd docker
cp .env.prod.example .env
nano .env  # ou vim, emacs, etc.
```

**Modifier impérativement** :
- `POSTGRES_PASSWORD` : mot de passe fort et unique
- `SECRET_KEY` : clé secrète Flask (génération recommandée)
- Les URLs avec l'IP réelle du Raspberry Pi

Exemple de génération de clés :
```bash
# Générer un mot de passe PostgreSQL
openssl rand -base64 32

# Générer une SECRET_KEY Flask
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Configuration du frontend

Dans le dossier `/frontend`, créer un fichier `.env.production` :

```bash
cd ../frontend
cp .env.production.example .env.production
nano .env.production
```

Remplacer `RASPBERRY_IP` par l'IP réelle du Raspberry Pi :
```bash
VITE_BACKEND_URL=http://192.168.1.100:15256/api
VITE_WS_URL=ws://192.168.1.100:15256/ws
```

## Déploiement

### Méthode automatique (recommandée)

```bash
cd docker
./deploy-prod.sh
```

Ce script effectue :
1. ✅ Construction du frontend (build optimisé)
2. ✅ Arrêt des conteneurs existants
3. ✅ Construction des images Docker
4. ✅ Démarrage des services
5. ✅ Initialisation de la base de données
6. ✅ Vérification du statut

### Méthode manuelle

```bash
# 1. Build du frontend
cd frontend
npm install
npm run build
cd ../docker

# 2. Démarrer les services
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Initialiser la base de données
docker-compose -f docker-compose.prod.yml exec backend python -c "
from backend.core.db import initialize_database
initialize_database()
"
```

## Gestion de l'application

### Commandes utiles

```bash
cd docker

# Voir les logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f ws-server

# Arrêter l'application
docker-compose -f docker-compose.prod.yml down

# Arrêter et supprimer les volumes (⚠️ supprime la base de données)
docker-compose -f docker-compose.prod.yml down -v

# Redémarrer tous les services
docker-compose -f docker-compose.prod.yml restart

# Redémarrer un service spécifique
docker-compose -f docker-compose.prod.yml restart backend

# Voir le statut des services
docker-compose -f docker-compose.prod.yml ps
```

### Mise à jour de l'application

```bash
cd docker

# 1. Récupérer les dernières modifications
git pull origin main

# 2. Relancer le déploiement
./deploy-prod.sh
```

## Accès à l'application

Une fois déployée, l'application est accessible :

**URL** : `http://<IP_RASPBERRY_PI>:15256`

Exemple : `http://192.168.1.100:15256`

### Trouver l'IP du Raspberry Pi

```bash
hostname -I | awk '{print $1}'
```

## Multijoueur

### Comment ça fonctionne ?

1. **Plusieurs joueurs** se connectent avec des comptes différents
2. **Salle d'attente** : minimum 2 joueurs pour démarrer une partie
3. **WebSocket** : communication en temps réel entre joueurs
4. **Base de données** : stockage des scores, profils, historique

### Ports utilisés

- **15256** : Frontend + API HTTP + WebSocket (accessible de l'extérieur)
- **5432** : PostgreSQL (interne seulement)
- **5000** : Backend Flask (interne seulement)
- **3001** : WebSocket Node.js (interne seulement)

## Base de données

### Optimisation pour Raspberry Pi

La configuration PostgreSQL est optimisée pour **2GB de RAM** :
- `shared_buffers = 128MB`
- `max_connections = 30`
- `work_mem = 4MB`

Voir [postgres-prod.conf](postgres-prod.conf) pour plus de détails.

### Sauvegarde de la base de données

```bash
# Exporter la base de données
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U l2a_user l2a_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer une sauvegarde
cat backup_XXXXXXXX_XXXXXX.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U l2a_user -d l2a_production
```

### Alternative : SQLite (pour économiser encore plus de RAM)

Si vous voulez utiliser SQLite au lieu de PostgreSQL, il faudra :
1. Modifier `backend/core/db.py` pour utiliser `sqlite3`
2. Adapter les requêtes SQL (syntaxe légèrement différente)
3. Retirer le service `db` du docker-compose.prod.yml

⚠️ **Note** : SQLite ne supporte pas les connexions concurrentes multiples aussi bien que PostgreSQL.

## Performances et optimisation

### Monitoring

```bash
# Utilisation CPU et RAM des conteneurs
docker stats

# Espace disque
df -h
```

### Limites de ressources

Les services ont des limites configurées :
- **Backend** : 512MB max
- **PostgreSQL** : 512MB max  
- **WebSocket** : 256MB max
- **Nginx** : 128MB max

Voir [docker-compose.prod.yml](docker-compose.prod.yml) pour ajuster.

## Dépannage

### Le site n'est pas accessible

```bash
# Vérifier que les services tournent
docker-compose -f docker-compose.prod.yml ps

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.prod.yml logs backend

# Vérifier que le port est ouvert
sudo netstat -tulpn | grep 15256
```

### Erreurs de base de données

```bash
# Réinitialiser la base de données
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
# Attendre 10 secondes
docker-compose -f docker-compose.prod.yml exec backend python -c "
from backend.core.db import initialize_database
initialize_database()
"
```

### Problèmes de mémoire

Si le Raspberry Pi manque de RAM :

1. Réduire les limites dans docker-compose.prod.yml
2. Activer le swap :
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Augmenter CONF_SWAPSIZE à 2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### WebSocket ne se connecte pas

Vérifier que le frontend utilise la bonne URL :
```bash
# Dans .env.production du frontend
VITE_WS_URL=ws://IP_RASPBERRY:15256/ws
```

## Sécurité

### Recommandations

1. ✅ Changer **tous** les mots de passe par défaut
2. ✅ Utiliser des mots de passe forts (32+ caractères)
3. ✅ Configurer un firewall (ufw recommandé)
4. ✅ Mettre à jour régulièrement le système
5. ✅ Activer HTTPS avec certbot/Let's Encrypt (optionnel)

### Firewall (UFW)

```bash
# Installer et configurer UFW
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 15256/tcp
sudo ufw enable
```

## Différences Dev vs Prod

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Fichier** | docker-compose.dev.yml | docker-compose.prod.yml |
| **Port** | 5173 (+ 5000, 3001) | 15256 (unique) |
| **Volumes** | Code monté en live | Code copié dans l'image |
| **Hot reload** | ✅ Oui | ❌ Non |
| **Serveur** | Flask dev server | Gunicorn (production) |
| **Frontend** | Vite dev server | Build statique + Nginx |
| **Logs** | Verbeux | Optimisés |
| **RAM** | Non limitée | Limitée par service |

## Support

Pour toute question ou problème, consultez :
- [ARCHITECTURE.md](../ARCHITECTURE.md) : Architecture du projet
- [README.md](../README.md) : Documentation générale
- Logs : `docker-compose -f docker-compose.prod.yml logs`

---

**Note** : Ce projet est configuré pour le multijoueur. Chaque joueur doit avoir son propre compte et se connecter avec son navigateur sur le port 15256 du Raspberry Pi.

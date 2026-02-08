# Docker - Configuration du Projet L2A

Ce dossier contient toutes les configurations Docker pour le déploiement du projet en développement et en production.

## 📁 Fichiers

### Configurations Docker Compose

| Fichier | Environnement | Description |
|---------|---------------|-------------|
| **docker-compose.dev.yml** | Développement | Configuration pour le développement local avec hot-reload |
| **docker-compose.prod.yml** | Production | Configuration optimisée pour Raspberry Pi 4 (2GB RAM) |
| **docker-compose.test.yml** | Tests | Configuration pour l'exécution des tests |

### Configurations serveurs

| Fichier | Service | Description |
|---------|---------|-------------|
| **nginx-prod.conf** | Nginx | Reverse proxy pour production (port 15256) |
| **postgres-prod.conf** | PostgreSQL | Configuration optimisée pour Raspberry Pi |

### Variables d'environnement

| Fichier | Usage |
|---------|-------|
| **.env.prod.example** | Template pour les variables de production |

### Scripts

| Script | Description |
|--------|-------------|
| **deploy-prod.sh** | Script automatique de déploiement en production |

### Dockerfiles

| Fichier | Service |
|---------|---------|
| **backend/Dockerfile** | Image Docker pour le backend Flask |
| **frontend/Dockerfile** | Image Docker pour le frontend React (dev uniquement) |

## 🚀 Démarrage rapide

### Développement

```bash
# Lancer l'application en mode développement
docker-compose -f docker-compose.dev.yml up -d

# Voir les logs
docker-compose -f docker-compose.dev.yml logs -f

# Arrêter
docker-compose -f docker-compose.dev.yml down
```

**Accès** :
- Frontend : http://localhost:5173
- Backend API : http://localhost:5000/api
- WebSocket : ws://localhost:3001
- PostgreSQL : localhost:5432

### Production (Raspberry Pi)

**Première fois** :
```bash
# 1. Configurer les variables d'environnement
cp .env.prod.example .env
nano .env  # Modifier les mots de passe et l'IP

# 2. Configurer le frontend
cd ../frontend
cp .env.production.example .env.production
nano .env.production  # Modifier avec l'IP du Raspberry Pi

# 3. Déployer
cd ../docker
./deploy-prod.sh
```

**Mises à jour** :
```bash
git pull origin main
./deploy-prod.sh
```

**Accès** :
- Application complète : http://RASPBERRY_IP:15256

## 📊 Comparaison Dev vs Prod

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Port** | 5173 (+ 5000, 3001) | 15256 (unique) |
| **Hot Reload** | ✅ Oui | ❌ Non |
| **Serveur web** | Vite Dev Server | Nginx (production) |
| **Backend** | Flask dev | Gunicorn (4 workers) |
| **Volumes** | Code monté | Code copié dans l'image |
| **Logs** | Verbeux | Optimisés |
| **Ressources** | Illimitées | Limitées (512MB backend, 512MB DB) |
| **Sécurité** | CORS permissif | Restreint à l'IP du Raspberry |

## 🏗️ Architecture de production

```
Port 15256 (externe)
        ↓
   ┌─────────┐
   │  Nginx  │ ← Reverse Proxy + Frontend statique
   └────┬────┘
        ├──→ /api      → Backend Flask (port 5000)
        ├──→ /ws       → WebSocket Node.js (port 3001)
        └──→ / (reste) → Frontend React (fichiers statiques)
```

## 💾 Bases de données

### PostgreSQL (par défaut)

**Développement** :
- Port : 5432 (accessible en local)
- User : `mon_user`
- Password : `mon_pass`
- DB : `ma_db`

**Production** :
- Port : 5432 (interne seulement, via Docker network)
- User/Password/DB : configurés dans `.env`
- Optimisé pour 2GB RAM (voir `postgres-prod.conf`)

### Sauvegarde et restauration

```bash
# Sauvegarder
docker-compose -f docker-compose.prod.yml exec -T db pg_dump \
  -U l2a_user l2a_production > backup.sql

# Restaurer
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U l2a_user -d l2a_production
```

## 🔧 Commandes utiles

### Logs

```bash
# Tous les services
docker-compose -f docker-compose.prod.yml logs -f

# Un service spécifique
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f ws-server
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Statut des services

```bash
# Voir les conteneurs actifs
docker-compose -f docker-compose.prod.yml ps

# Statistiques en temps réel
docker stats
```

### Redémarrer

```bash
# Tous les services
docker-compose -f docker-compose.prod.yml restart

# Un service spécifique
docker-compose -f docker-compose.prod.yml restart backend
```

### Reconstruire

```bash
# Reconstruire et redémarrer
docker-compose -f docker-compose.prod.yml up -d --build

# Reconstruire sans cache
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Nettoyage

```bash
# Arrêter et supprimer les conteneurs
docker-compose -f docker-compose.prod.yml down

# Supprimer aussi les volumes (⚠️ perte de données)
docker-compose -f docker-compose.prod.yml down -v

# Nettoyer les images inutilisées
docker system prune -a
```

## 🔐 Sécurité

### Variables sensibles

Ne **JAMAIS** commiter :
- `.env` (production)
- Fichiers contenant des mots de passe
- Clés secrètes

Toujours utiliser des fichiers `.example` comme templates.

### Permissions

```bash
# Rendre les scripts exécutables
chmod +x deploy-prod.sh
chmod +x ../frontend/build-prod.sh
```

### Firewall (UFW)

```bash
# Configurer le firewall sur Raspberry Pi
sudo ufw allow 15256/tcp
sudo ufw enable
```

## 📈 Monitoring

### Ressources

```bash
# Utilisation CPU/RAM par conteneur
docker stats

# Espace disque
df -h
docker system df
```

### Santé des services

```bash
# Health check de la base de données
docker-compose -f docker-compose.prod.yml exec db \
  pg_isready -U l2a_user -d l2a_production

# Test du backend
curl http://localhost:15256/api/health

# Test du WebSocket
websocat ws://localhost:15256/ws
```

## 🐛 Dépannage

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs

# Vérifier l'espace disque
df -h

# Nettoyer les images/conteneurs orphelins
docker system prune
```

### Erreur de connexion à la base de données

```bash
# Vérifier que le service DB est démarré
docker-compose -f docker-compose.prod.yml ps db

# Vérifier le healthcheck
docker-compose -f docker-compose.prod.yml exec db \
  pg_isready -U l2a_user -d l2a_production

# Réinitialiser la base de données
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### Le site ne répond pas sur le port 15256

```bash
# Vérifier que Nginx écoute
docker-compose -f docker-compose.prod.yml ps nginx

# Vérifier les logs Nginx
docker-compose -f docker-compose.prod.yml logs nginx

# Vérifier que le port est ouvert
sudo netstat -tulpn | grep 15256
```

### Problèmes de mémoire

Sur Raspberry Pi avec 2GB RAM :

1. **Activer le swap** :
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

2. **Réduire les limites** dans `docker-compose.prod.yml` :
```yaml
deploy:
  resources:
    limits:
      memory: 256M  # au lieu de 512M
```

## 📚 Documentation complète

- **[DEPLOIEMENT_PRODUCTION.md](DEPLOIEMENT_PRODUCTION.md)** : Guide complet de déploiement sur Raspberry Pi
- **[../WIKI/MULTIJOUEUR.md](../WIKI/MULTIJOUEUR.md)** : Explication de la logique multijoueur
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** : Architecture globale du projet
- **[../README.md](../README.md)** : Documentation principale

## 🆘 Support

En cas de problème :
1. Consulter les logs : `docker-compose logs`
2. Vérifier les variables d'environnement dans `.env`
3. Vérifier que tous les ports sont accessibles
4. Consulter la documentation détaillée

---

**Note** : Le fichier `docker-compose.yml` a été renommé en `docker-compose.dev.yml` pour distinguer clairement le développement de la production.

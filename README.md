# **Projet T-Rex Game Evolve** — Jeu en ligne (Groupe G34)

> Un jeu T-Rex multijoueur moderne avec React, Flask, WebSocket et PostgreSQL. Pour faire des parties en multijoueur.

---

## Documentation complète

Consultez le **[Wiki du projet](WIKI/README.md)** pour une documentation approfondie :

- **[Architecture](WIKI/ARCHITECTURE.md)** — Vue d'ensemble technique du système
- **[Frontend](WIKI/FRONTEND.md)** — Guide React/Vite et composants UI
- **[Backend](WIKI/BACKEND.md)** — API Flask et authentification
- **[Database](WIKI/DATABASE.md)** — Schéma PostgreSQL et migrations
- **[WebSocket](WIKI/WEBSOCKET.md)** — Gestion temps réel multijoueur
- **[API](WIKI/API.md)** — Référence complète des endpoints
- **[Deployment](WIKI/DEPLOYMENT.md)** — Guide de déploiement production

---

## Démarrage rapide

### Prérequis

- **Docker & Docker Compose** (recommandé)
- **Python 3.10+** et **Node.js 18+**
- **PostgreSQL 14+**

### Installation

```bash
# 1. Installer les dépendances Python
bash ./script/install_requirements.sh

# 2. Activer l'environnement virtuel
source .venv/bin/activate

# 3. Recharger VS Code
# CTRL + MAJ + P => "Developer: Reload Window"

# 4. Démarrer les services Docker
bash ./script/docker-dev.sh
```

### Accès au serveur de développement

**Frontend** : http://localhost:5173/  
**Backend API** : http://localhost:5000/  
**WebSocket** : ws://localhost:3001/

---

## Structure du projet

```
projet-l2a-g34/
├── frontend/          # Application React (Vite)
│   ├── src/jsx/       # Composants React
│   ├── public/        # Assets statiques
│   └── package.json
├── backend/           # API Flask
│   ├── app.py         # Point d'entrée
│   ├── core/          # Modules métier
│   ├── pages/         # Routes API
│   └── init_db/       # Scripts d'initialisation DB
├── docker/            # Configuration Docker
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
├── script/            # Scripts d'automatisation (voir ci-dessous)
├── test/              # Suite de tests
│   ├── backend/       # Tests Python (pytest)
│   └── frontend/      # Tests E2E (Playwright)
└── WIKI/              # Documentation technique
```

---

## Scripts utilitaires

Le dossier `script/` contient des outils pour simplifier le développement et le déploiement :

### `install_requirements.sh`

**Installation des dépendances Python**

```bash
bash ./script/install_requirements.sh [options]

Options:
  -r <path>    Fichier requirements (défaut: backend/requirements-dev.txt)
  -v <path>    Chemin du venv (défaut: .venv)
  -f           Force la recréation du venv

Exemples:
  bash ./script/install_requirements.sh              # Installation standard
  bash ./script/install_requirements.sh -f           # Recréer le venv
  bash ./script/install_requirements.sh -r backend/requirements-prod.txt
```

**Utilisation :** Première installation ou mise à jour des dépendances Python.

---

### `docker-dev.sh`

**Gestion de l'environnement Docker de développement**

```bash
bash ./script/docker-dev.sh [command]

Commands:
  (aucun)      Démarrage rapide (sans rebuild)
  update       Reconstruction complète des images
  stop         Arrêt des conteneurs
  logs         Affichage des logs
  clean        Nettoyage complet (volumes inclus)

Exemples:
  bash ./script/docker-dev.sh                # Démarrage rapide
  bash ./script/docker-dev.sh update         # Rebuild + redémarrage
  bash ./script/docker-dev.sh logs backend   # Logs backend uniquement
```

**Utilisation :** Gestion quotidienne de l'environnement Docker (démarrage, rebuild, logs).

---

### `run_tests.sh`

**Exécution de la suite de tests complète**

```bash
bash ./script/run_tests.sh

Fonctionnalités:
  Détection automatique de Docker dev (arrêt/redémarrage auto)
  Tests backend (pytest + coverage)
  Tests frontend (Playwright E2E)
  Linting (pylint, flake8, mypy, ESLint)
  Génération de rapports (JUnit + Cobertura)

Rapports générés dans test/reports/:
  - junit-backend.xml, junit-frontend.xml
  - coverage-backend.xml, coverage-frontend.xml
  - pytest.log
```

**Utilisation :** CI/CD local, vérification avant commit/push.

---

### `deploy-prod.sh`

**Déploiement automatisé en production (Raspberry Pi)**

```bash
bash ./script/deploy-prod.sh

Étapes automatiques:
  1. Saisie interactive de l'IP Raspberry Pi
  2. Validation (format, ping, SSH port 22)
  3. Génération des fichiers .env.production
  4. Build frontend (npm install + build)
  5. Lancement Docker Compose production
  6. Vérification santé des services

Fichiers générés:
  - docker/.env.production
  - frontend/.env.production
```

**Utilisation :** Déploiement one-click sur serveur de production.

---

## Comptes par défaut

Les comptes de test sont définis dans `backend/init_db/db_init.json` :

```json
{
  "users": [
    { "username": "admin", "password": "admin123", "language": "fr" },
    { "username": "user1", "password": "password", "language": "fr" }
  ]
}
```

**Important :** Changez ces identifiants en production !

---

## Tests

### Lancer tous les tests

```bash
bash ./script/run_tests.sh
```

### Tests backend uniquement

```bash
source .venv/bin/activate
pytest test/backend/ -v --cov=backend --cov-report=xml
```

### Tests frontend E2E

```bash
cd frontend
npm run test:e2e
```

### Linting

```bash
# Python
pylint backend/ --rcfile=pyproject.toml
flake8 backend/
mypy backend/

# JavaScript/JSX
npm run lint
```

---

## Dépannage

### Problème de CSS (cache navigateur)

```
CTRL + MAJ + R  (vidage du cache forcé)
```

### Logs Docker

```bash
docker compose -f docker/docker-compose.dev.yml logs backend --tail 200
docker compose -f docker/docker-compose.dev.yml logs frontend --tail 50
```

### Problème de virtualenv (chemin absolu cassé)

Si vous obtenez `mauvais interpréteur: Aucun fichier ou dossier` :

```bash
bash ./script/install_requirements.sh -f  # Recrée le venv
```

### WebSocket ne se connecte pas

```bash
# Vérifier que le serveur WS tourne
docker compose -f docker/docker-compose.dev.yml ps

# Redémarrer complètement
bash ./script/docker-dev.sh update
```

---

## Mise à jour des dépendances

### Python

```bash
bash ./script/install_requirements.sh -f
```

### Node.js

```bash
cd frontend
npm install
npm update
```

---

## Licence

Projet étudiant — Groupe G34 — 2026

---

## Liens utiles

- [Wiki complet](WIKI/README.md)
- [Guide de déploiement](WIKI/DEPLOYMENT.md)
- [Architecture technique](WIKI/ARCHITECTURE.md)
- [Référence API](WIKI/API.md)

L'utilisation d'IA a été utilisée pour la création de documentation (schéma, formattage, correction erreur, logique).

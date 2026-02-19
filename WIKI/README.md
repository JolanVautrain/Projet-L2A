# Documentation - Jeu en Ligne L2A

Bienvenue dans la documentation du projet L2A, une plateforme de jeu en ligne moderne et complète.

## Vue d'ensemble

Le **Projet T Rex Game Evolve** est une **plateforme de jeu multijoueur en temps réel** construite avec une architecture moderne et scalable. Elle combine un backend Flask robuste, un frontend React dynamique, et un système WebSocket pour la communication en temps réel.

### Caractéristiques principales

- **Gameplay multijoueur en temps réel** via WebSocket
- **Système d'authentification et de comptes utilisateurs** robuste
- **Classement en direct** avec statistiques détaillées
- **Système de boutique** pour les achats in-game
- **Système d'administration** complet
- **Interface responsive** pour tous les appareils
- **Infrastructure de déploiement** optimisée pour Raspberry Pi

## Documentation

### Architecture et Concepts

- [**Architecture Générale**](ARCHITECTURE.md) - Vue d'ensemble de la structure du système
- [**Concepts Fondamentaux**](CONCEPTS.md) - Les principes majeurs du projet

### Implémentation Technique

- [**Backend Flask**](BACKEND.md) - API serveur, authentification, logique métier
- [**Frontend React**](FRONTEND.md) - Interface utilisateur, composants, gestion d'état
- [**Base de Données**](DATABASE.md) - Schéma, modèles de données, migrations
- [**Système Multijoueur WebSocket**](WEBSOCKET.md) - Communication en temps réel

### Référence API

- [**Documentation API**](API.md) - Endpoints, paramétrages, réponses

### Déploiement

- [**Déploiement et Infrastructure**](DEPLOYMENT.md) - Docker, production, configuration serveur

## Démarrage Rapide

### Installation Locale

```bash
# Installation des dépendances
bash ./script/install_requirements.sh

# Activation de l'environnement virtuel
source .venv/bin/activate

# Lancer l'application avec Docker
bash ./script/docker-dev.sh
```

### Accès au Serveur

- **URL Development** : http://localhost:15256/
- **Backend API** : http://localhost:5000/
- **WebSocket** : ws://localhost:3001

## Tests

```bash
# Lancer tous les tests
bash ./script/run_tests.sh

# Les rapports sont générés dans test/reports/
```

## Structure du Projet

```
.
├── backend/           # API Flask et logique métier
├── frontend/          # Interface React
├── docker/            # Configuration Docker et Nginx
├── test/              # Tests backend et frontend
├── script/            # Scripts d'installation et de déploiement
└── WIKI/              # Cette documentation
```

## Conventions

### Code

- **Python** : PEP 8, type hints, linting avec Pylint/MyPy
- **JavaScript** : ESLint, Prettier, conventions React modernes
- **Git** : Commits descriptifs, branches feature-branch-name

### Documentation

- Pages en Markdown pour une meilleure accessibilité
- Schémas ASCII pour les architectures
- Exemples de code pour chaque concept majeur

## Utiles

- **Architecture détaillée** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Guide Backend** → [BACKEND.md](BACKEND.md)
- **Guide Frontend** → [FRONTEND.md](FRONTEND.md)
- **Déploiement** → [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Dernière mise à jour** : 19 février 2026

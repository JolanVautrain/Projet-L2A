# Projet L2A — Jeu en ligne (Groupe G34)

## Description

Application web de jeu développée dans le cadre du projet L2A. Le dépôt sépare le frontend (React + Vite) et le backend (Flask). Le projet vise une mise en place simple, un développement local fluide et un déploiement via Docker.

## Fonctionnalités principales

- Lancer et rejoindre des parties
- Interface réactive (Vite + React)
- Gestion basique d'identité côté client (persistance locale)
- Conteneurisation avec Docker pour déploiement et tests

## Structure du dépôt

- `frontend/` : code client (Vite, React). Sources en `frontend/src/`.
- `backend/` : API serveur (Flask). Point d'entrée : `backend/app.py`.
- `docker/` : Dockerfiles, scripts et `docker-compose.yml` pour orchestrer les services.

## Prérequis

- Node.js 16+ (frontend)
- Python 3.8+ (backend)
- Docker & Docker Compose (recommandés pour déploiement)


## Exécution via Docker

Pour construire et lancer l'ensemble avec Docker Compose :

```bash
cd docker
docker-compose up --build
```

## Notes techniques

- Le frontend stocke actuellement le nom d'utilisateur dans `localStorage` pour conserver la session après rafraîchissement. Pour un usage en production, remplacer par une authentification tokenisée (JWT) et gestion côté serveur.
- Les styles se trouvent dans `frontend/src/css/` et les composants React dans `frontend/src/jsx/`.

## Propositions d'amélioration

- Ajouter une API d'authentification sécurisée (tokens, rafraîchissement)
- Ajouter une suite de tests (Jest + React Testing Library pour le frontend, pytest pour le backend)
- Documenter les variables d'environnement nécessaires pour la production

## Contact

Ouvrez une issue pour signaler un bug ou demander une fonctionnalité.

docker compose logs backend --tail 200

curl.exe -v -X OPTIONS "http://localhost:5000/api/admin/delete-xp-history/admin" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: X-Admin-User"

curl.exe -v -X POST "http://localhost:5000/api/admin/delete-xp-history/admin" -H "X-Admin-User: admin"
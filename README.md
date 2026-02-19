# **Projet T Rex Game Evolve** — Jeu en ligne (Groupe G34)

## Structure du dépôt

- `frontend/` : code client (Vite, React). Sources en `frontend/src/`.
- `backend/` : API serveur (Flask). Point d'entrée : `backend/app.py`.
- `docker/` : Dockerfiles, scripts et `docker-compose.yml` pour orchestrer les services.

## Lancer le projet

- Bash (Linux / macOS) :

```bash
# crée et installe deps
bash ./script/install_requirements_V2.sh
# activer la venv
source .venv/bin/activate
# recharger la page vscode
CTRL + MAJ + P => Recharger la page/Reload the page
```

## Développement

Pour accéder au serveur de développpement, il faut passer par le docker nginx soit le l'url :

http://localhost:5173/

## Mettre à jour les dockers

```bash
# Pour un redémarrage complet utile pour le docker websocket
bash ./script/docker-dev.sh update

# Pour un redémarrage rapide (à éviter et fais par défaut par le docker)
bash ./script/docker-dev.sh
```

## Lancer les tests localement

Utilisez les scripts fournis pour initialiser l'environnement et exécuter les tests — c'est la méthode recommandée :

- PowerShell (Windows) :

Il n'est plus pris en charge dans le développement. Merci de basculer sur Linux.

- Bash (Linux / macOS) :

```bash
# lancer les tests (génère rapports dans tests/reports)
bash ./script/run_tests_V2.sh
```

Les rapports et logs de tests sont écrits dans `tests/reports/` :

- `tests/reports/junit.xml` (JUnit)
- `tests/reports/coverage.xml` (coverage, format Cobertura)
- `tests/reports/pytest.log` (log console)

Docker / debug :

```
docker compose logs backend --tail 200
```

## Mettre à jour les dépendances du projet

il suffit de faire la commande :

```bash
./script/script/install_requirements.sh
```

## En cas de probleme de css sur le navigateur lors du développement

il suffit de purger complétement le cache du site :

```
CRTL + MAJ + R
```

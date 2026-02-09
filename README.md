# Projet L2A — Jeu en ligne (Groupe G34)

## Structure du dépôt

- `frontend/` : code client (Vite, React). Sources en `frontend/src/`.
- `backend/` : API serveur (Flask). Point d'entrée : `backend/app.py`.
- `docker/` : Dockerfiles, scripts et `docker-compose.yml` pour orchestrer les services.

## Lancer le projet V2

- PowerShell (Windows) : 

Il n'est plus pris en charge dans le développement. Merci de basculer sur Linux.

- Bash (Linux / macOS) :

```bash
# crée et installe deps
bash ./script/install_requirements_V2.sh
# activer la venv
source .venv/bin/activate
# recharger la page vscode
CTRL + MAJ + P => Recharger la page/Reload the page
```

## Lancer les tests localement

Utilisez les scripts fournis pour initialiser l'environnement et exécuter les tests — c'est la méthode recommandée :

- PowerShell (Windows) :

Il n'est plus pris en charge dans le développement. Merci de basculer sur Linux.

- Bash (Linux / macOS) :

```bash
# lancer les tests (génère rapports dans backend/tests/reports)
bash ./script/run_tests_V2.sh
```

Les rapports et logs de tests sont écrits dans `backend/tests/reports/` :

- `backend/tests/reports/junit.xml` (JUnit)
- `backend/tests/reports/coverage.xml` (coverage, format Cobertura)
- `backend/tests/reports/pytest.log` (log console)

Vous pouvez lancer manuellement `pytest` comme suit :

```powershell
pytest backend --junitxml=backend/tests/reports/junit.xml --cov=backend --cov-report=xml:backend/tests/reports/coverage.xml
```

Docker / debug :
```
docker compose logs backend --tail 200
```


## Mettre à jour les dépendances du projet

il suffit de faire la commande :
```bash
./script/script/install_requirements_V2.sh
```
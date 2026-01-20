# Projet L2A — Jeu en ligne (Groupe G34)

## Structure du dépôt

- `frontend/` : code client (Vite, React). Sources en `frontend/src/`.
- `backend/` : API serveur (Flask). Point d'entrée : `backend/app.py`.
- `docker/` : Dockerfiles, scripts et `docker-compose.yml` pour orchestrer les services.

## Lancer le projet

- PowerShell (Windows) :

```powershell
# crée et installe deps
.\scripts\init_env.ps1
# activer la venv
. .venv\Scripts\Activate.ps1
# recharger la page vscode
CTRL + MAJ + P => Recharger la page/Reload the page
```

- Bash (Linux / macOS) :

```bash
# crée et installe deps
./scripts/init_env.sh
# activer la venv
source .venv/bin/activate
# recharger la page vscode
CTRL + MAJ + P => Recharger la page/Reload the page
```

## Lancer les tests localement (RECOMMANDÉ : utiliser les scripts)

Utilisez les scripts fournis pour initialiser l'environnement et exécuter les tests — c'est la méthode recommandée :

- PowerShell (Windows) :

```powershell
# lancer les tests (génère rapports dans backend/tests/reports)
.\scripts\run_tests.ps1
```

- Bash (Linux / macOS) :

```bash
# lancer les tests (génère rapports dans backend/tests/reports)
./scripts/run_tests.sh
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

curl.exe -v -X OPTIONS "http://localhost:5000/api/admin/delete-xp-history/admin" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: X-Admin-User"

curl.exe -v -X POST "http://localhost:5000/api/admin/delete-xp-history/admin" -H "X-Admin-User: admin"

npm run lint
npx eslint . --fix
détecter code inutiliser
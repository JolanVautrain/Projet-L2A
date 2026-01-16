# API Backend — Endpoints et exemples

Ce document décrit les endpoints exposés par le backend (Flask) et donne des exemples d'appels. Le code principal se trouve dans `backend/app.py`.

Résumé
------
- Base URL (développement) : `http://localhost:5000`
- CORS activé (le frontend peut appeler l'API depuis un serveur différent)

Endpoints
---------

### GET /api/login

- Description : endpoint de test — renvoie une chaîne simple.
- Exemple :

```bash
curl http://localhost:5000/api/login
```

- Réponse attendue (texte) :

```
hello world
```

### POST /api/login

- Description : vérifie si un utilisateur existe et si le mot de passe correspond. La vérification s'appuie sur une table PostgreSQL `users` initialisée au démarrage de l'application.
- Corps (JSON) :

```json
{
  "username": "test",
  "password": "1234"
}
```

- Exemple d'appel curl :

```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"1234"}'
```

- Réponse JSON :

```json
{
  "userExist": true,
  "passwordIsCorrect": true
}
```

Notes techniques et sécurité
---------------------------
- La base de données PostgreSQL est initialisée dans `app.py` pour créer la table `users` et insérer quelques comptes de test. En production, la création et l'initialisation de la base doivent être gérées séparément (migrations, scripts de seed).
- Les mots de passe sont stockés en clair dans l'exemple — ceci n'est acceptable qu'en développement. En production, stocker des mots de passe hachés (bcrypt/scrypt/argon2) et utiliser TLS.
- L'API ne renvoie pas de tokens d'authentification. Pour une authentification persistante et sécurisée, implémenter JWT (ou sessions côté serveur) et un endpoint de refresh token.
- Vérifier les erreurs de connexion DB et gérer les exceptions pour éviter des fuites d'information.

Configuration
-------------
- Les paramètres de connexion PostgreSQL sont codés dans `connectToDatabase()` (`database`, `user`, `password`, `host`, `port`). Pour la production, les lire depuis des variables d'environnement.

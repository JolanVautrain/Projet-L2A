# Architecture du Projet - Réorganisation

## Backend


### Structure des dossiers

```
backend/
├── app.py                      # Point d'entrée de l'application Flask
├── __init__.py
├── core/                       # Modules principaux (communs)
│   ├── __init__.py
│   ├── admin.py               # Routes administrateur
│   ├── db.py                  # Gestion de la base de données
│   └── utils.py               # Utilitaires communs
├── init_db/                    # Initialisation de la base de données
│   ├── __init__.py
│   ├── db_init.py             # Script d'initialisation
│   └── db_init.json           # Données d'initialisation
└── pages/                      # Routes organisées par page
    ├── __init__.py
    ├── accueil/               # Page d'accueil (login, auth, game)
    │   ├── __init__.py
    │   ├── auth.py            # Authentification, login, register
    │   └── game.py            # Routes du jeu
    ├── classement/            # Page classement (leaderboard)
    │   ├── __init__.py
    │   └── scores.py          # Scores et classement
    └── compte/                # Page compte utilisateur
        ├── __init__.py
        └── users.py           # Profils, sessions, XP

```

## Fronted

### Structure des dossiers

```
frontend/src/
├── jsx/
│   ├── Index.jsx              # Composant principal et routeur
│   ├── main.jsx               # Point d'entrée de l'application
│   ├── accueil/               # Page d'accueil
│   │   ├── Accueil.jsx
│   │   └── modals/
│   │       ├── LoginModal.jsx
│   │       ├── RegisterModal.jsx
│   │       └── ForgotPasswordModal.jsx
│   ├── classement/            # Page classement
│   │   ├── Leaderboard.jsx
│   │   └── modals/
│   ├── compte/                # Page compte
│   │   ├── Account.jsx
│   │   ├── Statistics.jsx
│   │   └── modals/
│   ├── contacts/              # Page contacts
│   │   ├── Contacts.jsx
│   │   └── modals/
│   ├── game/                  # Pages de jeu
│   │   ├── Game.jsx
│   │   ├── GameWaitingRoom.jsx
│   │   └── modals/
│   │       └── ModalGameOver.jsx
│   └── autres/                # Composants utilitaires
│       ├── Language.jsx       # Gestion des langues
│       └── PageNotFound.jsx   # Page 404
└── static/                    # Fichiers statiques
    ├── assets/
    │   └── contacts/          # Images de contact
    ├── css/                   # Feuilles de style
    │   ├── Account.css
    │   ├── Accueil.css
    │   ├── Contacts.css
    │   ├── Game.css
    │   ├── Index.css
    │   ├── Leaderboard.css
    │   ├── LoginModal.css
    │   ├── ModalGameOver.css
    │   ├── PageNotFound.css
    │   └── Statistics.css
    └── locales/               # Traductions
        ├── en.json
        └── fr.json
```

# Structure du Module Game

## Organisation des fichiers

### Game.jsx
Le composant React principal qui initialise et gère le jeu Phaser. C'est le seul fichier qui doit être importé par l'application.

### utils/

#### GameDayNight.js
Gère le cycle jour/nuit basé sur le temps:
- Durée totale du cycle: 20 secondes
- Transitions fluides entre jour, crépuscule et nuit
- Animations du soleil et de la lune

#### GameBackground.js
Crée les arrière-plans cyberpunk/futuristes:
- 3 calques de parallax à vitesses différentes
- Thème cyberpunk avec néons et bâtiments futuristes
- Système de lumières nocturnes

#### GameObstacles.js
Gère la difficulté et les obstacles:
- Progression linéaire de la difficulté (pas exponentielle)
- Spawn progressif des obstacles
- Vitesse équilibrée pour un gameplay fluide

#### GamePhysics.js
Gère la physique et les collisions:
- Mouvement du joueur et gravité
- Détection des collisions
- Mode invincible pour les admins (affiche une étoile jaune)

#### GameControls.js
Gère les entrées clavier:
- Contrôles standards (flèches, espace)
- Raccourci admin: Touches 3 + 4 pour basculer l'invincibilité

## Améliorations implémentées

### 1. Modularisation
- Code divisé en modules logiques réutilisables
- Chaque module gère un aspect spécifique du jeu
- Plus facile à maintenir et à tester

### 2. Cycle jour/nuit basé sur le temps
- 20 secondes pour un cycle complet
- Progression fluide et prévisible
- Animations célestes (soleil/lune)

### 3. Thème cyberpunk
- Arrière-plans futuristes avec néons
- Bâtiments avec fenêtres illuminées la nuit
- Palette de couleurs sombre et futuriste

### 4. Difficulté équilibrée
- Vitesse linéaire: +30 par stage au lieu de +200
- Spawn progressif: -150ms par stage (min 1s)
- Jeu plus long et plus plaisant

### 5. Mode invincible admin
- Touches 3 + 4 simultanément pour basculer
- Affiche une étoile jaune à gauche quand activé
- Permet aux admins de tester sans mourir

## Utilisation

```javascript
import Game from './Game.jsx';

// Dans le JSX
<Game />
```

Le composant gère automatiquement:
- L'initialisation de Phaser
- Tous les systèmes de jeu
- Les événements et callbacks
- Le nettoyage au démontage

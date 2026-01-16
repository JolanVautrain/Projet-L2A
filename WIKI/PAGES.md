# Wiki — Description des pages HTML

Ce document décrit les pages HTML présentes dans `frontend/` et indique leurs points d'entrée JavaScript/JSX, leur rôle et notes d'intégration.

## `index.html`

- Chemin : `frontend/index.html`
- Langue : `fr`
- Rôle : page principale de l'application React. Contient la racine `#root` où Vite/React monte l'application (`main.jsx`).
- Scripts inclus :
  - Chargement de Phaser depuis un CDN (utilisé par certaines pages/jeux).
  - `type="module" src="/src/jsx/main.jsx"` — point d'entrée React principal.
- Notes : utiliser `npm run dev` pour le développement ; Vite sert `index.html` et résout les imports en `src/`.

## `game.html`

- Chemin : `frontend/game.html`
- Langue : `fr`
- Rôle : page dédiée au jeu (mode standalone). Elle monte aussi une application React dans `#root` et inclut le script `game.js` qui contient la logique Phaser/jeu.
- Scripts inclus :
  - Phaser (version chargée depuis CDN dans le head)
  - `type="module" src="/src/jsx/game.jsx"` — point d'entrée React spécifique au jeu
  - `game.js` — script de jeu (phaser) chargé après le montage React
- Notes : cette page peut être testée indépendamment en ouvrant `game.html` via le serveur de développement ou en la servant via le build. Veiller à la cohérence des versions de Phaser entre `index.html` et `game.html`.

## Où chercher le code lié

- Composants React : `frontend/src/jsx/` (`main.jsx`, `game.jsx`, `App.jsx`, etc.)
- Styles : `frontend/src/css/`
- Assets (images, icônes) : `frontend/src/assets/`
- Script de jeu : `frontend/game.js` (si présent)

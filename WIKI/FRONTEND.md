# Guide du Frontend - React + Vite

## Vue d'ensemble

Le frontend est une **Single Page Application (SPA)** construite avec React 18 et Vite. Elle offre une interface utilisateur réactive et moderne.

## Architecture et Structure

```
frontend/
├── index.html                 # Point d'entrée HTML
├── vite.config.js             # Configuration Vite
├── package.json               # Dépendances npm
├── eslint.config.js           # Rules de linting
├── src/
│   ├── main.jsx               # Point d'entrée React
│   ├── jsx/
│   │   ├── Index.jsx          # Routeur principal
│   │   ├── accueil/
│   │   │   ├── Accueil.jsx    # Page d'accueil
│   │   │   └── modals/
│   │   │       ├── LoginModal.jsx
│   │   │       ├── RegisterModal.jsx
│   │   │       └── ForgotPasswordModal.jsx
│   │   ├── game/
│   │   │   ├── Game.jsx       # Écran de jeu
│   │   │   ├── GameWaitingRoom.jsx
│   │   │   └── modals/
│   │   │       └── ModalGameOver.jsx
│   │   ├── classement/
│   │   │   ├── Leaderboard.jsx
│   │   │   └── modals/
│   │   ├── compte/
│   │   │   ├── Account.jsx    # Profil utilisateur
│   │   │   ├── Statistics.jsx
│   │   │   └── modals/
│   │   ├── report/
│   │   │   └── Report.jsx     # Système de signalement
│   │   ├── shop/
│   │   │   └── Shop.jsx       # Boutique
│   │   ├── admin/
│   │   │   └── Admin.jsx      # Panneau admin
│   │   └── autres/
│   │       ├── Language.jsx   # Sélecteur de langue
│   │       ├── Navigation.jsx
│   │       └── PageNotFound.jsx
│   └── assets/
│       ├── css/               # Feuilles de style
│       │   ├── Index.css
│       │   ├── Accueil.css
│       │   ├── Game.css
│       │   ├── Leaderboard.css
│       │   ├── Account.css
│       │   ├── Shop.css
│       │   └── ...
│       ├── locales/           # Traductions i18n
│       │   ├── fr.json
│       │   ├── en.json
│       │   └── ...
│       └── images/
└── public/
    └── assets/                # Ressources statiques
```

## Installation et Démarrage

### Dépendances

Fichier `frontend/package.json` :

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x" // Routing
  },
  "devDependencies": {
    "vite": "^4.x",
    "eslint": "^8.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

### Lancer le Serveur Dev

```bash
cd frontend
npm install
npm run dev

# Frontend accessible sur http://localhost:5173
```

### Build pour Production

```bash
npm run build
# Génère un dossier 'dist/' avec les fichiers optimisés
```

## Concepts Clés

### 1. Routeur Principal (Index.jsx)

```javascript
import { BrowserRouter, Routes, Route } from "react-router-dom";

function Index() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/game" element={<Game />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/account" element={<Account />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 2. Gestion d'État

L'état utilisateur et de session est géré **globalement** via Context API ou état local :

```javascript
const [user, setUser] = useState(null);
const [session, setSession] = useState({
  token: localStorage.getItem("sessionToken"),
  expiresAt: localStorage.getItem("sessionExpires"),
});

// Au chargement du navigateur
useEffect(() => {
  if (session.token) {
    verifySession();
  }
}, []);

async function verifySession() {
  const response = await fetch("/auth/verify", {
    headers: { "X-Session-Token": session.token },
  });
  if (!response.ok) {
    // Session expirée, rediriger vers login
    showLoginModal();
  }
}
```

### 3. Communication API

```javascript
// Fonction générique pour appels API
async function apiCall(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Ajouter le token de session si présent
  if (session.token) {
    headers["X-Session-Token"] = session.token;
  }

  const response = await fetch(`http://localhost:5000${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Rediriger vers login
      showLoginModal();
    }
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Utilisation
async function getLeaderboard() {
  try {
    const data = await apiCall("/leaderboard?page=1&limit=100");
    setLeaderboard(data.players);
  } catch (e) {
    showError("Failed to load leaderboard");
  }
}
```

## Composants Principaux

### Accueil (Accueil.jsx)

Page de démarrage avec options de connexion/inscription.

**State** :

```javascript
const [showLoginModal, setShowLoginModal] = useState(false);
const [showRegisterModal, setShowRegisterModal] = useState(false);
```

**Actions** :

- Afficher modal de connexion
- Afficher modal d'inscription
- Bouton "Jouer" → Rediriger vers `/game` si connecté

### Authentification (Modales)

#### LoginModal.jsx

```javascript
function LoginModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const response = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      // Sauvegarder le token
      localStorage.setItem("sessionToken", response.token);
      localStorage.setItem("sessionExpires", response.expires_at);

      onSuccess(response.user);
      onClose();
    } catch (e) {
      setError("Invalid username or password");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">Se connecter</button>
        </form>
      </div>
    </div>
  );
}
```

#### RegisterModal.jsx

Similaire à LoginModal mais appelle `/auth/register`.

### Jeu (Game.jsx et GameWaitingRoom.jsx)

#### GameWaitingRoom.jsx

```javascript
function GameWaitingRoom() {
  const [playerCount, setPlayerCount] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Créer une partie
    apiCall("/game/join", { method: "POST" }).then((data) => {
      setGameId(data.game_id);

      // Connecter WebSocket
      const ws = new WebSocket(data.websocket_server);
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "join",
            gameId: data.game_id,
          }),
        );
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "player_count") {
          setPlayerCount(message.count);
        }
        if (message.type === "start_game") {
          // Démarrer le jeu
          navigate("/game", { state: { gameId, ws } });
        }
      };

      setSocket(ws);
    });
  }, []);

  return (
    <div className="waiting-room">
      <h2>En attente d'adversaires...</h2>
      <p>Joueurs connectés : {playerCount}</p>
      {playerCount >= 2 && <p>Partie démarre dans 3s...</p>}
    </div>
  );
}
```

#### Game.jsx

Composant principal du jeu. Reçoit le WebSocket et l'ID de partie.

```javascript
function Game() {
  const { state } = useLocation();
  const { gameId, ws } = state;
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Écouter les événements WebSocket
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "action") {
        // Mettre à jour la position d'un joueur
        updatePlayerAction(message);
      }

      if (message.type === "game_end") {
        // Partie terminée
        showGameOverModal(message.results);
      }
    };

    return () => ws.close();
  }, [ws]);

  function sendAction(action) {
    // Envoyer une action au WebSocket
    ws.send(
      JSON.stringify({
        type: "action",
        action: action,
        playerId: user.id,
      }),
    );
  }

  // Capturer les touches du clavier
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleKeyDown(e) {
    if (e.key === " ") {
      sendAction("jump");
    }
    if (e.key === "ArrowLeft") {
      sendAction("moveLeft");
    }
    if (e.key === "ArrowRight") {
      sendAction("moveRight");
    }
  }

  return (
    <div className="game-container">
      <div className="game-area">{/* Canvas ou rendu du jeu */}</div>
      <div className="game-info">
        <p>Joueurs : {players.length}</p>
      </div>
    </div>
  );
}
```

### Classement (Leaderboard.jsx)

```javascript
function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    loadLeaderboard();
  }, [page]);

  async function loadLeaderboard() {
    const data = await apiCall(
      `/leaderboard?page=${page}&limit=${itemsPerPage}`,
    );
    setLeaderboard(data.players);
  }

  return (
    <div className="leaderboard">
      <h1>Classement Global</h1>
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            <th>XP</th>
            <th>Niveau</th>
            <th>Parties</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player) => (
            <tr key={player.id}>
              <td>{player.rank}</td>
              <td>{player.username}</td>
              <td>{player.xp}</td>
              <td>{player.level}</td>
              <td>{player.games_played}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setPage(page - 1)} disabled={page === 1}>
        Précédent
      </button>
      <span>Page {page}</span>
      <button onClick={() => setPage(page + 1)}>Suivant</button>
    </div>
  );
}
```

### Compte Utilisateur (Account.jsx)

```javascript
function Account() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    const userData = await apiCall("/user/me");
    const statsData = await apiCall("/stats/" + userData.id);
    setUser(userData);
    setStats(statsData);
  }

  async function updateProfile(newData) {
    await apiCall("/user/me/update", {
      method: "POST",
      body: JSON.stringify(newData),
    });
    loadUserData();
    setEditing(false);
  }

  return (
    <div className="account-page">
      <h1>{user?.username}</h1>
      <section className="stats">
        <div className="stat-card">
          <h3>XP Total</h3>
          <p className="big-number">{stats?.total_xp}</p>
        </div>
        <div className="stat-card">
          <h3>Rang</h3>
          <p className="big-number">#{stats?.rank}</p>
        </div>
        <div className="stat-card">
          <h3>Niveau</h3>
          <p className="big-number">{stats?.level}</p>
        </div>
        <div className="stat-card">
          <h3>Taux de Victoire</h3>
          <p className="big-number">{(stats?.win_rate * 100).toFixed(1)}%</p>
        </div>
      </section>
      {/* ... autres sections ... */}
    </div>
  );
}
```

### Boutique (Shop.jsx)

```javascript
function Shop() {
  const [items, setItems] = useState([]);
  const [userXp, setUserXp] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShop();
    loadUserXp();
  }, []);

  async function loadShop() {
    const data = await apiCall("/shop");
    setItems(data.items);
  }

  async function loadUserXp() {
    const user = await apiCall("/user/me");
    setUserXp(user.xp);
  }

  async function buyItem(itemId) {
    setLoading(true);
    try {
      const result = await apiCall("/shop/buy", {
        method: "POST",
        body: JSON.stringify({ item_id: itemId }),
      });
      setUserXp(result.remaining_xp);
      showNotification("Item acheté !");
    } catch (e) {
      showError("Impossible d'acheter cet item");
    }
    setLoading(false);
  }

  return (
    <div className="shop">
      <h1>Boutique</h1>
      <p>XP disponibles : {userXp}</p>
      <div className="items-grid">
        {items.map((item) => (
          <div key={item.id} className="item-card">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <p className="cost">{item.cost} XP</p>
            <button
              onClick={() => buyItem(item.id)}
              disabled={userXp < item.cost || loading}
            >
              Acheter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Gestion des Langues (Localisation)

### Fichiers de Traduction

`frontend/public/locales/fr.json` :

```json
{
  "home.title": "Jeu en Ligne L2A",
  "home.play": "Jouer",
  "auth.login": "Connexion",
  "auth.register": "Inscription",
  "game.waiting": "En attente d'adversaires...",
  "leaderboard.rank": "Rang",
  "leaderboard.player": "Joueur",
  "leaderboard.xp": "XP"
}
```

### Utilisation

```javascript
import translations from "../assets/locales/fr.json";

function Page() {
  const t = translations;
  return <h1>{t["home.title"]}</h1>;
}
```

## Styles CSS

### Points d'Entrée CSS

- `assets/css/Index.css` - Styles globaux
- `assets/css/Game.css` - Styles du jeu
- `assets/css/Leaderboard.css` - Styles du classement
- Etc.

### Organisation

```css
/* Styles globaux */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
}

/* Variables CSS pour thèmes */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #4caf50;
  --error-color: #f44336;
  --border-radius: 8px;
}
```

---

## BonnesPratiques

### Gestion des Effects

```javascript
useEffect(() => {
  // Setup
  const subscription = setupSubscription();

  // Cleanup
  return () => subscription.unsubscribe();
}, [dependencies]);
```

### Gestion des Erreurs

```javascript
async function loadData() {
  try {
    const data = await apiCall("/endpoint");
    setData(data);
  } catch (e) {
    console.error(e);
    showError("Une erreur est survenue");
  }
}
```

### Protection des Routes

```javascript
function ProtectedRoute({ children }) {
  const { token } = useSession();

  if (!token) {
    return <Navigate to="/" />;
  }

  return children;
}

// Utilisation
<Route
  path="/game"
  element={
    <ProtectedRoute>
      <Game />
    </ProtectedRoute>
  }
/>;
```

---

**Voir aussi** :

- [ARCHITECTURE.md](ARCHITECTURE.md) - Vue globale
- [BACKEND.md](BACKEND.md) - API Backend
- [WEBSOCKET.md](WEBSOCKET.md) - Communication temps réel

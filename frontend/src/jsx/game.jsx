import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import "../css/game.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="options-buttons">
      <a href="/game.html" class="reload-game">
        Reload Game
      </a>
      <a href="/" class="quit-game">
        Quit Game
      </a>
    </div>
  </StrictMode>
);

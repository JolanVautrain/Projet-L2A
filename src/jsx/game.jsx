import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import "../css/game.css";
import Navbar from "./Navbar.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Navbar />
    <a href="/game.html" class="reload-game">
      Reload Game
    </a>
  </StrictMode>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import App from "./App.jsx";

// Rendu de l'application principale dans l'élément racine
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

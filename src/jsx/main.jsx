import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import Accueil from "./Accueil.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Accueil />
  </StrictMode>
);

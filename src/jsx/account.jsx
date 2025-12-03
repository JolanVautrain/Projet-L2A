import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import "../css/account.css";
import Navbar from "./Navbar.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Navbar />
    <h1>Compte</h1>
  </StrictMode>
);

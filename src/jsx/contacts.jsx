import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../css/index.css";
import "../css/contacts.css";
import Navbar from "./Navbar.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Navbar />
    <h1>Contacts</h1>
  </StrictMode>
);

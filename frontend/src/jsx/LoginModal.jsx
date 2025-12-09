import { createPortal } from "react-dom";
import "../css/LoginModal.css";
import { useState } from "react";

function LoginModal({ isOpen, onClose, action }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch("http://127.0.0.1:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur HTTP: " + response.status);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.userExist) {
          alert("Username is wrong, try again.");
        } else if (!data.passwordIsCorrect) {
          alert("Password is wrong, try again.");
        } else {
          action(true);
        }
      })
      .catch((error) => {
        console.error("Erreur:", error);
      });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="login-modal">
      <h2>Login :</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <input type="submit" value="login" />
      </form>
      <button onClick={onClose}>Close</button>
    </div>,
    document.body
  );
}

export default LoginModal;

import { createPortal } from "react-dom";
import "../css/LoginModal.css";
import { useState } from "react";

function LoginModal({ isOpen, onClose, action }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const username_test = "test";
  const password_test = "1234";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username != username_test) {
      alert("Username is wrong, try again.");
    } else if (password != password_test) {
      alert("Password is wrong, try again.");
    } else {
      action(true);
    }
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

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./ExplosionEffect.css";

export function ExplosionEffect({ x, y, id }) {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!isActive) return null;

  return (
    <div
      className="explosion"
      key={id}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="explosion-burst">💥</div>
      <div className="explosion-particle particle-1">⭐</div>
      <div className="explosion-particle particle-2">⭐</div>
      <div className="explosion-particle particle-3">⭐</div>
      <div className="explosion-particle particle-4">⭐</div>
      <div className="explosion-particle particle-5">⭐</div>
      <div className="explosion-particle particle-6">⭐</div>
    </div>
  );
}

ExplosionEffect.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  id: PropTypes.string.isRequired,
};

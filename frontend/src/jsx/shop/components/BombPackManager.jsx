import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { ExplosionEffect } from "./ExplosionEffect.jsx";

export function BombPackManager({ hasActiveBombPack }) {
  const [explosions, setExplosions] = useState([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    if (!hasActiveBombPack) return;

    const handleClick = (e) => {
      const id = `explosion-${nextId}`;
      const newExplosion = {
        id,
        x: e.clientX,
        y: e.clientY,
      };

      setExplosions((prev) => [...prev, newExplosion]);
      setNextId((prev) => prev + 1);

      // Nettoyer après l'animation
      setTimeout(() => {
        setExplosions((prev) => prev.filter((exp) => exp.id !== id));
      }, 850);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [hasActiveBombPack, nextId]);

  if (!hasActiveBombPack) return null;

  return (
    <>
      {explosions.map((explosion) => (
        <ExplosionEffect
          key={explosion.id}
          id={explosion.id}
          x={explosion.x}
          y={explosion.y}
        />
      ))}
    </>
  );
}

BombPackManager.propTypes = {
  hasActiveBombPack: PropTypes.bool.isRequired,
};

/**
 * Gestion des obstacles et de la difficulté
 */

// Import de la fonction pour vérifier si c'est la nuit
import { isNight } from "./GameDayNight.js";

// Constantes de balancement de difficulté
const BASE_OBSTACLE_SPEED = 200;
const SPEED_INCREMENT = 150; // Au lieu de 200 (exponentiel), on ajoute 30 par stage
const MAX_SPAWN_RATE = 4000; // Minimum 4 secondes entre les obstacles
const MIN_SPAWN_RATE = 1000; // Minimum 1 seconde
const NIGHT_DIFFICULTY_BOOST = 1; // Boost de +3 stages la nuit

let lastSpawnTime = 0;
let obstacles = null;
let obstaclesOpponent = null;
let internalStage = 1;
let multiplayerMode = false;
let modeSolo = true

/**
 * Initialise le système d'obstacles
 */
export function initObstacles(scene) {
  obstacles = scene.physics.add.group();
  obstaclesOpponent = scene.physics.add.group();
  lastSpawnTime = Date.now();
  internalStage = 1;
}

export function setMultiplayerMode(enabled) {
  multiplayerMode = Boolean(enabled);
  modeSolo = false
}

/**
 * Apparition d'une bombe dans le jeu avec style pixel cyberpunk
 */
export function spawnObstacle(scene) {
  if (!scene || !obstacles) return;
  if (multiplayerMode) return;

  const now = Date.now();
  const timeSinceLastSpawn = now - lastSpawnTime;

  // Vérifier si c'est la nuit pour adapter la difficulté
  const nightTime = isNight();

  // Calculer le stage effectif (boosté la nuit)
  const effectiveStage = nightTime
    ? internalStage + NIGHT_DIFFICULTY_BOOST
    : internalStage;

  // À partir du stage 3, chaque stage : 80% chance vitesse augmente, 20% chance bombe supplémentaire
  let bombeCount = 1;
  let speedBoost = 0;

  if (effectiveStage >= 3) {
    // Décider si on augmente la vitesse ou ajoute une bombe
    if (Math.random() < 0.8) {
      // 80% : augmenter la vitesse
      speedBoost = (effectiveStage - 2) * 15; // Boost progressif à partir du stage 3
    } else {
      // 20% : ajouter une bombe supplémentaire
      bombeCount = 2 + Math.floor((effectiveStage - 3) / 3); // 2 à stage 3-5, 3 à stage 6+
    }
  } else {
    // Stage 1-2 : 1 bombe simple
    bombeCount = 1;
  }

  // Calculer l'intervalle de spawn basé sur le stage effectif (linéaire, pas exponentiel)
  const spawnInterval = Math.max(
    MIN_SPAWN_RATE,
    MAX_SPAWN_RATE - (effectiveStage - 1) * 150
  );

  if (timeSinceLastSpawn < spawnInterval) {
    return; // Pas encore prêt à spawner
  }

  lastSpawnTime = now;

  // Calcul de la vitesse: linéaire et équilibrée + boost optionnel
  const obstacleSpeed = -(
    BASE_OBSTACLE_SPEED +
    (effectiveStage - 1) * SPEED_INCREMENT +
    speedBoost
  );

  // Spawner plusieurs bombes avec hauteurs aléatoires - PLUS DE BOMBES EN BAS
  const heightLevels = [
    540, // Très bas (plateforme - bonus difficulty)
    480, // Bas (plateforme)
  ];

  // Pondérer vers les hauteurs basses (70% de chance pour bas/moyen-bas)
  const selectHeight = () => {
    const rand = Math.random();
    if (rand < 0.5) return heightLevels[0]; // 35% très bas
    if (rand < 1) return heightLevels[1]; // 35% bas
    return heightLevels[0]; // 5% haut
  };

  // Sélectionner des hauteurs aléatoires uniques pour cette vague
  const selectedHeights = [];
  for (let i = 0; i < bombeCount; i++) {
    let randomHeight;
    do {
      randomHeight = selectHeight();
    } while (selectedHeights.includes(randomHeight)); // Éviter les doublons
    selectedHeights.push(randomHeight);
  }

  selectedHeights.forEach((baseY, i) => {
    const x = 900 + i * 100; // Décalage horizontal plus grand
    const y = baseY + (Math.random() * 30 - 15); // Variation mineure autour du niveau

    // Utiliser l'asset bombe par défaut avec effet cyberpunk
    const obstacle = obstacles.create(x, y, "obstacle");
    obstacle.setVelocityX(obstacleSpeed);
    obstacle.setImmovable(true);
    obstacle.body.allowGravity = false;

    if (!modeSolo) {
      const obstacle2 = obstaclesOpponent.create(
        x,
        300 - (600 - y),
        "obstacle"
      );
      obstacle2.setVelocityX(obstacleSpeed);
      obstacle2.setImmovable(true);
      obstacle2.body.allowGravity = false;
      obstacle2.setTint(0xff00ff);
    }
    // Teinte magenta cyberpunk
    obstacle.setTint(0xff00ff);
  });

  return true;
}

/**
 * Recycle les obstacles qui sortent de l'écran
 */
export function recycleObstacles(scene, onObstacleRecycled) {
  if (!obstacles) return;

  obstacles.children.iterate((o) => {
    if (o && o.x !== undefined && o.x < -50) {
      o.destroy();
      if (!multiplayerMode) {
        spawnObstacle(scene);
      }

      if (onObstacleRecycled) {
        onObstacleRecycled();
      }
    }
  });
}

/**
 * Met à jour le stage interne
 */
export function updateStage(newStage) {
  internalStage = newStage;
}

/**
 * Retourne le stage actuel
 */
export function getStage() {
  return internalStage;
}

/**
 * Retourne le groupe d'obstacles
 */
export function getObstacles() {
  return obstacles;
}

/**
 * Réinitialise les obstacles
 */
export function resetObstacles() {
  if (obstacles) {
    obstacles.children.iterate((o) => o.destroy());
    obstaclesOpponent.children.iterate((o) => o.destroy());
  }
  internalStage = 1;
  lastSpawnTime = Date.now();
}

export function applySpawnWave(scene, wave) {
  if (!scene || !obstacles || !wave || !Array.isArray(wave.bombs)) return;

  wave.bombs.forEach((bomb) => {
    const x = Number(bomb.x);
    const y = Number(bomb.y);
    if (Number.isNaN(x) || Number.isNaN(y)) return;

    const obstacle = obstacles.create(x, y, "obstacle");
    const obstacle2 = obstaclesOpponent.create(x, 300 - (600 - y), "obstacle");
    obstacle.setVelocityX(wave.speed);
    obstacle.setImmovable(true);
    obstacle.body.allowGravity = false;

    obstacle2.setVelocityX(wave.speed);
    obstacle2.setImmovable(true);
    obstacle2.body.allowGravity = false;

    obstacle.setTint(0xff00ff);
    obstacle2.setTint(0xff00ff);
  });
}

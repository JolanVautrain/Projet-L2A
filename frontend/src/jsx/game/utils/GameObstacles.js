/**
 * Gestion des obstacles et de la difficulté
 */

// Constantes de balancement de difficulté
const BASE_OBSTACLE_SPEED = 200;
const SPEED_INCREMENT = 30; // Au lieu de 200 (exponentiel), on ajoute 30 par stage
const MAX_SPAWN_RATE = 4000; // Minimum 4 secondes entre les obstacles
const MIN_SPAWN_RATE = 1000; // Minimum 1 seconde

let lastSpawnTime = 0;
let obstacles = null;
let internalStage = 1;

/**
 * Initialise le système d'obstacles
 */
export function initObstacles(scene) {
  obstacles = scene.physics.add.group();
  lastSpawnTime = Date.now();
  internalStage = 1;
}

/**
 * Apparition d'une bombe dans le jeu avec style pixel cyberpunk
 */
export function spawnObstacle(scene) {
  if (!scene || !obstacles) return;

  const now = Date.now();
  const timeSinceLastSpawn = now - lastSpawnTime;
  
  // À partir du stage 3, chaque stage : 80% chance vitesse augmente, 20% chance bombe supplémentaire
  let bombeCount = 1;
  let speedBoost = 0;
  
  if (internalStage >= 3) {
    // Décider si on augmente la vitesse ou ajoute une bombe
    if (Math.random() < 0.8) {
      // 80% : augmenter la vitesse
      speedBoost = (internalStage - 2) * 15; // Boost progressif à partir du stage 3
    } else {
      // 20% : ajouter une bombe supplémentaire
      bombeCount = 2 + Math.floor((internalStage - 3) / 3); // 2 à stage 3-5, 3 à stage 6+
    }
  } else {
    // Stage 1-2 : 1 bombe simple
    bombeCount = 1;
  }
  
  // Calculer l'intervalle de spawn basé sur le stage (linéaire, pas exponentiel)
  const spawnInterval = Math.max(
    MIN_SPAWN_RATE,
    MAX_SPAWN_RATE - (internalStage - 1) * 150
  );
  
  if (timeSinceLastSpawn < spawnInterval) {
    return; // Pas encore prêt à spawner
  }
  
  lastSpawnTime = now;
  
  // Calcul de la vitesse: linéaire et équilibrée + boost optionnel
  const obstacleSpeed = -(BASE_OBSTACLE_SPEED + (internalStage - 1) * SPEED_INCREMENT + speedBoost);

  // Spawner plusieurs bombes avec hauteurs aléatoires
  const heightLevels = [
    120,  // Haut (premier quartier)
    250,  // Moyen-haut (demi-hauteur)
    380,  // Moyen-bas (trois quarts)
    500   // Bas (plateforme)
  ];
  
  // Sélectionner des hauteurs aléatoires uniques pour cette vague
  const selectedHeights = [];
  for (let i = 0; i < bombeCount; i++) {
    let randomHeight;
    do {
      randomHeight = heightLevels[Math.floor(Math.random() * heightLevels.length)];
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
      spawnObstacle(scene);
      
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
  }
  internalStage = 1;
  lastSpawnTime = Date.now();
}

/**
 * Système d'améliorations visuelles et d'effets supplémentaires
 */

let enhancementObjects = [];
let particleEmitters = [];

/**
 * Initialise le système d'améliorations
 */
export function initEnhancements(scene) {
  addGlowingPlatforms(scene);
  addBuildingLights(scene);
  addGridBackground(scene);
  addAmbientParticles(scene);
  addHologramicPlayer(scene);
}

/**
 * Ajoute une grille cyberpunk en arrière-plan
 */
function addGridBackground(scene) {
  // Lignes verticales
  for (let x = 0; x < 800; x += 100) {
    const line = scene.add.line(x, 0, 0, 0, 0, 600, 0x00ffff);
    line.setLineWidth(0.5);
    line.setDepth(-99);
    line.setAlpha(0.08);
    enhancementObjects.push(line);
  }
  
  // Lignes horizontales
  for (let y = 0; y < 600; y += 100) {
    const line = scene.add.line(0, y, 0, 0, 800, 0, 0x00ffff);
    line.setLineWidth(0.5);
    line.setDepth(-99);
    line.setAlpha(0.08);
    enhancementObjects.push(line);
  }
}

/**
 * Ajoute des particules ambiantes flottantes
 */
function addAmbientParticles(scene) {
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 600;
    
    const particle = scene.add.circle(x, y, Math.random() * 1.5, 0x00ffff);
    particle.setDepth(-96);
    particle.setAlpha(Math.random() * 0.4 + 0.1);
    
    enhancementObjects.push(particle);
    
    // Animation de mouvement lent
    scene.tweens.add({
      targets: particle,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      duration: 5000 + Math.random() * 5000,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }
}

/**
 * Ajoute un effet holographique au joueur
 */
function addHologramicPlayer(scene) {
  // Sera appelé dynamiquement quand le joueur bouge
  particleEmitters = [];
}

/**
 * Crée un effet holographique derrière le joueur
 */
export function updatePlayerHologram(scene, playerX, playerY) {
  // Créer occasionnellement des petites particules
  if (Math.random() < 0.3) {
    const particle = scene.add.circle(
      playerX + (Math.random() - 0.5) * 20,
      playerY + (Math.random() - 0.5) * 20,
      2,
      0xff00ff
    );
    particle.setDepth(-60);
    particle.setAlpha(0.6);
    
    scene.tweens.add({
      targets: particle,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => particle.destroy()
    });
  }
}

/**
 * Crée un aura d'énergie autour des événements
 */
export function createEnergyAura(scene, x, y, color = 0x00ffff) {
  const aura = scene.add.circle(x, y, 15, undefined);
  aura.setStrokeStyle(1, color, 0.8);
  aura.setDepth(-45);
  
  scene.tweens.add({
    targets: aura,
    radius: 50,
    alpha: 0,
    duration: 500,
    ease: 'Quad.easeOut',
    onComplete: () => aura.destroy()
  });
}

/**
 * Ajoute une lueur RGB dynamique autour des plateformes
 */
function addGlowingPlatforms(scene) {
  // On suppose que les plateformes existent
  // Ajouter un effet de glow autour d'elles
  for (let x = 0; x < 1600; x += 160) {
    const platform = scene.add.rectangle(x, 560, 160, 32);
    
    // Ombre de glow cyan (extérieure)
    const glowOuter = scene.add.rectangle(x, 560, 200, 72, undefined);
    glowOuter.setStrokeStyle(1, 0x00ffff, 0.3);
    glowOuter.setDepth(-50);
    enhancementObjects.push(glowOuter);
    
    // Ombre de glow interne
    const glowInner = scene.add.rectangle(x, 560, 180, 52, undefined);
    glowInner.setStrokeStyle(2, 0xff00ff, 0.2);
    glowInner.setDepth(-51);
    enhancementObjects.push(glowInner);
    
    // Animation pulse alternée
    scene.tweens.add({
      targets: glowOuter,
      alpha: 0.15,
      duration: 2000,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    scene.tweens.add({
      targets: glowInner,
      alpha: 0.3,
      duration: 2500,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }
}

/**
 * Ajoute des lumières clignotantes dans les bâtiments
 */
function addBuildingLights(scene) {
  // Créer des points lumineux supplémentaires dans les fenêtres des bâtiments
  for (let buildingIndex = 0; buildingIndex < 16; buildingIndex++) {
    const baseX = buildingIndex * 100;
    
    // 3-5 fenêtres brillantes aléatoires par bâtiment
    const lightCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < lightCount; i++) {
      const windowY = 80 + Math.random() * 80; // Hauteur de fenêtre aléatoire
      const windowX = baseX + 15 + Math.random() * 50; // Position horizontale aléatoire
      
      // Lumière principale (jaune)
      const light = scene.add.circle(windowX, windowY, 3.5, 0xffff99);
      light.setDepth(-48);
      light.setAlpha(0.8);
      enhancementObjects.push(light);
      
      // Halo glow autour de la lumière
      const glow = scene.add.circle(windowX, windowY, 6, undefined);
      glow.setStrokeStyle(1, 0xffff99, 0.4);
      glow.setDepth(-49);
      enhancementObjects.push(glow);
      
      // Animation de scintillement pour chaque lumière
      scene.tweens.add({
        targets: light,
        alpha: 0.3 + Math.random() * 0.7,
        duration: 1200 + Math.random() * 1800,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 1000
      });
      
      // Animation du glow
      scene.tweens.add({
        targets: glow,
        alpha: 0.1 + Math.random() * 0.4,
        duration: 1500 + Math.random() * 1500,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 800
      });
    }
  }
}

/**
 * Ajoute une vibration/secousse à la caméra
 */
export function cameraShake(scene, intensity = 5, duration = 200) {
  const camera = scene.cameras.main;
  
  scene.tweens.add({
    targets: camera,
    shake: intensity,
    duration: duration,
    ease: 'Sine.easeOut'
  });
}

/**
 * Crée une explosion visuelle au sol (impact)
 */
export function createImpactEffect(scene, x, y) {
  // Onde de choc
  const wave = scene.add.circle(x, y, 10, undefined);
  wave.setStrokeStyle(2, 0x00ffff, 0.8);
  wave.setDepth(-50);
  
  scene.tweens.add({
    targets: wave,
    radius: 80,
    alpha: 0,
    duration: 400,
    ease: 'Cubic.easeOut',
    onComplete: () => wave.destroy()
  });
  
  // Particules de poussière
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    const particle = scene.add.circle(x, y, 2, 0xff00ff);
    particle.setDepth(-49);
    
    const vx = Math.cos(angle) * 150;
    const vy = Math.sin(angle) * 150 - 100;
    
    scene.tweens.add({
      targets: particle,
      x: x + vx,
      y: y + vy,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy()
    });
  }
}

/**
 * Ajoute une traînée de lumière derrière le joueur
 */
export function addPlayerTrail(scene, playerX, playerY) {
  const trail = scene.add.circle(playerX, playerY, 8, 0x00ffff);
  trail.setDepth(-70);
  trail.setAlpha(0.5);
  
  scene.tweens.add({
    targets: trail,
    alpha: 0,
    scale: 1.5,
    duration: 400,
    ease: 'Quad.easeOut',
    onComplete: () => trail.destroy()
  });
}

/**
 * Crée un flash de couleur sur l'écran
 */
export function screenFlash(scene, color = 0xffffff, duration = 300) {
  const flash = scene.add.rectangle(400, 300, 800, 600, color);
  flash.setDepth(200);
  flash.setAlpha(0.4);
  
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: duration,
    onComplete: () => flash.destroy()
  });
}

/**
 * Ajoute du brouillard/vignette au bord de l'écran
 */
export function addVignette(scene) {
  // Haut
  const vigTop = scene.add.rectangle(400, 30, 800, 60, 0x0a0e16);
  vigTop.setDepth(-40);
  vigTop.setAlpha(0.6);
  
  // Bas
  const vigBot = scene.add.rectangle(400, 570, 800, 60, 0x0a0e16);
  vigBot.setDepth(-40);
  vigBot.setAlpha(0.6);
  
  // Gauche
  const vigLeft = scene.add.rectangle(20, 300, 40, 600, 0x0a0e16);
  vigLeft.setDepth(-40);
  vigLeft.setAlpha(0.5);
  
  // Droite
  const vigRight = scene.add.rectangle(780, 300, 40, 600, 0x0a0e16);
  vigRight.setDepth(-40);
  vigRight.setAlpha(0.5);
}

/**
 * Nettoie les objets d'amélioration
 */
export function clearEnhancements() {
  enhancementObjects.forEach(obj => {
    if (obj && obj.destroy) obj.destroy();
  });
  enhancementObjects = [];
}

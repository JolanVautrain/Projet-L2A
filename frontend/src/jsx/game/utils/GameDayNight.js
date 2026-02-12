/**
 * Gestion du cycle jour/nuit basé sur le temps
 * Le cycle complet dure 120 secondes avec trajectoire circulaire réaliste
 * Le soleil et la lune disparaissent progressivement au niveau du sol
 */

let startTime = 0;
let skyTint = null;
let sunSprite = null;
let sunGlowSprite = null;
let moonSprite = null;
let moonGlowSprite = null;
let nightLights = [];
let isNightTime = false;

const CYCLE_DURATION = 120000; // 120 secondes pour un cycle complet
const SUN_DURATION = 60000; // Le soleil dure 60 secondes (0-60s)
const MOON_DURATION = 60000; // La lune dure 60 secondes (60-120s)
const SKY_CENTER_X = 400;
const SKY_CENTER_Y = 400; // Centre de la trajectoire (plus bas pour un meilleur effet)
const ORBIT_RADIUS = 350; // Rayon de l'orbite circulaire (plus grand)
const HORIZON_Y = 540; // Niveau du sol/horizon
const SUN_RADIUS = 45; // Rayon du soleil
const MOON_RADIUS = 38; // Rayon de la lune
// Phases lunaires
const MOON_PHASES = [
  { name: 'new', start: 0, end: 0.12 },
  { name: 'waxing_crescent', start: 0.12, end: 0.25 },
  { name: 'first_quarter', start: 0.25, end: 0.37 },
  { name: 'waxing_gibbous', start: 0.37, end: 0.5 },
  { name: 'full', start: 0.5, end: 0.62 },
  { name: 'waning_gibbous', start: 0.62, end: 0.75 },
  { name: 'last_quarter', start: 0.75, end: 0.87 },
  { name: 'waning_crescent', start: 0.87, end: 1 }
];
/**
 * Initialise le système jour/nuit avec animations réalistes
 */
export function initDayNightSystem(scene) {
  startTime = Date.now();
  
  // Fond de ciel - calque le plus éloigné
  skyTint = scene.add.rectangle(400, 300, 800, 600, 0x1a2634);
  skyTint.setDepth(-100);
  
  // Créer le soleil avec effet de glow amélioré
  // Halo externe (glow diffus)
  const sunOuterGlow = scene.add.circle(100, 500, 80, 0xffdd00);
  sunOuterGlow.setDepth(-91);
  sunOuterGlow.setAlpha(0.15);
  sunOuterGlow.name = 'sunOuterGlow';
  
  // Cercle externe (glow principal)
  sunGlowSprite = scene.add.circle(100, 500, 60, 0xffdd00);
  sunGlowSprite.setDepth(-90);
  sunGlowSprite.setAlpha(0.4);
  
  // Cercle principal du soleil
  sunSprite = scene.add.circle(100, 500, SUN_RADIUS, 0xffdd00);
  sunSprite.setDepth(-89);
  
  // Stocker le glow externe dans le sprite
  sunSprite._outerGlow = sunOuterGlow;
  
  // Créer la lune avec effet de glow amélioré
  // Halo externe (glow diffus lunaire)
  const moonOuterGlow = scene.add.circle(100, 500, 60, 0xaaccff);
  moonOuterGlow.setDepth(-91);
  moonOuterGlow.setAlpha(0);
  moonOuterGlow.name = 'moonOuterGlow';
  
  // Cercle externe (glow principal)
  moonGlowSprite = scene.add.circle(100, 500, 50, 0xf0f0f0);
  moonGlowSprite.setDepth(-90);
  moonGlowSprite.setAlpha(0);
  
  // Cercle principal de la lune
  moonSprite = scene.add.circle(100, 500, MOON_RADIUS, 0xf0f0f0);
  moonSprite.setDepth(-89);
  moonSprite.setAlpha(0);
  
  // Stocker le glow externe dans le sprite
  moonSprite._outerGlow = moonOuterGlow;
  
  nightLights = [];
}

/**
 * Calcule la visibilité d'un astre au niveau de l'horizon
 * Retourne un facteur de 0 (caché) à 1 (totalement visible)
 */
function calculateHorizonVisibility(y, radius) {
  const topEdge = y - radius;
  const bottomEdge = y + radius;
  
  // Si l'astre est totalement au-dessus de l'horizon
  if (bottomEdge <= HORIZON_Y) {
    return 1;
  }
  // Si l'astre est totalement sous l'horizon
  if (topEdge >= HORIZON_Y) {
    return 0;
  }
  // Partiellement visible - calculer le pourcentage visible
  const visibleHeight = HORIZON_Y - topEdge;
  const totalHeight = radius * 2;
  return Math.max(0, Math.min(1, visibleHeight / totalHeight));
}

/**
 * Met à jour le cycle jour/nuit avec animations réalistes de lever/coucher
 */
export function updateDayNightCycle() {
  if (!startTime || !skyTint) return;
  
  const elapsed = Date.now() - startTime;
  const cyclePosition = elapsed % CYCLE_DURATION;
  
  if (cyclePosition < SUN_DURATION) {
    // Phase du soleil (0-60s)
    isNightTime = false;
    const sunProgress = cyclePosition / SUN_DURATION; // 0 à 1
    
    // Trajectoire circulaire améliorée : lever à gauche → zénith → coucher à droite
    // Utilise une demi-ellipse pour un mouvement plus naturel
    const angle = Math.PI + (sunProgress * Math.PI); // De π à 2π
    const sunX = SKY_CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
    // La trajectoire Y est aplatie pour simuler la perspective
    const sunY = SKY_CENTER_Y + Math.sin(angle) * (ORBIT_RADIUS * 0.7);
    
    // Calculer la visibilité au niveau de l'horizon
    const visibility = calculateHorizonVisibility(sunY, SUN_RADIUS);
    
    // Transition de couleur basée sur la hauteur du soleil
    let sunColor;
    let glowIntensity;
    if (sunProgress < 0.15) {
      // Lever du soleil - orange/rouge
      sunColor = 0xff6633;
      glowIntensity = 0.6;
    } else if (sunProgress > 0.85) {
      // Coucher du soleil - orange/rouge
      sunColor = 0xff4400;
      glowIntensity = 0.7;
    } else {
      // Journée - jaune vif
      sunColor = 0xffdd00;
      glowIntensity = 0.4;
    }
    
    // Couleur du ciel dynamique selon la position du soleil
    let skyColor;
    if (sunProgress < 0.1) {
      // Aube - orange rosé
      const t = sunProgress / 0.1;
      skyColor = lerpColor(0x1a0a16, 0xff9966, t);
    } else if (sunProgress < 0.2) {
      // Transition vers le jour
      const t = (sunProgress - 0.1) / 0.1;
      skyColor = lerpColor(0xff9966, 0x1a2634, t);
    } else if (sunProgress > 0.9) {
      // Crépuscule avancé - orange vers nuit
      const t = (sunProgress - 0.9) / 0.1;
      skyColor = lerpColor(0xff6633, 0x0a0e16, t);
    } else if (sunProgress > 0.8) {
      // Début crépuscule
      const t = (sunProgress - 0.8) / 0.1;
      skyColor = lerpColor(0x1a2634, 0xff6633, t);
    } else {
      // Journée
      skyColor = 0x1a2634;
    }
    
    skyTint.setFillStyle(skyColor, 1);
    
    // Positionner le soleil et ses glows
    sunSprite.setPosition(sunX, Math.min(sunY, HORIZON_Y - 5));
    sunSprite.setFillStyle(sunColor);
    sunSprite.setAlpha(visibility);
    sunSprite.setScale(1 + (1 - visibility) * 0.3); // Effet d'aplatissement à l'horizon
    
    if (sunGlowSprite) {
      sunGlowSprite.setPosition(sunX, Math.min(sunY, HORIZON_Y - 5));
      sunGlowSprite.setFillStyle(sunColor);
      sunGlowSprite.setAlpha(visibility * glowIntensity);
      sunGlowSprite.setScale(1 + (1 - visibility) * 0.5);
    }
    
    if (sunSprite._outerGlow) {
      sunSprite._outerGlow.setPosition(sunX, Math.min(sunY, HORIZON_Y - 5));
      sunSprite._outerGlow.setFillStyle(sunColor);
      sunSprite._outerGlow.setAlpha(visibility * glowIntensity * 0.4);
      sunSprite._outerGlow.setScale(1 + (1 - visibility) * 0.6);
    }
    
    // Cacher la lune
    moonSprite.setAlpha(0);
    if (moonGlowSprite) moonGlowSprite.setAlpha(0);
    if (moonSprite._outerGlow) moonSprite._outerGlow.setAlpha(0);
    
    nightLights.forEach(light => light.sprite.setAlpha(0));
    
  } else {
    // Phase de la lune (60-120s) avec animations réalistes
    isNightTime = true;
    const moonProgress = (cyclePosition - SUN_DURATION) / MOON_DURATION; // 0 à 1
    
    // Trajectoire circulaire de la lune
    const angle = Math.PI + (moonProgress * Math.PI);
    const moonX = SKY_CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
    const moonY = SKY_CENTER_Y + Math.sin(angle) * (ORBIT_RADIUS * 0.7);
    
    // Calculer la visibilité au niveau de l'horizon
    const visibility = calculateHorizonVisibility(moonY, MOON_RADIUS);
    
    // Couleur du ciel nocturne
    let skyColor;
    if (moonProgress < 0.15) {
      // Début de nuit - transition depuis le crépuscule
      const t = moonProgress / 0.15;
      skyColor = lerpColor(0x0a0e16, 0x050810, t);
    } else if (moonProgress > 0.85) {
      // Fin de nuit - vers l'aube
      const t = (moonProgress - 0.85) / 0.15;
      skyColor = lerpColor(0x050810, 0x1a0a16, t);
    } else {
      // Pleine nuit
      skyColor = 0x050810;
    }
    
    skyTint.setFillStyle(skyColor, 1);
    
    // Appliquer la phase lunaire
    updateMoonPhase(moonSprite, moonProgress);
    
    // Positionner la lune et ses glows
    moonSprite.setPosition(moonX, Math.min(moonY, HORIZON_Y - 5));
    moonSprite.setAlpha(moonSprite.alpha * visibility);
    moonSprite.setScale((moonSprite.scaleX || 1) * (1 + (1 - visibility) * 0.2));
    
    if (moonGlowSprite) {
      moonGlowSprite.setPosition(moonX, Math.min(moonY, HORIZON_Y - 5));
      moonGlowSprite.setFillStyle(0xaaccff);
      moonGlowSprite.setAlpha(visibility * 0.3);
      moonGlowSprite.setScale(1 + (1 - visibility) * 0.3);
    }
    
    if (moonSprite._outerGlow) {
      moonSprite._outerGlow.setPosition(moonX, Math.min(moonY, HORIZON_Y - 5));
      moonSprite._outerGlow.setAlpha(visibility * 0.15);
      moonSprite._outerGlow.setScale(1 + (1 - visibility) * 0.4);
    }
    
    // Cacher le soleil
    sunSprite.setAlpha(0);
    if (sunGlowSprite) sunGlowSprite.setAlpha(0);
    if (sunSprite._outerGlow) sunSprite._outerGlow.setAlpha(0);
    
    // Lumières nocturnes scintillantes
    nightLights.forEach(light => {
      light.sprite.setAlpha(0.5 + Math.random() * 0.5);
    });
  }
}

/**
 * Interpolation linéaire entre deux couleurs
 */
function lerpColor(color1, color2, t) {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;
  
  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return (r << 16) | (g << 8) | b;
}

/**
 * Met à jour la phase lunaire avec des styles visuels différents par phase
 */
function updateMoonPhase(moonSprite, progress) {
  // Déterminer la phase actuelle
  let currentPhase = MOON_PHASES[0];
  for (let phase of MOON_PHASES) {
    if (progress >= phase.start && progress < phase.end) {
      currentPhase = phase;
      break;
    }
  }
  
  // Calculer la progression dans cette phase
  const phaseProgress = (progress - currentPhase.start) / (currentPhase.end - currentPhase.start);
  
  // Nouvelle lune : cercle noir quasi invisible
  if (currentPhase.name === 'new') {
    moonSprite.setAlpha(0.05);
    moonSprite.setFillStyle(0x0a0e16);
    moonSprite.setScale(1);
  }
  // Premier croissant : croissant de lune croissante
  else if (currentPhase.name === 'waxing_crescent') {
    moonSprite.setAlpha(0.5 + phaseProgress * 0.2);
    moonSprite.setFillStyle(0xf0f0f0);
    moonSprite.setScale(0.7 + phaseProgress * 0.2);
  }
  // Premier quartier : demi-lune
  else if (currentPhase.name === 'first_quarter') {
    moonSprite.setAlpha(0.85);
    moonSprite.setFillStyle(0xf0f0f0);
    moonSprite.setScale(0.9 + phaseProgress * 0.05);
  }
  // Gibbeuse croissante : presque pleine
  else if (currentPhase.name === 'waxing_gibbous') {
    moonSprite.setAlpha(0.9 + phaseProgress * 0.1);
    moonSprite.setFillStyle(0xffffff);
    moonSprite.setScale(0.95 + phaseProgress * 0.05);
  }
  // Pleine lune : totalement illuminée
  else if (currentPhase.name === 'full') {
    moonSprite.setAlpha(1);
    moonSprite.setFillStyle(0xffffff);
    moonSprite.setScale(1);
  }
  // Gibbeuse décroissante
  else if (currentPhase.name === 'waning_gibbous') {
    moonSprite.setAlpha(0.95 - phaseProgress * 0.1);
    moonSprite.setFillStyle(0xffffff);
    moonSprite.setScale(0.95 + (1 - phaseProgress) * 0.05);
  }
  // Dernier quartier : demi-lune autre côté
  else if (currentPhase.name === 'last_quarter') {
    moonSprite.setAlpha(0.8);
    moonSprite.setFillStyle(0xf0f0f0);
    moonSprite.setScale(0.9 + (1 - phaseProgress) * 0.05);
  }
  // Dernier croissant : fin du cycle
  else if (currentPhase.name === 'waning_crescent') {
    moonSprite.setAlpha(0.4 - phaseProgress * 0.2);
    moonSprite.setFillStyle(0xf0f0f0);
    moonSprite.setScale(0.7 + (1 - phaseProgress) * 0.2);
  }
}

/**
 * Ajoute une lumière nocturne à gérer
 */
export function addNightLight(sprite, type = 'default') {
  nightLights.push({ sprite, type });
}

/**
 * Réinitialise le système jour/nuit
 */
export function resetDayNight() {
  startTime = Date.now();
  isNightTime = false;
  
  if (skyTint) {
    skyTint.setFillStyle(0x1a2634, 1);
  }
  if (sunSprite) {
    sunSprite.setPosition(100, 500); // Bas à gauche
    sunSprite.setAlpha(1);
  }
  if (moonSprite) {
    moonSprite.setAlpha(0);
    // Nettoyer les ombres de phase
    if (moonSprite._shadowCache) {
      if (moonSprite._shadowCache.crescentShadow) moonSprite._shadowCache.crescentShadow.destroy();
      if (moonSprite._shadowCache.halfMoonShadow) moonSprite._shadowCache.halfMoonShadow.destroy();
      if (moonSprite._shadowCache.gibbousShadow) moonSprite._shadowCache.gibbousShadow.destroy();
      moonSprite._shadowCache = null;
    }
  }
  
  nightLights.forEach(light => light.sprite.setAlpha(0));
  clearRain();
}

/**
 * Retourne si c'est la nuit
 */
export function isNight() {
  return isNightTime;
}

/**
 * Retourne le moment de la journée pour les dégradés
 */
export function getTimeOfDay() {
  if (!startTime) return 'day';
  
  const elapsed = Date.now() - startTime;
  const cyclePosition = elapsed % CYCLE_DURATION;
  
  if (cyclePosition < SUN_DURATION) {
    const sunProgress = cyclePosition / SUN_DURATION;
    
    if (sunProgress < 0.15) {
      return 'sunrise';
    } else if (sunProgress > 0.85) {
      return 'sunset';
    }
    return 'day';
  } else {
    const moonProgress = (cyclePosition - SUN_DURATION) / MOON_DURATION;
    
    if (moonProgress < 0.15) {
      return 'moonrise';
    } else if (moonProgress > 0.85) {
      return 'moonset';
    }
    return 'night';
  }
}

/**
 * Retourne la progression du soleil (0-1)
 */
export function getSunProgress() {
  if (!startTime) return 0;
  
  const elapsed = Date.now() - startTime;
  const cyclePosition = elapsed % CYCLE_DURATION;
  
  if (cyclePosition < SUN_DURATION) {
    return cyclePosition / SUN_DURATION;
  }
  return 0;
}

/**
 * Retourne la progression de la lune (0-1)
 */
export function getMoonProgress() {
  if (!startTime) return 0;
  
  const elapsed = Date.now() - startTime;
  const cyclePosition = elapsed % CYCLE_DURATION;
  
  if (cyclePosition >= SUN_DURATION) {
    return (cyclePosition - SUN_DURATION) / MOON_DURATION;
  }
  return 0;
}

/**
 * Système de pluie et nuages aléatoires
 */
let rainActive = false;
let rainDrops = [];
let weatherChance = 0;
let lastWeatherCheck = 0;
let stars = [];
let lightningActive = false;

const WEATHER_CHECK_INTERVAL = 3000;
const RAIN_CHANCE = 0.05; // 5% de chance
const RAIN_DURATION = 60000; // 1 minute (60 secondes)
const CLOUD_DURATION = 60000; // 1 minute (60 secondes)
let rainStartTime = 0;

/**
 * Initialise le système météorologique
 */
export function initWeatherSystem(scene) {
  // Initialisation du système météo
}

/**
 * Met à jour la météo (pluie et nuages)
 */
export function updateWeatherSystem(scene) {
  if (!scene) return;
  
  const now = Date.now();
  
  if (now - lastWeatherCheck > WEATHER_CHECK_INTERVAL) {
    lastWeatherCheck = now;
    
    if (!rainActive && Math.random() < RAIN_CHANCE) {
      rainActive = true;
      rainStartTime = now;
      createRain(scene);
    }
  }
  
  if (rainActive && now - rainStartTime > RAIN_DURATION) {
    rainActive = false;
    clearRain();
  }
  
  if (rainActive) {
    updateRain();
    // Effets d'éclair aléatoire
    if (Math.random() < 0.05 && !lightningActive) {
      createLightning(scene);
    }
  }
}

/**
 * Crée les gouttes de pluie
 */
function createRain(scene) {
  rainDrops = [];
  
  const dropCount = 30 + Math.floor(Math.random() * 20);
  
  for (let i = 0; i < dropCount; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 600 - 100;
    
    const drop = scene.add.line(x, y, 0, 0, 0, 8, 0x00ffff);
    drop.setLineWidth(1);
    drop.setDepth(-85);
    drop.setAlpha(0.6);
    
    rainDrops.push({
      sprite: drop,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 50,
      vy: 200 + Math.random() * 100
    });
  }
  
  createClouds(scene);
}

/**
 * Met à jour la pluie
 */
function updateRain() {
  const deltaTime = 1 / 60;
  
  rainDrops.forEach(drop => {
    drop.y += drop.vy * deltaTime;
    drop.x += drop.vx * deltaTime;
    
    if (drop.y > 650) {
      drop.y = -50;
      drop.x = Math.random() * 800;
    }
    
    if (drop.x < -20) drop.x = 820;
    if (drop.x > 820) drop.x = -20;
    
    drop.sprite.setPosition(drop.x, drop.y);
  });
}

/**
 * Crée des nuages temporaires
 */
function createClouds(scene) {
  const cloudCount = 2 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < cloudCount; i++) {
    const cloudY = 50 + Math.random() * 150;
    const cloudX = Math.random() * 800;
    
    const cloud = scene.add.container(cloudX, cloudY);
    
    const c1 = scene.add.circle(0, 0, 20, 0x00ffff);
    const c2 = scene.add.circle(25, 5, 25, 0x00ffff);
    const c3 = scene.add.circle(50, 0, 20, 0x00ffff);
    
    c1.setAlpha(0.3);
    c2.setAlpha(0.3);
    c3.setAlpha(0.3);
    
    cloud.add([c1, c2, c3]);
    cloud.setDepth(-87);
    
    scene.tweens.add({
      targets: cloud,
      x: cloudX - 150,
      duration: 6000,
      ease: 'Linear',
      repeat: -1,
      yoyo: true
    });
  }
}

/**
 * Arrête la pluie et nettoie
 */
function clearRain() {
  rainDrops.forEach(drop => {
    if (drop.sprite) drop.sprite.destroy();
  });
  rainDrops = [];
}

/**
 * Crée un éclair lumineux pendant l'orage
 */
function createLightning(scene) {
  lightningActive = true;
  
  // Flash blanc
  const flash = scene.add.rectangle(400, 300, 800, 600, 0xffffff);
  flash.setDepth(100);
  flash.setAlpha(0.4);
  
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 200,
    onComplete: () => {
      flash.destroy();
      lightningActive = false;
    }
  });
  
  // Bruit de tonnerre optionnel (visuel seulement)
  const bolt = scene.add.line(
    Math.random() * 800,
    100,
    0, 0,
    Math.random() * 100 - 50, 400,
    0x00ffff
  );
  bolt.setLineWidth(3);
  bolt.setDepth(99);
  bolt.setAlpha(0.8);
  
  scene.tweens.add({
    targets: bolt,
    alpha: 0,
    duration: 250,
    onComplete: () => bolt.destroy()
  });
}

/**
 * Ajoute des étoiles scintillantes la nuit
 */
export function addNightStars(scene) {
  if (stars.length > 0) return; // Éviter les doublons
  
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 300 + 50; // Seulement en haut du ciel
    
    const star = scene.add.circle(x, y, 1.5, 0xffffff);
    star.setDepth(-95);
    star.setAlpha(Math.random() * 0.5 + 0.3);
    
    stars.push({
      sprite: star,
      maxAlpha: Math.random() * 0.6 + 0.4,
      minAlpha: Math.random() * 0.2 + 0.1
    });
    
    // Animation de scintillement
    scene.tweens.add({
      targets: star,
      alpha: Math.random() * 0.6 + 0.4,
      duration: 2000 + Math.random() * 2000,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }
}

/**
 * Retire les étoiles
 */
export function removeNightStars() {
  stars.forEach(star => {
    if (star.sprite) star.sprite.destroy();
  });
  stars = [];
}

/**
 * Ajoute un halo/aura autour du soleil
 */
export function addSunGlow(scene, sunSprite) {
  // Créer des anneaux de glow
  for (let i = 1; i <= 3; i++) {
    const glow = scene.add.circle(sunSprite.x, sunSprite.y, 40 + i * 15, undefined);
    glow.setStrokeStyle(2, 0xffdd00, 0.1 / i);
    glow.setDepth(-91);
    
    scene.tweens.add({
      targets: glow,
      radius: 80 + i * 15,
      duration: 1500,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }
}

/**
 * Crée un reflet de pluie au sol
 */
function createRainReflection(scene) {
  const reflection = scene.add.rectangle(400, 550, 800, 50, 0x00ffff);
  reflection.setDepth(-84);
  reflection.setAlpha(0.15);
  
  scene.tweens.add({
    targets: reflection,
    alpha: 0.05,
    duration: 2000,
    repeat: -1,
    yoyo: true
  });
}
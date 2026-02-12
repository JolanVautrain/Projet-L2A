/**
 * Gestion des arrière-plans pixel cyberpunk améliorés
 */

let backgroundLayers = [];
let buildingContainers = [];
let buildingScrollX = 0; // type: ignore
let starsLayer = null;
let shootingStars = [];
let comets = [];
let mountainsLayer = null;
let skyGradient = null;

/**
 * Crée le système d'arrière-plan avec thème pixel cyberpunk amélioré
 */
export function createBackgroundSystem(scene) {
  backgroundLayers = [];
  buildingContainers = [];
  shootingStars = [];
  comets = [];
  
  // Fond dégradé cyberpunk (sera géré par le cycle jour/nuit)
  const background = scene.add.rectangle(400, 300, 800, 600, 0x0a0e16);
  background.setDepth(-100);
  
  // Créer le dégradé du ciel (calque séparé pour les transitions)
  skyGradient = createSkyGradient(scene);
  
  // Créer une couche d'étoiles (visible la nuit)
  starsLayer = createStarsLayer(scene);
  
  // Grille de scanlines pixelisées améliorées
  const scanlines = scene.add.graphics();
  scanlines.lineStyle(1, 0x00ffff, 0.08);
  for (let y = 0; y < 600; y += 4) {
    scanlines.beginPath();
    scanlines.moveTo(0, y);
    scanlines.lineTo(800, y);
    scanlines.strokePath();
  }
  scanlines.setDepth(-97);
  
  // Calque 1: Montagnes lointaines (AVANT les autres calques)
  mountainsLayer = createMountainsLayer(scene);
  backgroundLayers.push({ graphics: mountainsLayer, speed: 0.03, type: 'mountains' });
  
  // Calque 2: Horizon avec lueur
  const horizonLayer = createHorizonLayer(scene);
  backgroundLayers.push({ graphics: horizonLayer, speed: 0.05, type: 'horizon' });
  
  // Calque 3: Structures éloignées pixelisées
  const distantStructures = createDistantPixelLayer(scene);
  backgroundLayers.push({ graphics: distantStructures, speed: 0.15, type: 'distant' });
  
  // Calque 4: Bâtiments pixelisés (avec défilement continu)
  createContinuousBuildingsLayer(scene);
  
  // Calque 5: Structures au premier plan
  const structures = createPixelStructuresLayer(scene);
  backgroundLayers.push({ graphics: structures, speed: 0.8, type: 'structures' });
  
  // Calque 6: Sol avec détails
  createGroundDetails(scene);
}

/**
 * Crée le dégradé du ciel pour les transitions jour/nuit
 */
function createSkyGradient(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-99);
  
  // Créer plusieurs bandes pour simuler un dégradé
  const bands = [];
  const bandCount = 12;
  const bandHeight = 50;
  
  for (let i = 0; i < bandCount; i++) {
    const band = scene.add.rectangle(400, i * bandHeight + bandHeight/2, 800, bandHeight + 2, 0x1a2634);
    band.setAlpha(1);
    bands.push(band);
    container.add(band);
  }
  
  container._bands = bands;
  return container;
}

/**
 * Met à jour le dégradé du ciel selon l'heure
 */
export function updateSkyGradient(timeOfDay, sunProgress, moonProgress) {
  if (!skyGradient || !skyGradient._bands) return;
  
  const bands = skyGradient._bands;
  
  if (timeOfDay === 'day') {
    // Journée - ciel bleu cyberpunk
    bands.forEach((band, i) => {
      const t = i / bands.length;
      // Dégradé du haut (plus clair) vers le bas (plus foncé)
      const color = lerpColor(0x2a4a6a, 0x1a2634, t);
      band.setFillStyle(color, 1);
    });
  } else if (timeOfDay === 'sunrise') {
    // Lever du soleil - dégradé orange/rose/bleu
    bands.forEach((band, i) => {
      const t = i / bands.length;
      let color;
      if (t < 0.3) {
        color = lerpColor(0x4a3a6a, 0xff9966, t / 0.3);
      } else if (t < 0.6) {
        color = lerpColor(0xff9966, 0xff6633, (t - 0.3) / 0.3);
      } else {
        color = lerpColor(0xff6633, 0x1a0a16, (t - 0.6) / 0.4);
      }
      band.setFillStyle(color, 1);
    });
  } else if (timeOfDay === 'sunset') {
    // Coucher du soleil - dégradé orange/rouge/violet
    bands.forEach((band, i) => {
      const t = i / bands.length;
      let color;
      if (t < 0.25) {
        color = lerpColor(0x1a2634, 0xff6633, t / 0.25);
      } else if (t < 0.5) {
        color = lerpColor(0xff6633, 0xff4400, (t - 0.25) / 0.25);
      } else if (t < 0.75) {
        color = lerpColor(0xff4400, 0x6a2a4a, (t - 0.5) / 0.25);
      } else {
        color = lerpColor(0x6a2a4a, 0x0a0616, (t - 0.75) / 0.25);
      }
      band.setFillStyle(color, 1);
    });
  } else if (timeOfDay === 'night') {
    // Nuit - ciel sombre avec légère teinte bleue
    bands.forEach((band, i) => {
      const t = i / bands.length;
      const color = lerpColor(0x0a1020, 0x050810, t);
      band.setFillStyle(color, 1);
    });
  } else if (timeOfDay === 'moonrise') {
    // Lever de lune - transition nuit
    bands.forEach((band, i) => {
      const t = i / bands.length;
      const color = lerpColor(0x0a0616, 0x050810, t);
      band.setFillStyle(color, 1);
    });
  } else if (timeOfDay === 'moonset') {
    // Coucher de lune - vers l'aube
    bands.forEach((band, i) => {
      const t = i / bands.length;
      let color;
      if (t < 0.5) {
        color = lerpColor(0x1a1030, 0x2a1a40, t / 0.5);
      } else {
        color = lerpColor(0x2a1a40, 0x0a0616, (t - 0.5) / 0.5);
      }
      band.setFillStyle(color, 1);
    });
  }
}

/**
 * Crée les montagnes en arrière-plan (plus visible)
 */
function createMountainsLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-88); // Entre le ciel et les autres éléments
  
  const graphics = scene.add.graphics();
  
  // Montagnes lointaines - couche 1 (la plus éloignée)
  graphics.fillStyle(0x0a1525, 0.9);
  graphics.beginPath();
  graphics.moveTo(-100, 550);
  graphics.lineTo(50, 420);
  graphics.lineTo(150, 480);
  graphics.lineTo(250, 380);
  graphics.lineTo(350, 450);
  graphics.lineTo(450, 350);
  graphics.lineTo(550, 420);
  graphics.lineTo(650, 360);
  graphics.lineTo(750, 400);
  graphics.lineTo(850, 340);
  graphics.lineTo(950, 420);
  graphics.lineTo(950, 550);
  graphics.closePath();
  graphics.fill();
  
  // Montagnes plus proches - couche 2
  graphics.fillStyle(0x0f1a2a, 0.95);
  graphics.beginPath();
  graphics.moveTo(-50, 550);
  graphics.lineTo(80, 450);
  graphics.lineTo(180, 500);
  graphics.lineTo(280, 420);
  graphics.lineTo(380, 480);
  graphics.lineTo(480, 400);
  graphics.lineTo(580, 460);
  graphics.lineTo(680, 390);
  graphics.lineTo(780, 450);
  graphics.lineTo(880, 400);
  graphics.lineTo(900, 550);
  graphics.closePath();
  graphics.fill();
  
  // Contour lumineux sur les crêtes
  graphics.lineStyle(1, 0x2a4a6a, 0.4);
  graphics.beginPath();
  graphics.moveTo(-50, 550);
  graphics.lineTo(80, 450);
  graphics.lineTo(180, 500);
  graphics.lineTo(280, 420);
  graphics.lineTo(380, 480);
  graphics.lineTo(480, 400);
  graphics.lineTo(580, 460);
  graphics.lineTo(680, 390);
  graphics.lineTo(780, 450);
  graphics.lineTo(880, 400);
  graphics.strokePath();
  
  container.add(graphics);
  
  return container;
}

/**
 * Crée une couche d'étoiles améliorée pour la nuit avec étoiles filantes
 */
function createStarsLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-94);
  container.setAlpha(0); // Invisible au départ (jour)
  
  // Créer des étoiles avec différentes tailles et luminosités
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 350; // Seulement dans la partie haute du ciel
    const size = Math.random() < 0.7 ? 1 : (Math.random() < 0.9 ? 2 : 3);
    const alpha = 0.3 + Math.random() * 0.7;
    
    // Couleurs variées pour les étoiles
    const colors = [0xffffff, 0xffffcc, 0xccccff, 0xffcccc, 0xccffff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const star = scene.add.circle(x, y, size, color);
    star.setAlpha(alpha);
    star._baseAlpha = alpha;
    star._twinkleSpeed = 0.5 + Math.random() * 3;
    star._twinklePhase = Math.random() * Math.PI * 2;
    container.add(star);
  }
  
  // Stocker la scène pour créer des étoiles filantes
  container._scene = scene;
  
  return container;
}

/**
 * Crée l'horizon avec lueur (sans les montagnes qui sont dans un calque séparé)
 */
function createHorizonLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-84);
  
  const graphics = scene.add.graphics();
  
  // Ligne de lueur à l'horizon
  graphics.lineStyle(3, 0xff00ff, 0.2);
  graphics.beginPath();
  graphics.moveTo(0, 520);
  graphics.lineTo(800, 520);
  graphics.strokePath();
  
  // Seconde ligne de lueur plus subtile
  graphics.lineStyle(2, 0x00ffff, 0.15);
  graphics.beginPath();
  graphics.moveTo(0, 525);
  graphics.lineTo(800, 525);
  graphics.strokePath();
  
  container.add(graphics);
  
  return container;
}

/**
 * Crée des structures éloignées pixelisées améliorées
 */
function createDistantPixelLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-80);
  
  for (let i = 0; i < 8; i++) {
    const x = i * 150;
    
    // Bâtiment pixelisé en cyan avec plus de détails
    const graphics = scene.add.graphics();
    const height = 120 + Math.random() * 80;
    const width = 50 + Math.random() * 30;
    const baseY = 450 - height;
    
    // Corps principal avec dégradé simulé
    graphics.fillStyle(0x1a2634, 1);
    graphics.fillRect(x + 20, baseY, width, height);
    
    // Dégradé vertical simulé (lignes plus claires vers le haut)
    for (let j = 0; j < height; j += 8) {
      const brightness = 0.3 - (j / height) * 0.2;
      graphics.fillStyle(0x00ffff, brightness);
      graphics.fillRect(x + 20, baseY + j, width, 2);
    }
    
    // Contour néon cyan
    graphics.lineStyle(1, 0x00ffff, 0.8);
    graphics.strokeRect(x + 20, baseY, width, height);
    
    // Fenêtres pixelisées avec variation de luminosité
    graphics.fillStyle(0x00ffff, 0.5);
    const windowsPerRow = Math.floor(width / 12);
    const windowRows = Math.floor(height / 18);
    
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowsPerRow; col++) {
        const isLit = Math.random() > 0.3;
        if (isLit) {
          const brightness = 0.3 + Math.random() * 0.5;
          graphics.fillStyle(0x00ffff, brightness);
          graphics.fillRect(x + 24 + col * 12, baseY + 8 + row * 18, 6, 8);
        }
      }
    }
    
    // Antenne ou détail sur le toit
    if (Math.random() > 0.5) {
      graphics.lineStyle(1, 0xff00ff, 0.6);
      const antennaHeight = 15 + Math.random() * 20;
      graphics.beginPath();
      graphics.moveTo(x + 20 + width / 2, baseY);
      graphics.lineTo(x + 20 + width / 2, baseY - antennaHeight);
      graphics.strokePath();
      
      // Point lumineux sur l'antenne
      graphics.fillStyle(0xff0000, 0.8 + Math.random() * 0.2);
      graphics.fillCircle(x + 20 + width / 2, baseY - antennaHeight, 2);
    }
    
    container.add(graphics);
  }
  
  return container;
}

/**
 * Crée des bâtiments pixelisés avec style cyberpunk amélioré (continus)
 */
function createContinuousBuildingsLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-10); // Augmenté pour être AU-DESSUS du sol
  buildingContainers = [];
  
  // Créer plusieurs blocs de bâtiments pour un défilement continu
  for (let block = 0; block < 3; block++) {
    const blockX = block * 800;
    createBuildingBlock(scene, container, blockX);
  }
  
  backgroundLayers.push({ graphics: container, speed: 0.5, type: 'buildings' });
}

/**
 * Crée un bloc de bâtiments avec grande variété
 */
function createBuildingBlock(scene, container, blockOffsetX) {
  // Plus de bâtiments (15 par bloc) pour une ville plus dense
  for (let i = 0; i < 15; i++) {
    const x = blockOffsetX + i * 53; // Plus dense
    
    // Types de bâtiments variés
    const buildingType = Math.floor(Math.random() * 4);
    const height = 250 + Math.random() * 250; // BEAUCOUP PLUS HAUT (150-400 au lieu de 60-240)
    
    const graphics = scene.add.graphics();
    const baseY = 568; // Position du sol
    const topY = baseY - height;
    
    if (buildingType === 0) {
      // Bâtiment style "gratte-ciel" - haute tour
      createSkyscraper(graphics, 0, topY, 50, height);
    } else if (buildingType === 1) {
      // Bâtiment style "résidentiel" - petit immeuble
      createResidentialBuilding(graphics, 0, topY, 50, height);
    } else if (buildingType === 2) {
      // Bâtiment style "usine" - structure industrielle
      createIndustrialBuilding(graphics, 0, topY, 50, height);
    } else {
      // Bâtiment style "commercial" - façade commerciale
      createCommercialBuilding(graphics, 0, topY, 50, height);
    }
    
    graphics.setPosition(x, 0);
    container.add(graphics);
    buildingContainers.push(graphics);
  }
}

/**
 * Crée un gratte-ciel amélioré avec plus de détails
 */
function createSkyscraper(graphics, x, y, width, height) {
  // Corps principal - bleu-gris foncé avec dégradé
  graphics.fillStyle(0x0f1a2e, 1);
  graphics.fillRect(x, y, width, height);
  
  // Dégradé vertical simulé
  for (let i = 0; i < height; i += 10) {
    const t = i / height;
    const alpha = 0.1 - t * 0.05;
    graphics.fillStyle(0x3a5a8e, alpha);
    graphics.fillRect(x, y + i, width, 5);
  }
  
  // Contour magenta néon avec glow simulé
  graphics.lineStyle(3, 0xff00ff, 0.3);
  graphics.strokeRect(x - 1, y - 1, width + 2, height + 2);
  graphics.lineStyle(2, 0xff00ff, 0.9);
  graphics.strokeRect(x, y, width, height);
  
  // Bandes horizontales décoratives
  graphics.fillStyle(0x1a3a52, 1);
  graphics.fillRect(x + 2, y + 5, width - 4, 4);
  graphics.fillRect(x + 2, y + height / 3, width - 4, 3);
  graphics.fillRect(x + 2, y + 2 * height / 3, width - 4, 3);
  
  // Fenêtres nombreuses avec animation possible
  const windowsPerRow = Math.floor(width / 12);
  const windowRows = Math.floor((height - 20) / 15);
  
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowsPerRow; col++) {
      const wx = x + 4 + col * 12;
      const wy = y + 10 + row * 15;
      
      // Variation de couleur des fenêtres
      const isLit = Math.random() > 0.2;
      if (isLit) {
        const colors = [0x00ffff, 0xffff00, 0xffffff, 0xff9900];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const brightness = 0.4 + Math.random() * 0.5;
        graphics.fillStyle(color, brightness);
        graphics.fillRect(wx, wy, 6, 6);
        
        // Reflet
        graphics.fillStyle(0xffffff, 0.3);
        graphics.fillRect(wx + 1, wy + 1, 2, 2);
      } else {
        graphics.fillStyle(0x0a0e16, 0.8);
        graphics.fillRect(wx, wy, 6, 6);
      }
    }
  }
  
  // Toit avec antennes et détails
  createRoofDetails(graphics, x, y, width);
}

/**
 * Crée les détails du toit (antennes, panneaux, etc.)
 */
function createRoofDetails(graphics, x, y, width) {
  // Antenne principale
  graphics.lineStyle(2, 0x666666, 0.9);
  graphics.beginPath();
  graphics.moveTo(x + width / 2, y);
  graphics.lineTo(x + width / 2, y - 25);
  graphics.strokePath();
  
  // Point lumineux clignotant (rouge)
  graphics.fillStyle(0xff0000, 0.9);
  graphics.fillCircle(x + width / 2, y - 25, 3);
  
  // Antenne secondaire
  if (width > 40) {
    graphics.lineStyle(1, 0x888888, 0.7);
    graphics.beginPath();
    graphics.moveTo(x + width / 4, y);
    graphics.lineTo(x + width / 4, y - 12);
    graphics.strokePath();
  }
  
  // Panneau solaire ou climatiseur
  if (Math.random() > 0.5) {
    graphics.fillStyle(0x2a2a4a, 0.8);
    graphics.fillRect(x + width - 15, y - 8, 12, 6);
    graphics.lineStyle(1, 0x00ffff, 0.5);
    graphics.strokeRect(x + width - 15, y - 8, 12, 6);
  }
}

/**
 * Crée un immeuble résidentiel amélioré
 */
function createResidentialBuilding(graphics, x, y, width, height) {
  // Corps principal - rouge-marron avec texture
  graphics.fillStyle(0x2d1f1f, 1);
  graphics.fillRect(x, y, width, height);
  
  // Texture de briques simulée
  graphics.lineStyle(1, 0x1a1212, 0.3);
  for (let row = 0; row < height; row += 8) {
    const offset = (row / 8) % 2 === 0 ? 0 : 8;
    for (let col = 0; col < width; col += 16) {
      graphics.strokeRect(x + col + offset, y + row, 16, 8);
    }
  }
  
  // Contour cyan néon
  graphics.lineStyle(2, 0x00ffff, 0.8);
  graphics.strokeRect(x, y, width, height);
  
  // Fenêtres côte à côte avec variation
  const windowsPerRow = 3;
  const windowRows = Math.floor((height - 30) / 22);
  
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowsPerRow; col++) {
      const wx = x + 6 + col * 14;
      const wy = y + 12 + row * 22;
      
      // Cadre de fenêtre
      graphics.fillStyle(0x0a0e16, 1);
      graphics.fillRect(wx, wy, 10, 12);
      
      // Cadre jaune/orange
      const frameColor = Math.random() > 0.5 ? 0xffff00 : 0xff9900;
      graphics.lineStyle(1, frameColor, 0.7);
      graphics.strokeRect(wx, wy, 10, 12);
      
      // Lumière intérieure avec couleur variable
      if (Math.random() > 0.35) {
        const lightColors = [0xffffcc, 0xffeeaa, 0xffffff, 0xccffff];
        const lightColor = lightColors[Math.floor(Math.random() * lightColors.length)];
        graphics.fillStyle(lightColor, 0.8);
        graphics.fillRect(wx + 2, wy + 2, 6, 8);
      }
    }
  }
  
  // Porte en bas avec détails
  graphics.fillStyle(0x4a2a1a, 1);
  graphics.fillRect(x + width/2 - 8, y + height - 18, 16, 18);
  graphics.lineStyle(1, 0xffff00, 0.6);
  graphics.strokeRect(x + width/2 - 8, y + height - 18, 16, 18);
  
  // Poignée de porte
  graphics.fillStyle(0xffcc00, 0.8);
  graphics.fillCircle(x + width/2 + 4, y + height - 9, 2);
}

/**
 * Crée un bâtiment industriel amélioré
 */
function createIndustrialBuilding(graphics, x, y, width, height) {
  // Corps principal - gris métallique avec texture
  graphics.fillStyle(0x3a3a4a, 1);
  graphics.fillRect(x, y, width, height);
  
  // Texture métallique simulée
  for (let i = 0; i < height; i += 12) {
    graphics.fillStyle(0x4a4a5a, 0.3);
    graphics.fillRect(x, y + i, width, 2);
  }
  
  // Contour vert néon avec glow
  graphics.lineStyle(3, 0x00ff00, 0.3);
  graphics.strokeRect(x - 1, y - 1, width + 2, height + 2);
  graphics.lineStyle(2, 0x00ff00, 0.9);
  graphics.strokeRect(x, y, width, height);
  
  // Panneau de contrôle sur le côté
  graphics.fillStyle(0x1a1a2a, 1);
  graphics.fillRect(x + 5, y + height/3, 15, 25);
  graphics.lineStyle(1, 0x00ff00, 0.7);
  graphics.strokeRect(x + 5, y + height/3, 15, 25);
  
  // LEDs sur le panneau
  for (let i = 0; i < 3; i++) {
    const ledColor = Math.random() > 0.5 ? 0x00ff00 : 0xff0000;
    graphics.fillStyle(ledColor, 0.9);
    graphics.fillCircle(x + 12, y + height/3 + 6 + i * 7, 2);
  }
  
  // Petites fenêtres de contrôle
  const windowCount = Math.floor(height / 50);
  for (let i = 0; i < windowCount; i++) {
    const wy = y + 20 + i * 45;
    graphics.fillStyle(0x0a0e16, 1);
    graphics.fillRect(x + width - 14, wy, 10, 10);
    graphics.lineStyle(1, 0x00ff00, 0.8);
    graphics.strokeRect(x + width - 14, wy, 10, 10);
    
    // Lueur verte
    graphics.fillStyle(0x00ff00, 0.4);
    graphics.fillRect(x + width - 12, wy + 2, 6, 6);
  }
  
  // Cheminées / tuyaux améliorés
  graphics.fillStyle(0x555555, 1);
  graphics.fillRect(x + width / 3 - 4, y - 30, 8, 30);
  graphics.fillRect(x + 2 * width / 3 - 3, y - 20, 6, 20);
  
  // Fumée simulée (cercles)
  graphics.fillStyle(0x666666, 0.3);
  graphics.fillCircle(x + width / 3, y - 35, 6);
  graphics.fillCircle(x + width / 3 - 3, y - 42, 4);
  
  // Grille métallique ventilation
  graphics.fillStyle(0x2a2a3a, 0.9);
  graphics.fillRect(x + width/2 - 10, y + height - 35, 20, 20);
  for (let i = 0; i < 4; i++) {
    graphics.lineStyle(1, 0x1a1a2a, 0.8);
    graphics.beginPath();
    graphics.moveTo(x + width/2 - 10, y + height - 35 + i * 5);
    graphics.lineTo(x + width/2 + 10, y + height - 35 + i * 5);
    graphics.strokePath();
  }
}

/**
 * Crée un bâtiment commercial amélioré
 */
function createCommercialBuilding(graphics, x, y, width, height) {
  // Corps principal - bleu moderne
  graphics.fillStyle(0x1a3a52, 1);
  graphics.fillRect(x, y, width, height);
  
  // Effet de verre réfléchissant
  for (let i = 0; i < height; i += 15) {
    graphics.fillStyle(0x2a5a72, 0.3);
    graphics.fillRect(x, y + i, width, 3);
  }
  
  // Contour magenta-rose néon avec glow
  graphics.lineStyle(3, 0xff1493, 0.3);
  graphics.strokeRect(x - 1, y - 1, width + 2, height + 2);
  graphics.lineStyle(2, 0xff1493, 0.9);
  graphics.strokeRect(x, y, width, height);
  
  // Enseigne néon en haut
  graphics.fillStyle(0x0a0e16, 0.9);
  graphics.fillRect(x + 3, y + 5, width - 6, 15);
  
  // Texte de l'enseigne simulé (lignes)
  graphics.fillStyle(0xff00ff, 0.8);
  graphics.fillRect(x + 8, y + 9, width - 16, 3);
  graphics.fillRect(x + 12, y + 14, width - 24, 2);
  
  // Grandes vitres commerciales avec reflets
  const storeCount = Math.floor((height - 40) / 50);
  const storeHeight = 35;
  
  for (let i = 0; i < storeCount; i++) {
    const gy = y + 28 + i * 48;
    
    // Vitrine principale
    graphics.fillStyle(0x0a1a2a, 0.9);
    graphics.fillRect(x + 3, gy, width - 6, storeHeight);
    
    // Reflet diagonal
    graphics.fillStyle(0x00ffff, 0.15);
    graphics.beginPath();
    graphics.moveTo(x + 3, gy);
    graphics.lineTo(x + 3 + storeHeight / 2, gy);
    graphics.lineTo(x + 3, gy + storeHeight);
    graphics.closePath();
    graphics.fill();
    
    // Cadre vitrine
    graphics.lineStyle(2, 0x00ffff, 0.8);
    graphics.strokeRect(x + 3, gy, width - 6, storeHeight);
    
    // Divisions verticales
    graphics.lineStyle(1, 0x00ffff, 0.5);
    graphics.beginPath();
    graphics.moveTo(x + width / 2, gy);
    graphics.lineTo(x + width / 2, gy + storeHeight);
    graphics.strokePath();
    
    // Contenu de la vitrine (silhouettes)
    if (Math.random() > 0.3) {
      graphics.fillStyle(0xffff00, 0.3);
      graphics.fillRect(x + 8, gy + storeHeight - 15, 8, 12);
      graphics.fillRect(x + width - 18, gy + storeHeight - 12, 10, 9);
    }
  }
  
  // Porte d'entrée
  graphics.fillStyle(0x0a0e16, 1);
  graphics.fillRect(x + width/2 - 10, y + height - 25, 20, 25);
  graphics.lineStyle(2, 0xff1493, 0.8);
  graphics.strokeRect(x + width/2 - 10, y + height - 25, 20, 25);
  
  // Poignée de porte
  graphics.fillStyle(0xffcc00, 0.9);
  graphics.fillRect(x + width/2 + 5, y + height - 15, 3, 8);
}

/**
 * Crée des structures métalliques pixelisées améliorées
 */
function createPixelStructuresLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-60);
  
  for (let i = 0; i < 12; i++) {
    const x = i * 100;
    
    const graphics = scene.add.graphics();
    const structureType = Math.floor(Math.random() * 3);
    
    if (structureType === 0) {
      // Panneau publicitaire néon
      graphics.fillStyle(0x1a1a2a, 0.95);
      graphics.fillRect(x + 15, 480, 70, 45);
      
      // Cadre néon
      graphics.lineStyle(2, 0xff00ff, 0.9);
      graphics.strokeRect(x + 15, 480, 70, 45);
      
      // "Texte" publicitaire simulé
      graphics.fillStyle(0x00ffff, 0.8);
      graphics.fillRect(x + 22, 488, 56, 6);
      graphics.fillStyle(0xffff00, 0.7);
      graphics.fillRect(x + 25, 498, 50, 4);
      graphics.fillStyle(0xff00ff, 0.6);
      graphics.fillRect(x + 30, 508, 40, 10);
      
      // Poteau
      graphics.fillStyle(0x444444, 1);
      graphics.fillRect(x + 46, 525, 8, 35);
      
    } else if (structureType === 1) {
      // Structure métallique / échafaudage
      graphics.fillStyle(0x333333, 0.9);
      graphics.fillRect(x + 20, 490, 10, 70);
      graphics.fillRect(x + 55, 490, 10, 70);
      graphics.fillRect(x + 20, 490, 45, 6);
      graphics.fillRect(x + 20, 520, 45, 6);
      graphics.fillRect(x + 20, 554, 45, 6);
      
      // Barre de néon
      graphics.fillStyle(0x00ff00, 0.8);
      graphics.fillRect(x + 30, 535, 25, 3);
      
      // Contour cyan
      graphics.lineStyle(1, 0x00ffff, 0.6);
      graphics.strokeRect(x + 20, 490, 45, 70);
      
    } else {
      // Lampadaire cyberpunk
      graphics.fillStyle(0x2a2a3a, 1);
      graphics.fillRect(x + 38, 510, 6, 50);
      
      // Bras du lampadaire
      graphics.fillStyle(0x3a3a4a, 1);
      graphics.fillRect(x + 30, 505, 30, 6);
      
      // Lumière
      graphics.fillStyle(0xffff00, 0.9);
      graphics.fillCircle(x + 32, 512, 5);
      graphics.fillCircle(x + 58, 512, 5);
      
      // Halo de lumière
      graphics.fillStyle(0xffff00, 0.15);
      graphics.fillCircle(x + 32, 530, 20);
      graphics.fillCircle(x + 58, 530, 20);
    }
    
    container.add(graphics);
  }
  
  return container;
}

/**
 * Crée les détails du sol
 */
function createGroundDetails(scene) {
  const graphics = scene.add.graphics();
  graphics.setDepth(-5);
  
  // Ligne de sol néon
  graphics.lineStyle(2, 0x00ffff, 0.4);
  graphics.beginPath();
  graphics.moveTo(0, 558);
  graphics.lineTo(800, 558);
  graphics.strokePath();
  
  // Seconde ligne magenta
  graphics.lineStyle(1, 0xff00ff, 0.3);
  graphics.beginPath();
  graphics.moveTo(0, 562);
  graphics.lineTo(800, 562);
  graphics.strokePath();
}

/**
 * Fait défiler les calques d'arrière-plan avec effet parallax continu et lisse
 */
export function updateBackgroundParallax() {
  backgroundLayers.forEach(layer => {
    if (layer.graphics?.x !== undefined) {
      layer.graphics.x -= layer.speed;
      
      // Créer un effet de défilement infini
      if (layer.type === 'buildings') {
        // Pour les bâtiments, recréer le cycle tous les 2400 pixels
        if (layer.graphics.x <= -2400) {
          layer.graphics.x += 2400;
        }
      } else if (layer.type === 'mountains') {
        // Montagnes - cycle plus long
        if (layer.graphics.x <= -200) {
          layer.graphics.x += 200;
        }
      } else if (layer.graphics.x <= -1600) {
        // Pour les autres calques
        layer.graphics.x += 1600;
      }
    }
  });
  
  // Faire scintiller les étoiles
  if (starsLayer && starsLayer.alpha > 0) {
    const time = Date.now() / 1000;
    starsLayer.list.forEach(star => {
      if (star._baseAlpha && star._twinkleSpeed) {
        const twinkle = Math.sin(time * star._twinkleSpeed + (star._twinklePhase || 0)) * 0.4;
        star.setAlpha(Math.max(0.1, Math.min(1, star._baseAlpha + twinkle)));
      }
    });
  }
  
  // Mettre à jour les étoiles filantes
  updateShootingStars();
  
  // Mettre à jour les comètes
  updateComets();
}

/**
 * Crée une étoile filante
 */
export function createShootingStar(scene) {
  if (!scene || shootingStars.length >= 3) return; // Max 3 étoiles filantes à la fois
  
  const startX = Math.random() * 400 + 100;
  const startY = Math.random() * 150 + 20;
  const angle = Math.PI / 4 + Math.random() * Math.PI / 6; // Angle diagonal
  const speed = 8 + Math.random() * 6;
  const length = 30 + Math.random() * 40;
  
  const graphics = scene.add.graphics();
  graphics.setDepth(-93);
  
  // Traînée de l'étoile filante
  const gradient = [
    { offset: 0, color: 0xffffff, alpha: 1 },
    { offset: 0.3, color: 0xffffcc, alpha: 0.8 },
    { offset: 0.7, color: 0xffff99, alpha: 0.4 },
    { offset: 1, color: 0xffff00, alpha: 0 }
  ];
  
  graphics.lineStyle(2, 0xffffff, 1);
  graphics.beginPath();
  graphics.moveTo(0, 0);
  graphics.lineTo(-length, 0);
  graphics.strokePath();
  
  graphics.lineStyle(1, 0xffffcc, 0.5);
  graphics.beginPath();
  graphics.moveTo(0, 0);
  graphics.lineTo(-length * 1.5, 0);
  graphics.strokePath();
  
  graphics.setPosition(startX, startY);
  graphics.setRotation(angle);
  
  shootingStars.push({
    graphics,
    x: startX,
    y: startY,
    speed,
    angle,
    life: 1
  });
}

/**
 * Met à jour les étoiles filantes
 */
function updateShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    
    // Déplacer l'étoile
    star.x += Math.cos(star.angle) * star.speed;
    star.y += Math.sin(star.angle) * star.speed;
    star.life -= 0.02;
    
    star.graphics.setPosition(star.x, star.y);
    star.graphics.setAlpha(star.life);
    
    // Supprimer si hors écran ou vie épuisée
    if (star.x > 900 || star.y > 600 || star.life <= 0) {
      star.graphics.destroy();
      shootingStars.splice(i, 1);
    }
  }
}

/**
 * Crée une comète
 */
export function createComet(scene) {
  if (!scene || comets.length >= 1) return; // Max 1 comète à la fois
  
  const startX = -50;
  const startY = Math.random() * 100 + 50;
  const speed = 1.5 + Math.random();
  
  const container = scene.add.container(startX, startY);
  container.setDepth(-92);
  
  // Corps de la comète
  const body = scene.add.circle(0, 0, 6, 0x88ccff);
  body.setAlpha(0.9);
  
  // Noyau brillant
  const core = scene.add.circle(0, 0, 3, 0xffffff);
  
  // Queue de la comète
  const tail = scene.add.graphics();
  tail.fillStyle(0x6699cc, 0.3);
  tail.beginPath();
  tail.moveTo(-5, 0);
  tail.lineTo(-80, -15);
  tail.lineTo(-100, 0);
  tail.lineTo(-80, 15);
  tail.closePath();
  tail.fill();
  
  tail.fillStyle(0x88bbee, 0.2);
  tail.beginPath();
  tail.moveTo(-3, 0);
  tail.lineTo(-120, -8);
  tail.lineTo(-150, 0);
  tail.lineTo(-120, 8);
  tail.closePath();
  tail.fill();
  
  container.add(tail);
  container.add(body);
  container.add(core);
  
  comets.push({
    container,
    x: startX,
    y: startY,
    speed,
    wobble: 0
  });
}

/**
 * Met à jour les comètes
 */
function updateComets() {
  for (let i = comets.length - 1; i >= 0; i--) {
    const comet = comets[i];
    
    // Déplacer la comète
    comet.x += comet.speed;
    comet.wobble += 0.05;
    comet.y += Math.sin(comet.wobble) * 0.3;
    
    comet.container.setPosition(comet.x, comet.y);
    
    // Supprimer si hors écran
    if (comet.x > 900) {
      comet.container.destroy();
      comets.splice(i, 1);
    }
  }
}

/**
 * Met à jour la visibilité des étoiles selon le cycle jour/nuit
 */
export function updateStarsVisibility(isNight, scene) {
  if (starsLayer) {
    // Transition douce de l'opacité des étoiles
    const targetAlpha = isNight ? 1 : 0;
    const currentAlpha = starsLayer.alpha;
    const diff = targetAlpha - currentAlpha;
    
    if (Math.abs(diff) > 0.01) {
      starsLayer.setAlpha(currentAlpha + diff * 0.03);
    } else {
      starsLayer.setAlpha(targetAlpha);
    }
    
    // Créer des étoiles filantes aléatoirement la nuit
    if (isNight && scene && Math.random() < 0.005) { // 0.5% de chance par frame
      createShootingStar(scene);
    }
    
    // Créer des comètes rarement la nuit
    if (isNight && scene && Math.random() < 0.0005) { // 0.05% de chance par frame
      createComet(scene);
    }
  }
}

/**
 * Retourne les calques pour accéder aux lumières
 */
export function getBackgroundLayers() {
  return backgroundLayers;
}

/**
 * Retourne la couche d'étoiles
 */
export function getStarsLayer() {
  return starsLayer;
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

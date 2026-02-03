/**
 * Gestion des arrière-plans pixel cyberpunk améliorés
 */

let backgroundLayers = [];
let buildingContainers = [];
let buildingScrollX = 0;
let starsLayer = null;

/**
 * Crée le système d'arrière-plan avec thème pixel cyberpunk amélioré
 */
export function createBackgroundSystem(scene) {
  backgroundLayers = [];
  buildingContainers = [];
  buildingScrollX = 0;
  
  // Fond dégradé cyberpunk (sera géré par le cycle jour/nuit)
  const background = scene.add.rectangle(400, 300, 800, 600, 0x0a0e16);
  background.setDepth(-100);
  
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
  scanlines.setDepth(-98);
  
  // Calque 1: Horizon et montagnes lointaines
  const horizonLayer = createHorizonLayer(scene);
  backgroundLayers.push({ graphics: horizonLayer, speed: 0.05, type: 'horizon' });
  
  // Calque 2: Structures éloignées pixelisées
  const distantStructures = createDistantPixelLayer(scene);
  backgroundLayers.push({ graphics: distantStructures, speed: 0.15, type: 'distant' });
  
  // Calque 3: Bâtiments pixelisés (avec défilement continu)
  createContinuousBuildingsLayer(scene);
  
  // Calque 4: Structures au premier plan
  const structures = createPixelStructuresLayer(scene);
  backgroundLayers.push({ graphics: structures, speed: 0.8, type: 'structures' });
  
  // Calque 5: Sol avec détails
  createGroundDetails(scene);
}

/**
 * Crée une couche d'étoiles pour la nuit
 */
function createStarsLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-95);
  container.setAlpha(0); // Invisible au départ (jour)
  
  // Créer des étoiles avec différentes tailles et luminosités
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 400; // Seulement dans la partie haute du ciel
    const size = Math.random() < 0.8 ? 1 : 2;
    const alpha = 0.3 + Math.random() * 0.7;
    
    const star = scene.add.circle(x, y, size, 0xffffff);
    star.setAlpha(alpha);
    star._baseAlpha = alpha;
    star._twinkleSpeed = 0.5 + Math.random() * 2;
    container.add(star);
  }
  
  return container;
}

/**
 * Crée l'horizon avec des montagnes/collines lointaines
 */
function createHorizonLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-85);
  
  const graphics = scene.add.graphics();
  
  // Montagnes lointaines - silhouettes sombres
  graphics.fillStyle(0x0f1520, 0.8);
  
  // Montagne 1
  graphics.beginPath();
  graphics.moveTo(0, 500);
  graphics.lineTo(100, 380);
  graphics.lineTo(200, 450);
  graphics.lineTo(300, 350);
  graphics.lineTo(400, 420);
  graphics.lineTo(500, 360);
  graphics.lineTo(600, 400);
  graphics.lineTo(700, 340);
  graphics.lineTo(800, 400);
  graphics.lineTo(800, 500);
  graphics.closePath();
  graphics.fill();
  
  // Ligne de lueur à l'horizon
  graphics.lineStyle(2, 0xff00ff, 0.3);
  graphics.beginPath();
  graphics.moveTo(0, 500);
  graphics.lineTo(800, 500);
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
    if (layer.graphics && layer.graphics.x !== undefined) {
      layer.graphics.x -= layer.speed;
      
      // Créer un effet de défilement infini
      if (layer.type === 'buildings') {
        // Pour les bâtiments, recréer le cycle tous les 2400 pixels
        if (layer.graphics.x <= -2400) {
          layer.graphics.x += 2400;
        }
      } else {
        // Pour les autres calques
        if (layer.graphics.x <= -1600) {
          layer.graphics.x += 1600;
        }
      }
    }
  });
  
  // Faire scintiller les étoiles
  if (starsLayer && starsLayer.alpha > 0) {
    starsLayer.list.forEach(star => {
      if (star._baseAlpha && star._twinkleSpeed) {
        const twinkle = Math.sin(Date.now() / 1000 * star._twinkleSpeed) * 0.3;
        star.setAlpha(Math.max(0.1, star._baseAlpha + twinkle));
      }
    });
  }
}

/**
 * Met à jour la visibilité des étoiles selon le cycle jour/nuit
 */
export function updateStarsVisibility(isNight) {
  if (starsLayer) {
    // Transition douce de l'opacité des étoiles
    const targetAlpha = isNight ? 1 : 0;
    const currentAlpha = starsLayer.alpha;
    const diff = targetAlpha - currentAlpha;
    
    if (Math.abs(diff) > 0.01) {
      starsLayer.setAlpha(currentAlpha + diff * 0.05);
    } else {
      starsLayer.setAlpha(targetAlpha);
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

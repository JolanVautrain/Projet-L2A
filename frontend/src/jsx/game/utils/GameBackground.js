/**
 * Gestion des arrière-plans pixel cyberpunk
 */

let backgroundLayers = [];
let buildingContainers = [];
let buildingScrollX = 0;

/**
 * Crée le système d'arrière-plan avec thème pixel cyberpunk
 */
export function createBackgroundSystem(scene) {
  backgroundLayers = [];
  buildingContainers = [];
  buildingScrollX = 0;
  
  // Fond noir avec grille de scanlines
  const background = scene.add.rectangle(400, 300, 800, 600, 0x0a0e16);
  background.setDepth(-100);
  
  // Grille de scanlines pixelisées
  const scanlines = scene.add.graphics();
  scanlines.lineStyle(1, 0x00ffff, 0.15);
  for (let y = 0; y < 600; y += 8) {
    scanlines.beginPath();
    scanlines.moveTo(0, y);
    scanlines.lineTo(800, y);
    scanlines.strokePath();
  }
  scanlines.setDepth(-99);
  
  // Calque 1: Structures éloignées pixelisées
  const distantStructures = createDistantPixelLayer(scene);
  backgroundLayers.push({ graphics: distantStructures, speed: 0.15, type: 'distant' });
  
  // Calque 2: Bâtiments pixelisés (avec défilement continu)
  createContinuousBuildingsLayer(scene);
  
  // Calque 3: Structures au premier plan
  const structures = createPixelStructuresLayer(scene);
  backgroundLayers.push({ graphics: structures, speed: 0.8, type: 'structures' });
}

/**
 * Crée des structures éloignées pixelisées
 */
function createDistantPixelLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-80);
  
  for (let i = 0; i < 6; i++) {
    const x = i * 200;
    
    // Bâtiment pixelisé en cyan
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x1a2634, 1);
    graphics.fillRect(x + 20, 200, 60, 150);
    graphics.lineStyle(1, 0x00ffff, 0.8);
    graphics.strokeRect(x + 20, 200, 60, 150);
    
    // Fenêtres pixelisées
    graphics.fillStyle(0x00ffff, 0.5);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        graphics.fillRect(x + 28 + col * 12, 210 + row * 20, 6, 8);
      }
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
 * Crée un gratte-ciel hautain
 */
function createSkyscraper(graphics, x, y, width, height) {
  // Corps principal - bleu-gris foncé
  graphics.fillStyle(0x0f1a2e, 1);
  graphics.fillRect(x, y, width, height);
  
  // Contour magenta
  graphics.lineStyle(2, 0xff00ff, 0.9);
  graphics.strokeRect(x, y, width, height);
  
  // Bandes de contraste
  graphics.fillStyle(0x1a3a52, 1);
  graphics.fillRect(x + 2, y + 5, width - 4, 4);
  graphics.fillRect(x + 2, y + height / 2, width - 4, 4);
  
  // Fenêtres nombreuses
  const windowsPerRow = Math.floor(width / 12);
  const windowRows = Math.floor((height - 20) / 15);
  
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowsPerRow; col++) {
      const wx = x + 4 + col * 12;
      const wy = y + 10 + row * 15;
      
      graphics.fillStyle(0x00ffff, 0.6);
      graphics.fillRect(wx, wy, 6, 6);
      
      // Certaines fenêtres sont éteintes
      if (Math.random() > 0.3) {
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillRect(wx + 1, wy + 1, 2, 2);
      }
    }
  }
}

/**
 * Crée un immeuble résidentiel
 */
function createResidentialBuilding(graphics, x, y, width, height) {
  // Corps principal - rouge-marron
  graphics.fillStyle(0x2d1f1f, 1);
  graphics.fillRect(x, y, width, height);
  
  // Contour cyan
  graphics.lineStyle(2, 0x00ffff, 0.8);
  graphics.strokeRect(x, y, width, height);
  
  // Fenêtres côte à côte
  const windowsPerRow = 3;
  const windowRows = Math.floor((height - 20) / 20);
  
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowsPerRow; col++) {
      const wx = x + 6 + col * 14;
      const wy = y + 10 + row * 20;
      
      graphics.fillStyle(0x0a0e16, 1);
      graphics.fillRect(wx, wy, 10, 10);
      
      // Cadre jaune pour les fenêtres
      graphics.lineStyle(1, 0xffff00, 0.7);
      graphics.strokeRect(wx, wy, 10, 10);
      
      // Lumière intérieure
      if (Math.random() > 0.4) {
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillRect(wx + 2, wy + 2, 6, 6);
      }
    }
  }
  
  // Porte en bas
  graphics.fillStyle(0x8b4513, 1);
  graphics.fillRect(x + 18, y + height - 12, 14, 12);
  graphics.lineStyle(1, 0xffff00, 0.7);
  graphics.strokeRect(x + 18, y + height - 12, 14, 12);
}

/**
 * Crée un bâtiment industriel
 */
function createIndustrialBuilding(graphics, x, y, width, height) {
  // Corps principal - gris métallique
  graphics.fillStyle(0x4a4a4a, 1);
  graphics.fillRect(x, y, width, height);
  
  // Contour vert néon
  graphics.lineStyle(2, 0x00ff00, 0.9);
  graphics.strokeRect(x, y, width, height);
  
  // Petites fenêtres de contrôle
  const windowCount = 4;
  for (let i = 0; i < windowCount; i++) {
    const wy = y + 20 + i * (height - 40) / windowCount;
    graphics.fillStyle(0x0a0e16, 1);
    graphics.fillRect(x + width - 12, wy, 8, 8);
    graphics.lineStyle(1, 0x00ff00, 0.8);
    graphics.strokeRect(x + width - 12, wy, 8, 8);
  }
  
  // Tuyaux
  graphics.lineStyle(2, 0x666666, 0.8);
  graphics.beginPath();
  graphics.moveTo(x + width / 3, y);
  graphics.lineTo(x + width / 3, y - 20);
  graphics.strokePath();
  
  graphics.beginPath();
  graphics.moveTo(x + 2 * width / 3, y);
  graphics.lineTo(x + 2 * width / 3, y - 15);
  graphics.strokePath();
  
  // Grille métallique
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const gx = x + 4 + col * 14;
      const gy = y + 20 + row * 25;
      graphics.lineStyle(1, 0x888888, 0.5);
      graphics.strokeRect(gx, gy, 10, 10);
    }
  }
}

/**
 * Crée un bâtiment commercial
 */
function createCommercialBuilding(graphics, x, y, width, height) {
  // Corps principal - bleu clair
  graphics.fillStyle(0x1a3a52, 1);
  graphics.fillRect(x, y, width, height);
  
  // Contour magenta-rose
  graphics.lineStyle(2, 0xff1493, 0.9);
  graphics.strokeRect(x, y, width, height);
  
  // Grandes vitres commerciales
  const storeCount = 2;
  const storeHeight = Math.min(40, height / 3);
  
  for (let i = 0; i < storeCount; i++) {
    const gy = y + 5 + i * (height / storeCount);
    
    // Vitrine grande
    graphics.fillStyle(0x00ffff, 0.3);
    graphics.fillRect(x + 2, gy, width - 4, storeHeight - 2);
    
    // Cadre vitrine
    graphics.lineStyle(2, 0x00ffff, 0.8);
    graphics.strokeRect(x + 2, gy, width - 4, storeHeight - 2);
    
    // Divisions verticales
    for (let j = 1; j < 3; j++) {
      graphics.lineStyle(1, 0x00ffff, 0.5);
      graphics.beginPath();
      graphics.moveTo(x + 2 + j * (width - 4) / 3, gy);
      graphics.lineTo(x + 2 + j * (width - 4) / 3, gy + storeHeight - 2);
      graphics.strokePath();
    }
  }
}

/**
 * Crée des structures métalliques pixelisées
 */
function createPixelStructuresLayer(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-60);
  
  for (let i = 0; i < 10; i++) {
    const x = i * 120;
    
    const graphics = scene.add.graphics();
    
    // Structure métallique pixelisée - RAPPROCHÉE DU SOL
    graphics.fillStyle(0x333333, 0.9);
    graphics.fillRect(x + 20, 500, 12, 60);
    graphics.fillRect(x + 60, 500, 12, 60);
    graphics.fillRect(x + 20, 500, 52, 8);
    graphics.fillRect(x + 20, 552, 52, 8);
    
    // Barre de néon magenta
    graphics.fillStyle(0xff00ff, 0.9);
    graphics.fillRect(x + 35, 530, 20, 3);
    
    // Détails cyan
    graphics.lineStyle(1, 0x00ffff, 0.7);
    graphics.strokeRect(x + 20, 500, 52, 60);
    
    // Câbles pixelisés
    graphics.lineStyle(1, 0x666666, 0.8);
    graphics.beginPath();
    graphics.moveTo(x + 26, 500);
    graphics.lineTo(x + 22, 480);
    graphics.moveTo(x + 66, 500);
    graphics.lineTo(x + 70, 480);
    graphics.strokePath();
    
    container.add(graphics);
  }
  
  return container;
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
}

/**
 * Retourne les calques pour accéder aux lumières
 */
export function getBackgroundLayers() {
  return backgroundLayers;
}

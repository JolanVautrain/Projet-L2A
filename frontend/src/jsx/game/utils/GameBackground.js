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
  container.setDepth(-70);
  buildingContainers = [];
  
  // Créer plusieurs blocs de bâtiments pour un défilement continu
  for (let block = 0; block < 3; block++) {
    const blockX = block * 800;
    createBuildingBlock(scene, container, blockX);
  }
  
  backgroundLayers.push({ graphics: container, speed: 0.5, type: 'buildings' });
}

/**
 * Crée un bloc de bâtiments
 */
function createBuildingBlock(scene, container, blockOffsetX) {
  // 10 bâtiments par bloc pour remplir la largeur
  for (let i = 0; i < 10; i++) {
    const x = blockOffsetX + i * 80;
    const height = 80 + Math.random() * 140;
    
    const graphics = scene.add.graphics();
    
    // Bâtiment principal
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 400 - height, 70, height);
    
    // Contour magenta cyberpunk
    graphics.lineStyle(2, 0xff00ff, 0.9);
    graphics.strokeRect(0, 400 - height, 70, height);
    graphics.lineStyle(1, 0x00ffff, 0.5);
    graphics.strokeRect(2, 402 - height, 66, height - 4);
    
    // Fenêtres illuminées - MAINTENANT CORRIGES
    const windowsPerRow = 3;
    const windowRows = Math.floor((height - 20) / 18);
    
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowsPerRow; col++) {
        const wx = 8 + col * 18;
        const wy = 410 - height + 10 + row * 18;
        
        // Fenêtre noire (limite à 8x8)
        graphics.fillStyle(0x0a0e16, 1);
        graphics.fillRect(wx, wy, 8, 8);
        
        // Cadre cyan
        graphics.lineStyle(1, 0x00ffff, 0.8);
        graphics.strokeRect(wx, wy, 8, 8);
        
        // Lumière blanche intérieure
        graphics.fillStyle(0xffffff, 0.7);
        graphics.fillRect(wx + 1, wy + 1, 3, 3);
        graphics.fillStyle(0x00ffff, 0.5);
        graphics.fillRect(wx + 4, wy + 4, 2, 2);
      }
    }
    
    // Antennes sur les toits
    if (Math.random() > 0.5) {
      graphics.lineStyle(1, 0x00ff00, 0.8);
      const roofY = 400 - height;
      graphics.beginPath();
      graphics.moveTo(18, roofY);
      graphics.lineTo(18, roofY - 15);
      graphics.strokePath();
      
      // Signal radar
      graphics.lineStyle(1, 0xff00ff, 0.6);
      graphics.beginPath();
      graphics.arc(18, roofY - 15, 3, 0, Math.PI * 2);
      graphics.strokePath();
    }
    
    graphics.setPosition(x, 0);
    container.add(graphics);
    buildingContainers.push(graphics);
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

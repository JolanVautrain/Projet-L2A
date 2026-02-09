/**
 * Utilitaires pour créer des graphiques de style pixel
 */

/**
 * Crée un pixel sprite (bloc simple)
 */
export function createPixelSprite(scene, x, y, width, height, color) {
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(x - width / 2, y - height / 2, width, height);
  graphics.setPosition(0, 0);
  
  const texture = graphics.generateTexture('pixel_' + Math.random(), width, height);
  graphics.destroy();
  
  const sprite = scene.add.sprite(x, y, texture);
  return sprite;
}

/**
 * Crée un personnage pixelisé (idle)
 */
export function createPixelPlayer(scene, x, y) {
  const graphics = scene.add.graphics();
  
  // Couleur cyberpunk : cyan/magenta
  const skinColor = 0xff00ff; // Magenta
  const outlineColor = 0x00ffff; // Cyan
  
  // Tête
  graphics.fillStyle(skinColor, 1);
  graphics.fillRect(x - 8, y - 20, 16, 16);
  
  // Corps
  graphics.fillRect(x - 6, y - 4, 12, 16);
  
  // Jambes
  graphics.fillRect(x - 3, y + 12, 3, 8);
  graphics.fillRect(x, y + 12, 3, 8);
  
  // Contour neon
  graphics.lineStyle(1, outlineColor, 1);
  graphics.strokeRect(x - 8, y - 20, 16, 16);
  graphics.strokeRect(x - 6, y - 4, 12, 16);
  
  const texture = graphics.generateTexture('pixel_player', 32, 48);
  graphics.destroy();
  
  return texture;
}

/**
 * Crée un obstacle pixelisé (bombe)
 */
export function createPixelObstacle(scene, x, y) {
  const graphics = scene.add.graphics();
  
  // Bombe en style pixel
  const bombColor = 0x1a1a2e; // Noir cyberpunk
  const highlightColor = 0xff00ff; // Magenta neon
  
  // Corps principal (carré)
  graphics.fillStyle(bombColor, 1);
  graphics.fillRect(x - 8, y - 8, 16, 16);
  
  // Surbrillance neon
  graphics.fillStyle(highlightColor, 0.6);
  graphics.fillRect(x - 6, y - 6, 4, 4);
  graphics.fillRect(x + 2, y - 2, 4, 4);
  
  // Mèche
  graphics.fillStyle(0xffff00, 1);
  graphics.fillRect(x - 2, y - 12, 4, 6);
  graphics.fillRect(x - 1, y - 14, 2, 2);
  
  const texture = graphics.generateTexture('pixel_bomb', 32, 32);
  graphics.destroy();
  
  return texture;
}

/**
 * Crée une plateforme pixelisée
 */
export function createPixelPlatform(scene, x, y, width, height) {
  const graphics = scene.add.graphics();
  
  const platformColor = 0x00ffff; // Cyan neon
  const darkColor = 0x0a0e16; // Noir
  
  // Base de la plateforme
  graphics.fillStyle(darkColor, 1);
  graphics.fillRect(x - width / 2, y - height / 2, width, height);
  
  // Détails de grille
  graphics.lineStyle(1, platformColor, 0.5);
  for (let i = 0; i < width; i += 16) {
    graphics.beginPath();
    graphics.moveTo(x - width / 2 + i, y - height / 2);
    graphics.lineTo(x - width / 2 + i, y + height / 2);
    graphics.strokePath();
  }
  
  const texture = graphics.generateTexture('pixel_platform', width, height);
  graphics.destroy();
  
  return texture;
}

/**
 * Crée une étoile pixelisée pour l'invincibilité
 */
export function createPixelStar(graphics, cx, cy, size) {
  const color = 0xffff00; // Jaune
  const outlineColor = 0xff00ff; // Magenta
  
  graphics.fillStyle(color, 1);
  graphics.fillRect(cx - size / 2, cy - size / 2, size, size);
  
  graphics.lineStyle(1, outlineColor, 1);
  graphics.strokeRect(cx - size / 2, cy - size / 2, size, size);
}

/**
 * Crée un background pixelisé cyberpunk
 */
export function createPixelBackground(scene) {
  const container = scene.add.container(0, 0);
  container.setDepth(-100);
  
  // Fond noir
  const background = scene.add.rectangle(400, 300, 800, 600, 0x0a0e16);
  container.add(background);
  
  // Grille de scanlines
  const graphics = scene.add.graphics();
  graphics.lineStyle(1, 0x00ffff, 0.1);
  for (let y = 0; y < 600; y += 4) {
    graphics.beginPath();
    graphics.moveTo(0, y);
    graphics.lineTo(800, y);
    graphics.strokePath();
  }
  graphics.setDepth(-99);
  container.add(graphics);
  
  return container;
}

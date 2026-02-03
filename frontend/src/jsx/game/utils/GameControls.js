/**
 * Gestion des touches clavier et contrôles
 */

let cursors = null;
let key3Pressed = false;
let key4Pressed = false;
let onInvincibleToggle = null;

/**
 * Initialise les contrôles clavier
 */
export function initControls(scene, onInvincibleToggleCallback = null) {
  cursors = scene.input.keyboard.createCursorKeys();
  onInvincibleToggle = onInvincibleToggleCallback;
  
  // Ajouter la touche 4 pour le mode invincible (admin seulement)
  scene.input.keyboard.on('keydown-FOUR', () => {
    console.log('[GameControls] Touche 4 pressée');
    if (onInvincibleToggle) {
      console.log('[GameControls] Appel du callback invincibilité');
      onInvincibleToggle();
    }
  });
  
  // Ajouter la touche K pour le mode invincible (admin seulement)
  scene.input.keyboard.on('keydown-K', () => {
    console.log('[GameControls] Touche K pressée');
    if (onInvincibleToggle) {
      console.log('[GameControls] Appel du callback invincibilité via K');
      onInvincibleToggle();
    } else {
      console.log('[GameControls] ATTENTION: onInvincibleToggle est null!');
    }
  });
}

/**
 * Retourne les curseurs pour le mouvement
 */
export function getCursors() {
  return cursors;
}

/**
 * Vérifie si une action de saut est demandée
 */
export function isJumpRequested() {
  if (!cursors) return false;
  return cursors.space.isDown || cursors.up.isDown;
}

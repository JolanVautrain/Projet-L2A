/**
 * Gestion de la physique et des collisions du jeu
 */

/**
 * Dessine une étoile pixelisée pour l'invincibilité
 */
function drawPixelStar(graphics, cx, cy, size) {
  const color = 0xffff00; // Jaune
  const outlineColor = 0xff00ff; // Magenta
  
  // Corps principal (carré)
  graphics.fillStyle(color, 1);
  graphics.fillRect(cx - size / 2, cy - size / 2, size, size);
  
  // Contour magenta
  graphics.lineStyle(2, outlineColor, 1);
  graphics.strokeRect(cx - size / 2, cy - size / 2, size, size);
  
  // Détails internes (petits carrés)
  graphics.fillStyle(outlineColor, 0.7);
  graphics.fillRect(cx - size / 4, cy - size / 4, size / 4, size / 4);
  graphics.fillRect(cx + size / 4, cy + size / 4, size / 4, size / 4);
}

let player = null;
let opponent = null
let platforms = null;
let touchingGround = false;
let isAdminMode = false;
let isInvincible = false;
let invincibleStar = null;

/**
 * Initialise les éléments de physique
 */
export function initPhysics(scene, onAdminModeChange = null) {
  // Ground
  platforms = scene.physics.add.staticGroup();
  platforms.create(400, 568, "ground").setScale(2).refreshBody();

  // Player - créé avec des graphics pixelisés
  player = scene.physics.add.sprite(120, 450, "dude");
  player.setCollideWorldBounds(true);
  player.setBounce(0);

  // Opponent créé avec des graphics pixelisés
  opponent = scene.physics.add.sprite(120, 450, "opponent");
  opponent.setCollideWorldBounds(true);
  opponent.setBounce(0);

  // Animations simplifiées pour le style pixel
  scene.anims.create({
    key: "run",
    frames: scene.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });

  scene.anims.create({
    key: "idle",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20,
  });

  player.anims.play("run");
  opponent.anims.play("run");
  touchingGround = false;
  isInvincible = false;
  
  // Détecte si l'utilisateur est admin
  const username = localStorage.getItem("user");
  
  // Vérifier si admin directement via le backend
  if (username) {
    fetch(`http://localhost:5000/api/admin/check/${username}`)
      .then(r => r.json())
      .then(data => {
        isAdminMode = data.isAdmin === true;
        
        if (isAdminMode && !invincibleStar) {
          invincibleStar = scene.add.graphics();
          drawPixelStar(invincibleStar, 50, 100, 20);
          invincibleStar.setDepth(10);
          invincibleStar.setAlpha(0);
        }
      })
      .catch(err => {
        // Fallback: vérifier adminUsers dans localStorage
        const adminUsersStr = localStorage.getItem("adminUsers");
        
        let adminList = [];
        if (adminUsersStr) {
          try {
            adminList = JSON.parse(adminUsersStr);
            if (!Array.isArray(adminList)) {
              adminList = [adminUsersStr];
            }
          } catch (e) {
            adminList = adminUsersStr.split(',').map(u => u.trim());
          }
        }
        
        isAdminMode = username && adminList.includes(username);
        
        if (isAdminMode && !invincibleStar) {
          invincibleStar = scene.add.graphics();
          drawPixelStar(invincibleStar, 50, 100, 20);
          invincibleStar.setDepth(10);
          invincibleStar.setAlpha(0);
        }
      });
  } else {
    isAdminMode = false;
  }
  
  if (onAdminModeChange) {
    onAdminModeChange(isAdminMode);
  }
}

/**
 * Détecte si le joueur touche le sol
 */
export function handleTouchGround() {
  touchingGround = true;
}

/**
 * Retourne si le joueur touche le sol
 */
export function isTouchingGround() {
  return touchingGround;
}

/**
 * Gère le saut du joueur
 */
export function handleJump(onJumpInput = null) {
  if (player && touchingGround) {
    player.setVelocityY(-500);
    touchingGround = false;
    
    if (onJumpInput) {
      onJumpInput();
    }
  }
}

/**
 * Bascule le mode invincible (admin seulement)
 */
export function toggleInvincible() {
  if (!isAdminMode) {
    return false;
  }
  isInvincible = !isInvincible;
  if (invincibleStar) {
    invincibleStar.setAlpha(isInvincible ? 1 : 0);
  }
  return isInvincible;
}

/**
 * Retourne l'état d'invincibilité
 */
export function getInvincibility() {
  return {
    isInvincible,
    isAdminMode
  };
}

/**
 * Retourne le joueur
 */
export function getPlayer() {
  return player;
}

/**
 * Retourne le joueur
 */
export function getOpponent() {
  return opponent;
}

/**
 * Retourne les plates-formes
 */
export function getPlatforms() {
  return platforms;
}

/**
 * Réinitialise l'état physique
 */
export function resetPhysicsState() {
  touchingGround = false;
  isInvincible = false;
  
  if (invincibleStar) {
    invincibleStar.setAlpha(0);
  }
  
  if (player) {
    player.setPosition(120, 450);
    if (player.body) {
      player.body.setVelocity(0, 0);
      player.body.allowGravity = true;
    }
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
  }
}

/**
 * Initialise les collisions
 */
export function setupCollisions(scene, onTouchGround, onHitObstacle) {
  scene.physics.add.collider(player, platforms, () => {
    handleTouchGround();
    if (onTouchGround) onTouchGround();
  });
  
  // Les collisions avec les obstacles sont gérées ailleurs
  // car elles dépendent de l'invincibilité
}

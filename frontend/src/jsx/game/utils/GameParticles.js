/**
 * Système de particules pour les effets visuels
 */

let particles = [];

/**
 * Initialise le système de particules
 */
export function initParticles(scene) {
  particles = [];
}

/**
 * Crée une explosion de particules cyberpunk
 */
export function createExplosion(scene, x, y, color = 0xff00ff) {
  const particleCount = 12;
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const speed = 150 + Math.random() * 100;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    const particle = scene.add.rectangle(x, y, 4, 4, color);
    particle.setDepth(5);
    
    particles.push({
      sprite: particle,
      vx,
      vy,
      life: 0.6, // Durée en secondes
      maxLife: 0.6,
      gravity: 300
    });
  }
}

/**
 * Crée des particules de néon qui s'écoulent
 */
export function createNeonFlow(scene, x, y) {
  const colors = [0xff00ff, 0x00ffff, 0xffff00];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const particle = scene.add.rectangle(
        x + Math.random() * 20 - 10,
        y,
        2,
        2,
        color
      );
      particle.setDepth(5);
      particle.setAlpha(0.8);
      
      particles.push({
        sprite: particle,
        vx: (Math.random() - 0.5) * 50,
        vy: -100 - Math.random() * 100,
        life: 1.2,
        maxLife: 1.2,
        gravity: 100
      });
    }, i * 50);
  }
}

/**
 * Met à jour toutes les particules
 */
export function updateParticles(deltaTime) {
  particles = particles.filter(particle => {
    particle.life -= deltaTime;
    
    if (particle.life <= 0) {
      particle.sprite.destroy();
      return false;
    }
    
    // Gestion spéciale des ondes de choc
    if (particle.isWave) {
      const progress = 1 - (particle.life / particle.maxLife);
      const newRadius = particle.startRadius + (particle.maxRadius - particle.startRadius) * progress;
      particle.sprite.setRadius(newRadius);
      particle.sprite.setAlpha((1 - progress) * 0.8);
      return true;
    }
    
    // Appliquer la physique
    particle.vy += particle.gravity * deltaTime;
    particle.sprite.x += particle.vx * deltaTime;
    particle.sprite.y += particle.vy * deltaTime;
    
    // Fade out en fin de vie
    const lifeFraction = particle.life / particle.maxLife;
    particle.sprite.setAlpha(lifeFraction * 0.8);
    
    return true;
  });
}

/**
 * Crée un effet de point gagnée
 */
export function createScorePopup(scene, x, y, points) {
  const text = scene.add.text(x, y, '+' + points, {
    fontSize: '16px',
    fill: '#00ff00',
    fontFamily: 'Courier New'
  });
  text.setDepth(10);
  text.setOrigin(0.5);
  
  particles.push({
    sprite: text,
    vx: 0,
    vy: -150,
    life: 0.8,
    maxLife: 0.8,
    gravity: -200,
    isText: true
  });
}

/**
 * Crée des tracés de traînée derrière des objets
 */
export function createTrail(scene, x, y, color = 0x00ffff) {
  const particle = scene.add.circle(x, y, 5, color);
  particle.setDepth(3);
  particle.setAlpha(0.6);
  
  particles.push({
    sprite: particle,
    vx: 0,
    vy: 0,
    life: 0.3,
    maxLife: 0.3,
    gravity: 0
  });
}

/**
 * Crée des étincelles électriques
 */
export function createElectricSpark(scene, x, y) {
  const sparkCount = 6 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < sparkCount; i++) {
    const angle = (Math.PI * 2 * Math.random());
    const speed = 100 + Math.random() * 150;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    const spark = scene.add.line(
      x, y,
      0, 0,
      Math.random() * 10 - 5, Math.random() * 10 - 5,
      0x00ffff
    );
    spark.setLineWidth(1.5);
    spark.setDepth(4);
    
    particles.push({
      sprite: spark,
      vx,
      vy,
      life: 0.4,
      maxLife: 0.4,
      gravity: 200
    });
  }
}

/**
 * Crée des particules de poussière
 */
export function createDustCloud(scene, x, y, color = 0xff00ff) {
  const dustCount = 8 + Math.floor(Math.random() * 8);
  
  for (let i = 0; i < dustCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 50;
    
    const dust = scene.add.circle(x, y, 2 + Math.random() * 2, color);
    dust.setDepth(2);
    dust.setAlpha(0.7);
    
    particles.push({
      sprite: dust,
      vx,
      vy,
      life: 0.7,
      maxLife: 0.7,
      gravity: -100
    });
  }
}

/**
 * Crée une onde de choc
 */
export function createShockWave(scene, x, y) {
  const wave = scene.add.circle(x, y, 10, undefined);
  wave.setStrokeStyle(2, 0x00ffff, 0.8);
  wave.setDepth(5);
  
  // Animer l'onde
  let radius = 10;
  const maxRadius = 100;
  
  particles.push({
    sprite: wave,
    vx: 0,
    vy: 0,
    life: 0.4,
    maxLife: 0.4,
    gravity: 0,
    isWave: true,
    startRadius: 10,
    maxRadius: 100
  });
}

/**
 * Nettoie toutes les particules
 */
export function clearParticles() {
  particles.forEach(p => p.sprite.destroy());
  particles = [];
}

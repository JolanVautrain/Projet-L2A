import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../css/index.css";
import "../css/game.css";

// Game state (module-level to persist across renders)
let player, stars, bombs, platforms, cursors;
let score = 0;
let gameOver = false;
let touchingGround = false;
let internalStage = 1;

function preload() {
  console.log('[Phaser] preload() called');
  this.load.image("sky", "src/assets/sky.png");
  this.load.image("ground", "src/assets/platform.png");
  this.load.image("star", "src/assets/star.png");
  this.load.image("bomb", "src/assets/bomb.png");
  this.load.spritesheet("dude", "src/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48,
  });
  console.log('[Phaser] preload() finished');
}

function create() {
  console.log('[Phaser] create() called');
  this.add.image(400, 300, "sky");
  platforms = this.physics.add.staticGroup();
  platforms.create(400, 568, "ground").setScale(2).refreshBody();
  platforms.create(600, 400, "ground");
  platforms.create(50, 250, "ground");
  platforms.create(750, 220, "ground");
  player = this.physics.add.sprite(100, 450, "dude");
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.anims.create({
    key: "left",
    frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });
  this.anims.create({
    key: "turn",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20,
  });
  this.anims.create({
    key: "right",
    frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });
  cursors = this.input.keyboard.createCursorKeys();
  stars = this.physics.add.group({
    key: "star",
    repeat: 11,
    setXY: { x: 12, y: 0, stepX: 70 },
  });
  stars.children.iterate(function (child) {
    child.setBounceY(globalThis.Phaser.Math.FloatBetween(0.4, 0.8));
  });
  bombs = this.physics.add.group();
  // spawn initial bombs for starting stage
  for (let i = 0; i < internalStage; i++) spawnBomb();
  this.physics.add.collider(stars, platforms);
  this.physics.add.collider(bombs, platforms);
  this.physics.add.overlap(player, stars, collectStar, null, this);
  this.physics.add.collider(player, bombs, hitBomb, null, this);
  this.physics.add.collider(player, platforms, touchGround, null, this);
  console.log('[Phaser] create() finished');
}

function update() {
  if (gameOver) {
    stars.children.iterate(function (child) {
      child.disableBody(true, true);
    });
    bombs.children.iterate(function (child) {
      child.disableBody(true, true);
    });
    stars.children.iterate(function (child) {
      child.enableBody(true, child.x, 0, true, true);
    });
    // spawn initial bombs for reset stage
    try {
      for (let i = 0; i < internalStage; i++) spawnBomb();
    } catch (e) {
      console.warn('spawnBomb unavailable during reset', e);
    }
    gameOver = false;
  }
  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play("left", true);
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    player.anims.play("right", true);
  } else {
    player.setVelocityX(0);
    player.anims.play("turn");
  }
  if (cursors.up.isDown && player.body.touching.down && touchingGround) {
    player.setVelocityY(-650);
    touchingGround = false;
  }
}

function collectStar(player, star) {
  console.log('[Phaser] Star collected! Stage:', internalStage);
  star.disableBody(true, true);
  // update score and notify React overlay
  score += 10;
  globalThis.dispatchEvent(new CustomEvent('score-up', { detail: score }));
  if (stars.countActive(true) === 0) {
    internalStage += 1;
    console.log('[Phaser] Stage completed! New stage:', internalStage);
    globalThis.dispatchEvent(new CustomEvent('stage-up', { detail: internalStage }));
    stars.children.iterate(function (child) {
      child.enableBody(true, child.x, 0, true, true);
    });
    // spawn exactly one additional bomb for the new stage (cumulative)
    console.log('[Phaser] Adding 1 bomb for new stage');
    try {
      spawnBomb();
    } catch (e) {
      console.warn('spawnBomb not available when adding bomb', e);
    }
  }
}

// helper to call Phaser.Math.Between safely if Phaser not yet on global scope
function PhaserSafeBetween(min, max) {
  if (typeof globalThis?.Phaser?.Math?.Between === 'function') {
    return globalThis.Phaser.Math.Between(min, max);
  }
  // fallback
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// spawn a single bomb with properties influenced by current stage
function spawnBomb() {
  if (!bombs) return;
  const x = PhaserSafeBetween(50, 750);
  let b;
  try {
    b = bombs.create(x, 16, "bomb");
  } catch (e) {
    console.warn('Failed to create bomb', e);
    return;
  }
  b.setBounce(1);
  b.setCollideWorldBounds(true);
  const speed = globalThis.Phaser?.Math?.Between
    ? globalThis.Phaser.Math.Between(-150 - internalStage * 10, 150 + internalStage * 10)
    : (Math.random() * 400 - 200);
  b.setVelocity(speed, 20);
  b.allowGravity = false;
}

function hitBomb(player, bomb) {
  gameOver = true;
  // reset stage and score on death
  internalStage = 1;
  score = 0;
  globalThis.dispatchEvent(new CustomEvent('stage-up', { detail: internalStage }));
  globalThis.dispatchEvent(new CustomEvent('score-up', { detail: score }));
  // remove existing bombs immediately
  if (bombs) {
    bombs.children.iterate(function (child) {
      child.destroy();
    });
  }
}

function touchGround(player, ground) {
  touchingGround = true;
}

function Game() {
  const gameContainer = useRef(null);
  const [stage, setStage] = useState(1);
  const [scoreDisplay, setScoreDisplay] = useState(0);

  // Reset global game state on component mount
  useEffect(() => {
    player = undefined;
    stars = undefined;
    bombs = undefined;
    platforms = undefined;
    cursors = undefined;
    score = 0;
    gameOver = false;
    touchingGround = false;
    internalStage = 1;
  }, []);

  useEffect(() => {
    let destroyed = false;
    let gameInstance = null;

    const createGame = () => {
      if (destroyed || !gameContainer.current || gameContainer.current._phaserGame) return;
      
      console.log('Creating Phaser game instance...');
      const config = {
        type: globalThis.Phaser.AUTO,
        width: 800,
        height: 600,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 1000 },
            debug: false,
          },
        },
        scene: { preload, create, update },
        parent: gameContainer.current,
      };
      gameInstance = new globalThis.Phaser.Game(config);
      gameContainer.current._phaserGame = gameInstance;
      
      // Ensure canvas is visible
      setTimeout(() => {
        const canvas = gameContainer.current?.querySelector('canvas');
        if (canvas) {
          console.log('[Canvas] Dimensions:', canvas.width, 'x', canvas.height);
          canvas.style.display = 'block';
          canvas.style.visibility = 'visible';
          canvas.style.opacity = '1';
        } else {
          console.log('[Canvas] No canvas found');
        }
      }, 100);
    };

    const initPhaser = () => {
      console.log('[initPhaser] Called. destroyed=', destroyed, 'Phaser=', !!globalThis.Phaser);
      if (destroyed) return;
      
      if (globalThis.Phaser) {
        console.log('[initPhaser] Phaser available, calling createGame');
        createGame();
        return;
      }

      let script = document.querySelector('script[data-phaser-dynamic]');
      if (script) {
        console.log('Phaser script exists but not ready, polling...');
        const checkPhaser = setInterval(() => {
          if (destroyed) {
            clearInterval(checkPhaser);
            return;
          }
          if (globalThis.Phaser) {
            console.log('Phaser ready from polling');
            clearInterval(checkPhaser);
            createGame();
          }
        }, 100);
      } else {
        console.log('Loading Phaser script from CDN...');
        script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';
        script.dataset.phaserDynamic = '1';
        script.onload = () => {
          console.log('Phaser script loaded');
          if (!destroyed) createGame();
        };
        script.onerror = () => {
          console.error('Failed to load Phaser script');
        };
        document.head.appendChild(script);
      }
    };

    // Small delay to ensure DOM is ready
    console.log('[Game] Setting timeout for initPhaser');
    const timer = setTimeout(() => {
      console.log('[Game] Timeout fired, calling initPhaser');
      if (!destroyed) initPhaser();
    }, 50);

    return () => {
      destroyed = true;
      clearTimeout(timer);
      if (gameInstance) {
        gameInstance.destroy(true);
      }
      if (gameContainer.current) {
        gameContainer.current._phaserGame = null;
      }
    };
  }, []);

  useEffect(() => {
    const onStage = (e) => {
      if (e?.detail) setStage(e.detail);
    };
    globalThis.addEventListener('stage-up', onStage);
    return () => globalThis.removeEventListener('stage-up', onStage);
  }, []);

  useEffect(() => {
    const onScore = (e) => {
      if (e?.detail !== undefined) setScoreDisplay(e.detail);
    };
    globalThis.addEventListener('score-up', onScore);
    return () => globalThis.removeEventListener('score-up', onScore);
  }, []);

  

  return (
    <div className="game-wrap">
      <div className="game-overlay">
        <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
          <div className="stage-pill">Stage {stage}</div>
        </div>
        <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
          <div className="score-display">Score: {scoreDisplay}</div>
        </div>
      </div>

      <div ref={gameContainer} id="phaser-container" style={{width: 800, height: 600, background: '#0b1222', borderRadius: 12, overflow: 'hidden', display: 'block', position: 'relative'}} />

      <div className="options-buttons">
        <button className="btn ghost" onClick={() => globalThis.location.reload()}>Recharger le jeu</button>
        <Link className="btn accent" to="/">Quitter le jeu</Link>
      </div>
    </div>
  );
}

export default Game;

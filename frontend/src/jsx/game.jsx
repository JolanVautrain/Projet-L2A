import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../css/index.css";
import "../css/game.css";

// On importe Phaser via CDN dans index.html, donc il est global

function Game() {
  const gameContainer = useRef(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // On évite de recréer le jeu à chaque render
    // Si Phaser n'est pas encore chargé, on ne casse pas l'UI : on tente de l'attendre
    if (!window.Phaser) {
      let script = document.querySelector('script[data-phaser-dynamic]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';
        script.setAttribute('data-phaser-dynamic', '1');
        script.onload = () => {
          // force rerun effect to create the game
          if (gameContainer.current) {
            // small async tick
            setTimeout(() => {
              if (gameContainer.current) {
                // re-run effect body by calling init directly
                const ev = new Event('phaser-ready');
                window.dispatchEvent(ev);
              }
            }, 16);
          }
        };
        document.head.appendChild(script);
      }
      const onReady = () => {
        // re-run effect body by forcing a recreation
        if (gameContainer.current && !gameContainer.current._phaserGame) {
          const ev = new Event('phaser-ready-create');
          window.dispatchEvent(ev);
        }
      };
      window.addEventListener('phaser-ready', onReady);
      return () => window.removeEventListener('phaser-ready', onReady);
    }
      if (gameContainer.current && !gameContainer.current._phaserGame) {
      const config = {
        type: window.Phaser.AUTO,
        width: 800,
        height: 600,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 1000 },
            debug: false,
          },
        },
        scene: {
          preload,
          create,
          update,
        },
        parent: gameContainer.current,
      };
      gameContainer.current._phaserGame = new window.Phaser.Game(config);
      setLoading(false);
    }
    // Nettoyage si on quitte la page
    return () => {
      if (gameContainer.current && gameContainer.current._phaserGame) {
        gameContainer.current._phaserGame.destroy(true);
        gameContainer.current._phaserGame = null;
      }
    };
  }, []);

  // If Phaser was dynamically loaded and signalled creation, create game then
  useEffect(() => {
    const onCreate = () => {
      if (gameContainer.current && !gameContainer.current._phaserGame && window.Phaser) {
        const config = {
          type: window.Phaser.AUTO,
          width: 800,
          height: 600,
          physics: {
            default: "arcade",
            arcade: { gravity: { y: 1000 }, debug: false },
          },
          scene: { preload, create, update },
          parent: gameContainer.current,
        };
        gameContainer.current._phaserGame = new window.Phaser.Game(config);
        setLoading(false);
      }
    };
    window.addEventListener('phaser-ready-create', onCreate);
    return () => window.removeEventListener('phaser-ready-create', onCreate);
  }, []);

  // Fonctions Phaser (copiées de game.js)
  let player, stars, bombs, platforms, cursors, score = 0, highestScore = 0, gameOver = false, scoreText, highestScoreText, touchingGround = false;

  function preload() {
    this.load.image("sky", "src/assets/sky.png");
    this.load.image("ground", "src/assets/platform.png");
    this.load.image("star", "src/assets/star.png");
    this.load.image("bomb", "src/assets/bomb.png");
    this.load.spritesheet("dude", "src/assets/dude.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  function create() {
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
      child.setBounceY(window.Phaser.Math.FloatBetween(0.4, 0.8));
    });
    bombs = this.physics.add.group();
    scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "32px",
      fill: "#000",
    });
    highestScoreText = this.add.text(16, 48, "Highest Score: 0", {
      fontSize: "32px",
      fill: "#000",
    });
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.collider(player, bombs, hitBomb, null, this);
    this.physics.add.collider(player, platforms, touchGround, null, this);
  }

  function update() {
    if (gameOver) {
      stars.children.iterate(function (child) {
        child.disableBody(true, true);
      });
      bombs.children.iterate(function (child) {
        child.disableBody(true, true);
      });
      if (score > highestScore) {
        highestScore = score;
      }
      score = 0;
      scoreText.setText("Score: " + score);
      highestScoreText.setText("Highest Score: " + highestScore);
      stars.children.iterate(function (child) {
        child.enableBody(true, child.x, 0, true, true);
      });
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
    star.disableBody(true, true);
    score += 10;
    scoreText.setText("Score: " + score);
    if (stars.countActive(true) === 0) {
      stars.children.iterate(function (child) {
        child.enableBody(true, child.x, 0, true, true);
      });
      var x = player.x < 400 ? window.Phaser.Math.Between(400, 800) : window.Phaser.Math.Between(0, 400);
      var bomb = bombs.create(x, 16, "bomb");
      bomb.setBounce(1);
      bomb.setCollideWorldBounds(true);
      bomb.setVelocity(window.Phaser.Math.Between(-200, 200), 20);
      bomb.allowGravity = false;
    }
  }

  function hitBomb(player, bomb) {
    gameOver = true;
  }

  function touchGround(player, ground) {
    touchingGround = true;
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'}}>
      {loading && (
        <div style={{position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: '#e8edf6', padding: '8px 12px', borderRadius: 8, zIndex: 20}}>
          Chargement du jeu…
        </div>
      )}
      <div ref={gameContainer} id="phaser-container" style={{width: 800, height: 600}}></div>
      <div className="options-buttons" style={{marginTop: 24}}>
        <button className="btn ghost" onClick={() => window.location.reload()}>Recharger le jeu</button>
        <Link className="btn accent" to="/">Quitter le jeu</Link>
      </div>
    </div>
  );
}

export default Game;

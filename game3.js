const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 600,
  backgroundColor: '#1d1d1d',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Game Area Constants
const GAME_WIDTH = config.width;
const GAME_HEIGHT = config.height;
const WALL_THICKNESS = 30;

// Ball Constants
const BALL_RADIUS = 15;
const BALL_COLORS = [0x00ff00, 0xff9900];
const BALL_START_X = GAME_WIDTH / 2;
const BALL_START_Y = GAME_HEIGHT / 2;
const BALL_BOUNCE_LEVELS = [0.8, 0.7];
const BALL_MIN_SPEED = 150;
const BALL_MAX_SPEED = 200;
const BALL_SPEED_MULTIPLIERS = [1.0, 1.2];

// Gameplay Constants
const MIN_SWIPE_DISTANCE = 10;
const SWIPE_FORCE_DIVISOR = 50;
const MIN_SWIPE_FACTOR = 1;
const MAX_SWIPE_FACTOR = 6;
const FORCE_MULTIPLIERS = [0.75, 0.5];

// Obstacle Constants
const OBSTACLE_TYPES = {
  STATIC: {
    color: 0x666666,
    effect: (ball) => ball.body.velocity.scale(1.1)
  },
  BOUNCY: {
    color: 0x00aa00,
    effect: (ball) => ball.body.velocity.scale(1.5)
  },
  STICKY: {
    color: 0xaa00aa,
    effect: (ball) => ball.body.velocity.scale(0.5)
  },
  MOVING: {
    color: 0x0000aa,
    effect: (ball) => {} // Movement handled in update
  }
};

// Game Constants
const DIFFICULTY_SETTINGS = {
  1: { // Easy
    maxTouches: 20,
    timePenalty: 0.3,
    touchPenalty: 4,
    baseScore: 500,
    obstacleCount: 2
  },
  2: { // Hard
    maxTouches: 12,
    timePenalty: 0.5,
    touchPenalty: 6,
    baseScore: 200,
    obstacleCount: 4
  }
};

// Game Objects
let remainingTouches;
let currentSettings;
let obstacles = [];
let ball;
let walls = [];
let outletX;
let gameActive = true;
let touchCount = 0;
let startTime;
let currentLevel = 1;

// Sound keys
const SOUND_BOUNCE = 'bounce';
const SOUND_WIN = 'win';
const GAME_OVER = 'lose';

const UI_COLORS = {
  EASY: '#00ff00',
  HARD: '#ff9900',
  TEXT: '#ffffff',
  ACCENT: '#00ccff',
  BACKGROUND: 'rgba(0, 0, 0, 0.5)'
};

let statsPanel;
let timeDisplay;
let touchesDisplay;
let scoreDisplay;
let levelDisplay;
let obstaclesDisplay;

function preload() {
  this.load.audio(SOUND_BOUNCE, 'assets/ball-bounce.mp3');
  this.load.audio(SOUND_WIN, 'assets/win-sound.mp3');
  this.load.audio(GAME_OVER, 'assets/lose-sound.mp3');
}

function create() {
  // 1. INITIALIZE SETTINGS FIRST
  currentLevel = parseInt(localStorage.getItem('gameLevel')) || 1;
  currentSettings = DIFFICULTY_SETTINGS[currentLevel];
  remainingTouches = currentSettings.maxTouches;
  startTime = this.time.now;

  // 2. THEN CREATE UI ELEMENTS
  statsPanel = this.add.rectangle(10, 10, 180, 140, 0x000000, 0.5).setOrigin(0, 0);

  levelDisplay = this.add.text(
    20, 15,
    `LEVEL: ${currentLevel === 1 ? 'EASY' : 'HARD'}`,
    { fontSize: '18px', fill: currentLevel === 1 ? UI_COLORS.EASY : UI_COLORS.HARD, fontStyle: 'bold' }
  );

  timeDisplay = this.add.text(
    20, 40,
    `TIME: ${0}`,
    { fontSize: '16px', fill: UI_COLORS.TEXT }
  );

  // Now currentSettings is available!
  touchesDisplay = this.add.text(
    20, 65,
    `TOUCHES: ${remainingTouches}/${currentSettings.maxTouches}`,
    { fontSize: '16px', fill: UI_COLORS.TEXT }
  );

  scoreDisplay = this.add.text(
    20, 90,
    'SCORE: 0',
    { fontSize: '18px', fill: UI_COLORS.ACCENT, fontStyle: 'bold' }
  );

  obstaclesDisplay = this.add.text(
    20, 115,
    `OBSTACLES: 0`,
    { fontSize: '16px', fill: UI_COLORS.TEXT }
  );

  // 3. Finally setup the game level
  setupLevel(this);
  
  

  // Touch input
  this.input.on('pointerdown', (pointer) => {
    if (!gameActive) return;
    const touchEffect = this.add.circle(pointer.x, pointer.y, 10, 0xffffff, 0.5);
    this.tweens.add({
      targets: touchEffect,
      radius: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => touchEffect.destroy()
    });
  });

  this.input.on('pointerup', (pointer) => {
    if (!gameActive) return;

    const dx = pointer.x - pointer.downX;
    const dy = pointer.y - pointer.downY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MIN_SWIPE_DISTANCE) {
      const forceMultiplier = FORCE_MULTIPLIERS[currentLevel - 1];
      const vx = dx * forceMultiplier;
      const vy = dy * forceMultiplier;

      ball.body.setVelocity(vx, vy);
      touchCount++;
      remainingTouches--;
      touchesDisplay.setText(`TOUCHES: ${remainingTouches}/${currentSettings.maxTouches}`);

      this.tweens.add({
        targets: ball,
        scaleX: 1.2,
        scaleY: 0.8,
        duration: 100,
        yoyo: true
      });
    }
  });
}

function setupLevel(scene) {
  walls.forEach(wall => wall.destroy());
  walls = [];
  obstacles.forEach(obs => obs.destroy());
  obstacles = [];

  const ballRadius = currentLevel === 1 ? 15 : 10;
  const outletWidth = currentLevel === 1 ? 33 : 22;
  outletX = (GAME_WIDTH - outletWidth) / 2;

  // Create walls
  walls.push(scene.add.rectangle(GAME_WIDTH / 2, WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, 0xffffff));
  walls.push(scene.add.rectangle(outletX / 2, GAME_HEIGHT - WALL_THICKNESS / 2, outletX, WALL_THICKNESS, 0xffffff));
  walls.push(scene.add.rectangle(outletX + outletWidth + (GAME_WIDTH - outletX - outletWidth) / 2, GAME_HEIGHT - WALL_THICKNESS / 2, GAME_WIDTH - outletX - outletWidth, WALL_THICKNESS, 0xffffff));
  walls.push(scene.add.rectangle(WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, 0xffffff));
  walls.push(scene.add.rectangle(GAME_WIDTH - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, 0xffffff));

  // Add outlet
  const outlet = scene.add.rectangle(outletX + outletWidth / 2, GAME_HEIGHT - WALL_THICKNESS / 2, outletWidth, WALL_THICKNESS, 0xff0000);
  outlet.setAlpha(0.5);

  // Enable physics on walls
  walls.forEach(wall => scene.physics.add.existing(wall, true));

  // Create obstacles
  obstacles = createObstacles(scene);
  obstaclesDisplay.setText(`OBSTACLES: ${obstacles.length}`);

  // Create ball
  // Replace the ball creation code with this:
  ball = scene.add.circle(BALL_START_X, BALL_START_Y, ballRadius, BALL_COLORS[currentLevel - 1]);
  scene.physics.add.existing(ball);
  ball.body.setCircle(ballRadius);  // This is crucial - matches visual to physics
  ball.body.setCollideWorldBounds(true);
  ball.body.setBounce(BALL_BOUNCE_LEVELS[currentLevel - 1]);
  ball.body.setVelocity(0, 0);  // Start with zero velocity

  // Random starting velocity
  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const speed = Phaser.Math.Between(BALL_MIN_SPEED, BALL_MAX_SPEED) * BALL_SPEED_MULTIPLIERS[currentLevel - 1];
  ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

  // Set up collisions
  setupCollisions(scene, ball, walls, obstacles);

  gameActive = true;
  touchCount = 0;
}

function createObstacles(scene) {
  const newObstacles = [];
  const obstacleCount = currentSettings.obstacleCount;

  for (let i = 0; i < obstacleCount; i++) {
    const typeKeys = Object.keys(OBSTACLE_TYPES);
    const randomType = typeKeys[Phaser.Math.Between(0, typeKeys.length - 1)];
    const obstacleType = OBSTACLE_TYPES[randomType];

    const obstacle = scene.add.rectangle(
      Phaser.Math.Between(100, GAME_WIDTH - 100),
      Phaser.Math.Between(100, GAME_HEIGHT - 150),
      Phaser.Math.Between(30, 80),
      Phaser.Math.Between(30, 80),
      obstacleType.color
    );

    // Store obstacle type and effect
    obstacle.setData('type', randomType);
    obstacle.setData('effect', obstacleType.effect);  // This is crucial!

    const physicsBody = scene.physics.add.existing(obstacle);
    physicsBody.body.setImmovable(true);
    physicsBody.body.checkCollision.none = false;
    physicsBody.body.setSize(obstacle.width, obstacle.height);
    physicsBody.body.setOffset(0, 0);
    physicsBody.body.setAllowGravity(false);
    
    // Add type property for easy access
    obstacle.type = randomType;

    if (randomType === 'MOVING') {
      obstacle.speed = Phaser.Math.Between(50, 100);
      obstacle.direction = Phaser.Math.Between(0, 1) ? 1 : -1;
    }

    // Visual effects
    if (randomType === 'BOUNCY' || randomType === 'STICKY') {
      scene.tweens.add({
        targets: obstacle,
        alpha: 0.7,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }

    newObstacles.push(obstacle);
  }

  return newObstacles;
}

function setupCollisions(scene, ball, walls, obstacles) {
  walls.forEach(wall => {
    scene.physics.add.collider(ball, wall, () => handleBallCollision(scene, ball));
  });

  obstacles.forEach(obstacle => {
    scene.physics.add.collider(ball, obstacle, () => {
      const effect = obstacle.getData('effect');
      if (effect && typeof effect === 'function') {
        effect(ball);
      }
      handleBallCollision(scene, ball);

      if (obstacle.type === 'STICKY') {
        scene.tweens.add({
          targets: ball,
          scaleX: 0.9,
          scaleY: 1.1,
          duration: 200,
          yoyo: true
        });
      }
    });
  });
}

function handleBallCollision(scene, ball) {
  scene.sound.play(SOUND_BOUNCE, { volume: 0.3 });
  scene.tweens.add({
    targets: ball,
    fillColor: 0xff0000,
    duration: 100,
    yoyo: true,
    onComplete: () => {
      ball.fillColor = BALL_COLORS[currentLevel - 1];
    }
  });
}

function update() {
  if (!gameActive) return;

  const elapsedTime = (this.time.now - startTime) / 1000;
  timeDisplay.setText(`TIME: ${elapsedTime.toFixed(1)}s`);

  const currentScore = Math.max(0, currentSettings.baseScore - 
    (elapsedTime * currentSettings.timePenalty) - 
    ((currentSettings.maxTouches - remainingTouches) * currentSettings.touchPenalty));
  scoreDisplay.setText(`SCORE: ${Math.floor(currentScore)}`);

  if (remainingTouches <= 0 || currentScore === 0) {
    handleGameOver(this);
    return;
  }

  // Update moving obstacles
  obstacles.forEach(obstacle => {
    if (obstacle.type === 'MOVING') {
      obstacle.x += obstacle.speed * obstacle.direction * (currentLevel === 2 ? 1.5 : 1) * this.game.loop.delta / 1000;
      
      if (obstacle.x < 50 || obstacle.x > GAME_WIDTH - 50) {
        obstacle.direction *= -1;
      }
    }
  });

  // Check win condition
  const ballRadius = currentLevel === 1 ? 15 : 10;
  const ballLeft = ball.x - (currentLevel === 1 ? ballRadius : ballRadius * 0.8);
  const ballRight = ball.x + (currentLevel === 1 ? ballRadius : ballRadius * 0.8);
  const ballBottom = ball.y + (currentLevel === 1 ? ballRadius : ballRadius * 0.8);

  const outletLeft = outletX;
  const outletRight = outletX + (currentLevel === 1 ? 33 : 22);
  const outletTop = GAME_HEIGHT - WALL_THICKNESS;

  if (ballBottom >= outletTop && ballLeft >= outletLeft && ballRight <= outletRight) {
    gameActive = false;
    this.sound.play(SOUND_WIN);

    const timeTaken = (this.time.now - startTime) / 1000;
    const score = Math.round((timeTaken * 10) + (touchCount * 5));

    localStorage.setItem('gameTouches', touchCount);
    localStorage.setItem('gameTime', timeTaken);
    localStorage.setItem('gameScore', score);

    this.cameras.main.fadeOut(1000, 0, 0, 0);
    ball.body.setVelocity(0, 0);
    ball.body.setImmovable(true);

    this.time.delayedCall(2000, () => {
      try {
        window.location.href = 'win.html';
      } catch (e) {
        console.error("Redirect failed, showing in-game message");
        showInGameWinMessage(this, score);
      }
    }, [], this);
  }
}

function showInGameWinMessage(scene, score) {
  const overlay = scene.add.rectangle(
    GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7
  );

  const winText = scene.add.text(
    GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50,
    'YOU WIN!\nScore: ' + score,
    { fontSize: '32px', fill: '#0f0', align: 'center' }
  ).setOrigin(0.5);

  const menuButton = scene.add.text(
    GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50,
    'Return to Menu',
    { fontSize: '24px', fill: '#ff0' }
  ).setOrigin(0.5).setInteractive();

  menuButton.on('pointerdown', () => {
    try {
      window.location.href = 'index.html';
    } catch (e) {
      console.error("Failed to return to menu");
    }
  });

  scene.tweens.add({
    targets: [overlay, winText, menuButton],
    alpha: { from: 0, to: 1 },
    duration: 500
  });
}

function handleGameOver(scene) {
  gameActive = false;
  scene.sound.play(GAME_OVER, { volume: 0.9 });

  const finalTime = (scene.time.now - startTime) / 1000;
  const finalScore = Math.floor(Math.max(0, currentSettings.baseScore - 
    (finalTime * currentSettings.timePenalty) - 
    (currentSettings.maxTouches * currentSettings.touchPenalty)));

  localStorage.setItem('gameResult', 'lose');
  localStorage.setItem('gameTouches', currentSettings.maxTouches);
  localStorage.setItem('gameTime', finalTime);
  localStorage.setItem('gameScore', finalScore);

  scene.cameras.main.fadeOut(1000, 0, 0, 0);
  scene.time.delayedCall(1500, () => {
    window.location.href = 'lose.html';
  });
}
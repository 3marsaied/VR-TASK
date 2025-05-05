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

// Game Constants
const DIFFICULTY_SETTINGS = {
  1: { // Easy
    maxTouches: 20,
    timePenalty: 0.3,
    touchPenalty: 4,
    baseScore: 500
  },
  2: { // Hard
    maxTouches: 12,
    timePenalty: 0.5,
    touchPenalty: 6,
    baseScore: 200
  }
};
// Game Objects
let remainingTouches;
let currentSettings;

// Sound keys
const SOUND_BOUNCE = 'bounce';
const SOUND_WIN = 'win';
const GAME_OVER = 'lose';

const UI_COLORS = {
  EASY: '#00ff00',    // Green for easy level
  HARD: '#ff9900',    // Orange for hard level
  TEXT: '#ffffff',    // White for regular text
  ACCENT: '#00ccff',  // Blue for score
  BACKGROUND: 'rgba(0, 0, 0, 0.5)' // Semi-transparent black
};

// Game Objects
let ball;
let walls = [];
let outletX;
let gameActive = true;
let touchCount = 0;
let startTime;
let currentLevel = 1;
let levelText;
let instructionsText;

let statsPanel;
let timeDisplay;
let touchesDisplay;
let scoreDisplay;
let levelDisplay;

function preload() {
  this.load.audio(SOUND_BOUNCE, 'assets/ball-bounce.mp3');
  this.load.audio(SOUND_WIN, 'assets/win-sound.mp3');
  this.load.audio(GAME_OVER, 'assets/lose-sound.mp3');
}

function create() {
  // Get level from localStorage
  currentLevel = parseInt(localStorage.getItem('gameLevel')) || 1;
  currentSettings = DIFFICULTY_SETTINGS[currentLevel];
  remainingTouches = currentSettings.maxTouches;
  startTime = this.time.now;
  setupLevel(this);
  // Create the stats panel (semi-transparent background)
  statsPanel = this.add.rectangle(
    10, 10, 180, 110, 0x000000, 0.5
  ).setOrigin(0, 0);

  // Create UI elements
  /*
  scoreText = this.add.text(10, 10, 'Touches: 0', { fontSize: '16px', fill: '#fff' });
  levelText = this.add.text(10, 30, `Level: ${currentLevel === 1 ? 'Easy' : 'Hard'}`, 
      { fontSize: '16px', fill: '#fff' });
  instructionsText = this.add.text(10, GAME_HEIGHT - 30, 'Swipe to change ball direction', 
      { fontSize: '14px', fill: '#aaa' });
  */
  // Time display (formatted to 1 decimal)
  // Level display (top of stats panel)
  levelDisplay = this.add.text(
    20, 15,
    `LEVEL: ${currentLevel === 1 ? 'EASY' : 'HARD'}`,
    {
      fontSize: '18px',
      fill: currentLevel === 1 ? UI_COLORS.EASY : UI_COLORS.HARD,
      fontStyle: 'bold'
    }
  );
  timeDisplay = this.add.text(
    20, 40,
    `TIME: ${0}`,
    {
      fontSize: '16px',
      fill: UI_COLORS.TEXT
    }
  );

  // Touches display
  touchesDisplay = this.add.text(
    20, 65,
    `TOUCHES: ${remainingTouches}/${currentSettings.maxTouches}`,
    {
      fontSize: '16px',
      fill: UI_COLORS.TEXT
    }
  );

  // Score display (more prominent)
  scoreDisplay = this.add.text(
    20, 90,
    'SCORE: 0',
    {
      fontSize: '18px',
      fill: UI_COLORS.ACCENT,
      fontStyle: 'bold'
    }
  );


  // Touch swipe input logic
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
  // Clear previous walls if any
  walls.forEach(wall => wall.destroy());
  walls = [];

  // Set level-specific parameters
  const ballRadius = currentLevel === 1 ? 15 : 10;
  const outletWidth = currentLevel === 1 ? 33 : 22;

  // Calculate outlet position (centered)
  outletX = (GAME_WIDTH - outletWidth) / 2;

  // Create walls
  walls.push(scene.add.rectangle(
    GAME_WIDTH / 2,
    WALL_THICKNESS / 2,
    GAME_WIDTH,
    WALL_THICKNESS,
    0xffffff
  ));

  walls.push(scene.add.rectangle(
    outletX / 2,
    GAME_HEIGHT - WALL_THICKNESS / 2,
    outletX,
    WALL_THICKNESS,
    0xffffff
  ));

  walls.push(scene.add.rectangle(
    outletX + outletWidth + (GAME_WIDTH - outletX - outletWidth) / 2,
    GAME_HEIGHT - WALL_THICKNESS / 2,
    GAME_WIDTH - outletX - outletWidth,
    WALL_THICKNESS,
    0xffffff
  ));

  walls.push(scene.add.rectangle(
    WALL_THICKNESS / 2,
    GAME_HEIGHT / 2,
    WALL_THICKNESS,
    GAME_HEIGHT,
    0xffffff
  ));

  walls.push(scene.add.rectangle(
    GAME_WIDTH - WALL_THICKNESS / 2,
    GAME_HEIGHT / 2,
    WALL_THICKNESS,
    GAME_HEIGHT,
    0xffffff
  ));

  // Add outlet visual
  const outlet = scene.add.rectangle(
    outletX + outletWidth / 2,
    GAME_HEIGHT - WALL_THICKNESS / 2,
    outletWidth,
    WALL_THICKNESS,
    0xff0000
  );
  outlet.setAlpha(0.5);

  // Enable physics on walls
  walls.forEach(wall => {
    scene.physics.add.existing(wall, true);
  });

  // Create the ball
  if (ball) ball.destroy();
  ball = scene.add.circle(BALL_START_X, BALL_START_Y, ballRadius, BALL_COLORS[currentLevel - 1]);
  scene.physics.add.existing(ball);
  ball.body.setCollideWorldBounds(true);
  ball.body.setBounce(BALL_BOUNCE_LEVELS[currentLevel - 1]);

  // Give ball random starting velocity
  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const speed = Phaser.Math.Between(BALL_MIN_SPEED, BALL_MAX_SPEED) * BALL_SPEED_MULTIPLIERS[currentLevel - 1];
  ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

  // Ball-wall collisions with sound
  walls.forEach(wall => {
    scene.physics.add.collider(ball, wall, () => {
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
    });
  });

  // Reset game state
  gameActive = true;
  touchCount = 0;
  if (touchesDisplay) touchesDisplay.setText('Touches: 0');
}

function update() {
  if (!gameActive) return;

  // Update time display every frame
  const elapsedTime = (this.time.now - startTime) / 1000;
  timeDisplay.setText(`TIME: ${elapsedTime.toFixed(1)}s`);

  // Update decreasing score
  const currentScore = Math.max(0, currentSettings.baseScore -
    (elapsedTime * currentSettings.timePenalty) -
    ((currentSettings.maxTouches - remainingTouches) * currentSettings.touchPenalty));

  scoreDisplay.setText(`SCORE: ${Math.floor(currentScore)}`);

  // Check if touches are exhausted
  if (remainingTouches <= 0 || currentScore === 0) {
    handleGameOver(this);
    return;
  }

  // Check if 80% of the ball is within the outlet
  const ballRadius = currentLevel === 1 ? 15 : 10;
  const ballLeft = ball.x - ballRadius * 0.8;
  const ballRight = ball.x + ballRadius * 0.8;
  const ballBottom = ball.y + ballRadius * 0.8;

  const outletLeft = outletX;
  const outletRight = outletX + (currentLevel === 1 ? 33 : 22);
  const outletTop = GAME_HEIGHT - WALL_THICKNESS;

  if (ballBottom >= outletTop && ballLeft >= outletLeft && ballRight <= outletRight) {
    gameActive = false;
    this.sound.play(SOUND_WIN);

    const timeTaken = (this.time.now - startTime) / 1000;
    const score = Math.round((timeTaken * 10) + (touchCount * 5));

    // Save game results to localStorage
    localStorage.setItem('gameTouches', touchCount);
    localStorage.setItem('gameTime', timeTaken);
    localStorage.setItem('gameScore', score);

    // Add visual effects before redirect
    this.cameras.main.fadeOut(1000, 0, 0, 0);

    // Freeze the ball and physics
    ball.body.setVelocity(0, 0);
    ball.body.setImmovable(true);

    // Redirect after 2 seconds (2000 milliseconds)
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
  // Create a dark overlay
  const overlay = scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH,
    GAME_HEIGHT,
    0x000000,
    0.7
  );

  // Win message text
  const winText = scene.add.text(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2 - 50,
    'YOU WIN!\nScore: ' + score,
    {
      fontSize: '32px',
      fill: '#0f0',
      align: 'center'
    }
  ).setOrigin(0.5);

  // Return to menu button
  const menuButton = scene.add.text(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2 + 50,
    'Return to Menu',
    {
      fontSize: '24px',
      fill: '#ff0'
    }
  ).setOrigin(0.5).setInteractive();

  menuButton.on('pointerdown', () => {
    try {
      window.location.href = 'index.html';
    } catch (e) {
      console.error("Failed to return to menu");
    }
  });

  // Add some animation
  scene.tweens.add({
    targets: [overlay, winText, menuButton],
    alpha: { from: 0, to: 1 },
    duration: 500
  });
}

function handleGameOver(scene) {
  gameActive = false;
  scene.sound.play(GAME_OVER, { volume: 0.9 });


  // Save results
  const finalTime = (scene.time.now - startTime) / 1000;
  const finalScore = Math.floor(Math.max(0, currentSettings.baseScore -
    (finalTime * currentSettings.timePenalty) -
    (currentSettings.maxTouches * currentSettings.touchPenalty)));

  localStorage.setItem('gameResult', 'lose');
  localStorage.setItem('gameTouches', currentSettings.maxTouches);
  localStorage.setItem('gameTime', finalTime);
  localStorage.setItem('gameScore', finalScore);

  // Show game over screen
  scene.cameras.main.fadeOut(1000, 0, 0, 0);
  scene.time.delayedCall(1500, () => {
    window.location.href = 'lose.html';
  });
}

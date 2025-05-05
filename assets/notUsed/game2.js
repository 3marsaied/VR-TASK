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
const OUTLET_WIDTH = 35;
const OUTLET_LEFT_OFFSET = 75; // distance from left side to start of outlet gap

// Ball Constants
const BALL_RADIUS = 15;
const BALL_COLOR = 0x00ff00;
const BALL_START_X = GAME_WIDTH / 2;
const BALL_START_Y = GAME_HEIGHT / 2;
const BALL_BOUNCE = 0.75;
const BALL_MIN_SPEED = 150;
const BALL_MAX_SPEED = 200;

// Gameplay Constants
const MIN_SWIPE_DISTANCE = 10;
const SWIPE_FORCE_DIVISOR = 50;
const MIN_SWIPE_FACTOR = 1;
const MAX_SWIPE_FACTOR = 6;
const SOUND_BOUNCE = 'bounce';

// Game Objects
let ball;
let walls = [];
let outletX;

function preload() {
    // Load assets if needed
    this.load.audio(SOUND_BOUNCE, 'assets/ball-bounce.mp3');
}

function create() {
    // Create sounds
    bounceSound = this.sound.add('bounce');
    // Calculate outlet position
    outletX = OUTLET_LEFT_OFFSET + (GAME_WIDTH - 2 * OUTLET_LEFT_OFFSET - OUTLET_WIDTH) / 2;
    
    // Top wall
    walls.push(this.add.rectangle(
        GAME_WIDTH / 2,
        WALL_THICKNESS / 2,
        GAME_WIDTH,
        WALL_THICKNESS,
        0xffffff
    ));

    // Bottom left wall
    walls.push(this.add.rectangle(
        OUTLET_LEFT_OFFSET / 2,
        GAME_HEIGHT - WALL_THICKNESS / 2,
        GAME_WIDTH - OUTLET_WIDTH - OUTLET_LEFT_OFFSET,
        WALL_THICKNESS,
        0xffffff
    ));

    // Bottom right wall
    walls.push(this.add.rectangle(
        outletX + OUTLET_WIDTH + (GAME_WIDTH - OUTLET_WIDTH - OUTLET_LEFT_OFFSET) / 2,
        GAME_HEIGHT - WALL_THICKNESS / 2,
        GAME_WIDTH - OUTLET_WIDTH - OUTLET_LEFT_OFFSET,
        WALL_THICKNESS,
        0xffffff
    ));

    // Left wall
    walls.push(this.add.rectangle(
        WALL_THICKNESS / 2,
        GAME_HEIGHT / 2,
        WALL_THICKNESS,
        GAME_HEIGHT,
        0xffffff
    ));

    // Right wall
    walls.push(this.add.rectangle(
        GAME_WIDTH - WALL_THICKNESS / 2,
        GAME_HEIGHT / 2,
        WALL_THICKNESS,
        GAME_HEIGHT,
        0xffffff
    ));

    // Red rectangle to visualize the outlet
    this.add.rectangle(
        outletX + OUTLET_WIDTH / 2,
        GAME_HEIGHT - WALL_THICKNESS / 2,
        OUTLET_WIDTH,
        WALL_THICKNESS,
        0xff0000
    );

    // Enable physics on all walls
    walls.forEach(wall => {
        this.physics.add.existing(wall, true);
        this.sound.play(SOUND_BOUNCE, { volume: 0.3 });
        
    });

    // Ball
    ball = this.add.circle(BALL_START_X, BALL_START_Y, BALL_RADIUS, BALL_COLOR);
    this.physics.add.existing(ball);
    ball.body.setCollideWorldBounds(true);
    ball.body.setBounce(BALL_BOUNCE, BALL_BOUNCE);

    // Start ball with random velocity
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.Between(BALL_MIN_SPEED, BALL_MAX_SPEED);
    ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Ball collision with walls
    walls.forEach(wall => {
        this.physics.add.collider(ball, wall);
    });

    // Swipe input
    this.touchCount = 0;
    this.input.on('pointerdown', (pointer) => {
        pointer.startX = pointer.x;
        pointer.startY = pointer.y;
    });

    this.input.on('pointerup', (pointer) => {
        const dx = pointer.x - pointer.startX;
        const dy = pointer.y - pointer.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > MIN_SWIPE_DISTANCE) {
            let factor = Phaser.Math.Clamp(
                distance / SWIPE_FORCE_DIVISOR,
                MIN_SWIPE_FACTOR,
                MAX_SWIPE_FACTOR
            );
            const vx = dx * factor;
            const vy = dy * factor;

            ball.body.setVelocity(vx, vy);
            this.touchCount++;
            console.log(`Touches: ${this.touchCount}`);
        }
    });
}

function update() {
    const ballAtBottom = ball.y > GAME_HEIGHT - WALL_THICKNESS;
    const ballInOutletX = ball.x > outletX && ball.x < outletX + OUTLET_WIDTH;

    if (ballAtBottom && ballInOutletX) {
        console.log("YOU WIN!");
        this.scene.pause();
    }
}

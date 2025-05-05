const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 800,
    backgroundColor: '#1d1d1d',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 9.8 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
//Golbal Vars
let outletWidth = 30;
let BALL_RADIUS = 15;
let BALL_COLOR="0x00ff00"
let ball;
let walls = [];

function preload() {
    // You can load sounds/images later here
}

function create() {
    const thickness = 30;
    const outletX = 400 - outletWidth / 2;

    // Create wall rectangles
    walls.push(this.add.rectangle(200, thickness / 2, 400, thickness, 0xffffff)); // Top
    walls.push(this.add.rectangle(75, 600 - thickness / 2, 400 - outletWidth - 75, thickness, 0xffffff)); // Bottom left
    walls.push(this.add.rectangle(outletX + outletWidth, 600 - thickness / 2, 400 - outletWidth - 75, thickness, 0xffffff)); // Bottom right
    walls.push(this.add.rectangle(thickness / 2, 300, thickness, 600, 0xffffff)); // Left
    walls.push(this.add.rectangle(400 - thickness / 2, 300, thickness, 600, 0xffffff)); // Right

    // Add outlet visual (red rectangle)
    //this.add.rectangle( 75+200-outletWidth, 600 - thickness / 2, outletWidth, thickness, 0xff0000);

    // Enable physics on walls
    walls.forEach(wall => {
        this.physics.add.existing(wall, true); // true = static
        //make the walls static (NON-MOVING)
    });

    // Create the ball
    ball = this.add.circle(200, 300, BALL_RADIUS, BALL_COLOR);
    this.physics.add.existing(ball);
    ball.body.setCollideWorldBounds(true);
    /*
    setBounce(1, 1) in Phaser matches the coefficient of restitution (COR) in physics.
    What is Coefficient of Restitution (COR)?
    It measures how bouncy a collision is — how much energy is kept after a bounce:
    Ball Type                       Approx. COR
    Superball (bouncy ball)         0.9–0.95
    Basketball                      ~0.75
    Tennis ball                     0.5
    */
    ball.body.setBounce(0.75, .75);

    // Give ball a random starting velocity
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.Between(150, 200);
    ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Enable ball-wall collisions
    walls.forEach(wall => {
        this.physics.add.collider(ball, wall);
    });

    // Touch swipe input logic
    let startX = 0;
    let startY = 0;

    this.touchCount = 0;

    // On touch start
    this.input.on('pointerdown', (pointer) => {
        startX = pointer.x;
        startY = pointer.y;
    });

    // On touch release (swipe)
    this.input.on('pointerup', (pointer) => {
        const endX = pointer.x;
        const endY = pointer.y;

        const dx = endX - startX;
        const dy = endY - startY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 10) { // ignore small taps
            let factor = Phaser.Math.Clamp(distance / 50, 1, 6); // dynamic factor based on swipe strength
            const vx = dx * factor;
            const vy = dy * factor;

            ball.body.setVelocity(vx, vy);

            this.touchCount++;
            console.log(`Touches: ${this.touchCount}`);
        }
    });
}


function update() {
    if (ball.y > 600 - 20 && ball.x > outletX && ball.x < outletX + outletWidth) {
        console.log("YOU WIN!");
        this.scene.pause(); // or trigger game over logic
    }
}


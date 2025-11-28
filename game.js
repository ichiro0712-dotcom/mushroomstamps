// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 360, // 600 * 0.6
    height: 480, // 800 * 0.6
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0.6 },
            debug: false,
            setBounds: {
                left: true,
                right: true,
                top: false,
                bottom: true
            }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    transparent: true
};

let game;
let currentMushroom = null;
let nextMushroomType = 0;
let canDrop = true;
let score = 0;
let isGameOver = false;

// Mushroom Types (Size and Image)
// Order: Enoki -> Shimeji -> Shiitake -> Eringi -> Matsutake -> Kikurage
// Mushroom Types (Size and Image)
// Source images are 1024x1024.
// Radius should be (1024 * scale) / 2
const MUSHROOMS = [
    { type: 'enoki', scale: 40 / 1024, score: 10, radius: 20 },    // 40px dia
    { type: 'shimeji', scale: 50 / 1024, score: 20, radius: 25 },  // 50px dia
    { type: 'shiitake', scale: 80 / 1024, score: 40, radius: 40 }, // 80px dia
    { type: 'eringi', scale: 100 / 1024, score: 80, radius: 50 },   // 100px dia
    { type: 'matsutake', scale: 150 / 1024, score: 160, radius: 75 }, // 150px dia
    { type: 'kikurage', scale: 220 / 1024, score: 320, radius: 110 }, // 220px dia
    { type: 'mushroomstamps', scale: 260 / 1024, score: 640, radius: 130 } // 260px dia
];

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', startGame);
    }
});

let loadingInterval;

let nextMushroomIndex = 0;
let bgm;

function startGame(e) {
    if (e) e.preventDefault();

    // Hide UI elements immediately
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');

    // Show HUD elements
    const scoreDisplay = document.getElementById('score-display');
    const nextDisplay = document.getElementById('next-display');
    if (scoreDisplay) scoreDisplay.style.display = 'block';
    if (nextDisplay) nextDisplay.style.display = 'block';

    if (startScreen) {
        startScreen.style.display = 'none';
    } else {
        // Start screen element not found!
    }

    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }

    if (loadingScreen) {
        loadingScreen.style.display = 'flex'; // Ensure flex for centering
        if (loadingProgress) loadingProgress.innerText = '0%';
    }

    // Fake loading progress: 0% to 99% over 10 seconds
    if (loadingInterval) clearInterval(loadingInterval);
    let progress = 0;
    loadingInterval = setInterval(() => {
        progress++;
        if (progress > 99) {
            progress = 99;
            clearInterval(loadingInterval);
        }
        if (loadingProgress) {
            loadingProgress.innerText = progress + '%';
        }
    }, 100); // 100ms * 100 steps = 10000ms = 10s

    // Initialize next mushroom randomly
    nextMushroomIndex = Math.floor(Math.random() * 3); // 0, 1, or 2

    // Small delay to allow UI to update before heavy lifting (optional, but good for perceived performance)
    setTimeout(() => {
        if (game) {
            game.destroy(true);
        }
        game = new Phaser.Game(config);
        score = 0;
        updateScore(0);
        isGameOver = false;
    }, 50);
}

function preload() {
    // Real loading progress (optional, can override fake if needed, but user asked for fake)
    // We'll let the fake one run until create() is called to ensure it looks active.
    // Or we can sync them? Let's just stick to the fake one as requested.

    // Cache busting with timestamp
    const v = Date.now();
    this.load.image('bg', `img/bg.png?v=${v}`);
    this.load.image('enoki', `img/enoki_ball.png?v=${v}`);
    this.load.image('shimeji', `img/shimeji_ball.png?v=${v}`);
    this.load.image('shiitake', `img/shiitake_ball.png?v=${v}`);
    this.load.image('eringi', `img/eringi_ball.png?v=${v}`);
    this.load.image('matsutake', `img/matsutake_ball.png?v=${v}`);
    this.load.image('kikurage', `img/kikurage_ball.png?v=${v}`);
    this.load.image('mushroomstamps', `img/mushroomstamps_ball.png?v=${v}`);

    // Load BGM
    this.load.audio('bgm', 'bgm/game01.mp3');
}

function create() {
    // Clear fake loading interval
    if (loadingInterval) clearInterval(loadingInterval);

    // Show 100% briefly then hide
    const loadingProgress = document.getElementById('loading-progress');
    if (loadingProgress) loadingProgress.innerText = '100%';

    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        // Slight delay to show 100%
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 200);
    }

    // Background
    this.add.image(180, 240, 'bg').setDisplaySize(360, 480);

    // Game Over Zone Indicator (Semi-transparent black at top)
    // Height 100px to match the game over line check
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRect(0, 0, 360, 100);

    // Optional: Add a line to make it clear
    graphics.lineStyle(2, 0xff0000, 0.5);
    graphics.beginPath();
    graphics.moveTo(0, 100);
    graphics.lineTo(360, 100);
    graphics.strokePath();

    // Play BGM
    if (this.sound.get('bgm')) {
        this.sound.stopAll(); // Stop previous if any
    }
    bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    bgm.play();

    // Walls
    // Ensure bounds are set correctly for the new size. 
    // Reduced height to 476 to ensure floor is visible and mushrooms don't look cut off.
    // 480px total height - 2px top border - 2px bottom border = ~476px internal height
    this.matter.world.setBounds(0, 0, 360, 476, 30, true, true, false, true);

    // Input
    this.input.on('pointermove', (pointer) => {
        if (currentMushroom && canDrop && !isGameOver) {
            let x = Phaser.Math.Clamp(pointer.x, 30, 330);
            currentMushroom.x = x;
        }
    });

    this.input.on('pointerdown', (pointer) => {
        if (currentMushroom && canDrop && !isGameOver) {
            dropMushroom(this);
        }
    });

    // Collision Event for Merging
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            if (bodyA.gameObject && bodyB.gameObject) {
                const objA = bodyA.gameObject;
                const objB = bodyB.gameObject;

                if (objA.mushroomType !== undefined && objA.mushroomType === objB.mushroomType) {
                    // Check if they are not already processed (to avoid double merge)
                    if (objA.active && objB.active) {
                        mergeMushrooms(this, objA, objB);
                    }
                }
            }
        });
    });

    // Initial Spawn
    spawnNextMushroom(this);
}

function update() {
    if (isGameOver) return;

    // Game Over Check
    // Check if any mushroom (not the current dropper) is above the line
    // We can check physics bodies
    const bodies = this.matter.world.localWorld.bodies;
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        // Ignore walls (static) and the current dropping mushroom (which isn't a body yet anyway)
        if (!body.isStatic && body.gameObject && body.gameObject.active) {
            // If it's settled and high up
            if (body.position.y < 100 && Math.abs(body.velocity.y) < 0.1 && Math.abs(body.velocity.x) < 0.1) {
                gameOver();
                break;
            }
        }
    }
}

function gameOver() {
    isGameOver = true;
    console.log("Game Over");

    // Stop BGM
    if (bgm) {
        bgm.stop();
    }

    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
        checkHighScore();
    }
}

function getHighScores() {
    const stored = localStorage.getItem('mushroomHighScores');
    return stored ? JSON.parse(stored) : [];
}

function saveHighScore(name, score) {
    const scores = getHighScores();
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    const top5 = scores.slice(0, 5);
    localStorage.setItem('mushroomHighScores', JSON.stringify(top5));
    displayHighScores(); // Refresh display if needed
}

function checkHighScore() {
    const scores = getHighScores();
    const isHighScore = scores.length < 5 || score > scores[scores.length - 1].score;

    const inputContainer = document.getElementById('high-score-input-container');
    if (isHighScore) {
        if (inputContainer) inputContainer.style.display = 'block';
    } else {
        if (inputContainer) inputContainer.style.display = 'none';
    }
}

function submitHighScore() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || 'Anonymous';
    saveHighScore(name, score);

    // Hide input after saving
    const inputContainer = document.getElementById('high-score-input-container');
    if (inputContainer) inputContainer.style.display = 'none';

    // Optionally update the high score list display on game over screen if we want to show it there too
    // For now, just ensuring it's saved for the start screen.
}

function displayHighScores() {
    const list = document.getElementById('high-score-list');
    if (!list) return;

    const scores = getHighScores();
    list.innerHTML = '<h4>HIGH SCORES</h4>';
    if (scores.length === 0) {
        list.innerHTML += '<p>No scores yet</p>';
        return;
    }

    const ol = document.createElement('ol');
    scores.forEach(s => {
        const li = document.createElement('li');
        li.innerText = `${s.name}: ${s.score}`;
        ol.appendChild(li);
    });
    list.appendChild(ol);
}

// Call this on load
document.addEventListener('DOMContentLoaded', displayHighScores);

function spawnNextMushroom(scene) {
    if (isGameOver) return;

    // Use the queued next mushroom
    let typeIndex = nextMushroomIndex;
    let data = MUSHROOMS[typeIndex];

    // Generate NEW next mushroom for the queue
    nextMushroomIndex = Phaser.Math.Between(0, 2);
    let nextData = MUSHROOMS[nextMushroomIndex];

    // Update UI with the FUTURE mushroom
    const nextImg = document.getElementById('next-img');
    if (nextImg) {
        nextImg.src = `img/${nextData.type}_ball.png`;
        nextImg.style.width = '30px'; // Scaled down
        nextImg.style.height = '30px';
    }

    // Create a "ghost" or holding mushroom at top (CURRENT mushroom)
    currentMushroom = scene.add.image(180, 30, data.type);
    currentMushroom.setScale(data.scale);
    currentMushroom.mushroomType = typeIndex;
    currentMushroom.setAlpha(0.8);

    canDrop = true;
}

function dropMushroom(scene) {
    canDrop = false;
    let x = currentMushroom.x;
    let y = currentMushroom.y;
    let typeIndex = currentMushroom.mushroomType;
    let data = MUSHROOMS[typeIndex];

    currentMushroom.destroy();

    // Create physical mushroom
    let mushroom = scene.matter.add.image(x, y, data.type, null, {
        shape: 'circle',
        restitution: 0.3,
        friction: 0.1,
        density: 0.01
    });
    mushroom.setScale(data.scale);
    mushroom.setCircle(data.radius); // Radius is now pre-calculated pixels
    mushroom.mushroomType = typeIndex;

    // Wait a bit before spawning next
    scene.time.delayedCall(1000, () => {
        spawnNextMushroom(scene);
    });
}

function mergeMushrooms(scene, objA, objB) {
    let typeIndex = objA.mushroomType;

    // If max level, just destroy or maybe keep? Suika usually stops or disappears.
    // Let's say max level disappears for bonus score or stays.
    // If not max level:
    if (typeIndex < MUSHROOMS.length - 1) {
        let newTypeIndex = typeIndex + 1;
        let data = MUSHROOMS[newTypeIndex];

        // Midpoint
        let x = (objA.x + objB.x) / 2;
        let y = (objA.y + objB.y) / 2;

        objA.destroy();
        objB.destroy();

        // Create new larger mushroom
        let newMushroom = scene.matter.add.image(x, y, data.type, null, {
            shape: 'circle',
            restitution: 0.3,
            friction: 0.1
        });
        newMushroom.setScale(data.scale);
        newMushroom.setCircle(data.radius);
        newMushroom.mushroomType = newTypeIndex;

        // Add score
        score += data.score;
        updateScore(score);

        // Effects?
    } else {
        // Max level merge (MushroomStamps) - DO NOT DESTROY
        // Just add score?
        // objA.destroy();
        // objB.destroy();
        // The user specifically asked: "MushroomStamps is the last one, so nothing happens if two stick together"
        // So we do NOTHING to the bodies. They just bounce off each other.
    }
}

function updateScore(val) {
    const el = document.getElementById('current-score');
    if (el) el.innerText = val;
    const finalEl = document.getElementById('final-score');
    if (finalEl) finalEl.innerText = val;
}

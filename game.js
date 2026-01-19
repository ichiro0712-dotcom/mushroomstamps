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
    transparent: true // Allow HTML background to show through
};

let game;
let currentMushroom = null;
let nextMushroomType = 0;
let canDrop = true;
let score = 0;
let isGameOver = false;

// Mushroom Types (Size and Image)
// Order: Shimeji -> Enoki -> Shiitake -> Eringi -> Matsutake -> Logo
// Source images are assumed to be roughly square (e.g. 1024x1024).
// Radii are calculated dynamically based on the image size * scale.
const MUSHROOMS = [
    { type: 'shimeji_new', scale: 0.05, score: 10 },    // Smallest (Reduced)
    { type: 'enoki_new', scale: 0.08, score: 20 },      // Reduced
    { type: 'shiitake_new', scale: 0.11, score: 40 },
    { type: 'kikurage_new', scale: 0.16, score: 60 },
    { type: 'eringi_new', scale: 0.22, score: 80 },
    { type: 'matsutake_new', scale: 0.30, score: 160 },
    { type: 'logo_new', scale: 0.33, score: 320 }       // Largest (Increased by ~30%)
];

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
    const endBtn = document.getElementById('end-btn');
    if (endBtn) endBtn.style.display = 'block';

    if (startScreen) {
        startScreen.style.display = 'none';
    }

    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }

    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        if (loadingProgress) loadingProgress.innerText = '0%';
    }

    // Fake loading progress
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
    }, 100);

    // Initialize next mushroom randomly (0-2)
    nextMushroomIndex = Math.floor(Math.random() * 3);

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
    this.load.image('shimeji_new', 'img/shimeji_new.png');
    this.load.image('enoki_new', 'img/enoki_new.png');
    this.load.image('shiitake_new', 'img/shiitake_new.png');
    this.load.image('kikurage_new', 'img/kikurage_new.png');
    this.load.image('eringi_new', 'img/eringi_new.png');
    this.load.image('matsutake_new', 'img/matsutake_new.png');
    this.load.image('logo_new', 'img/logo_new.png');

    this.load.audio('bgm', 'bgm/game01.mp3');
}

function create() {
    if (loadingInterval) clearInterval(loadingInterval);

    const loadingProgress = document.getElementById('loading-progress');
    if (loadingProgress) loadingProgress.innerText = '100%';

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 200);
    }

    // Game Over Zone
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRect(0, 0, 360, 100);

    graphics.lineStyle(2, 0xff0000, 0.5);
    graphics.beginPath();
    graphics.moveTo(0, 100);
    graphics.lineTo(360, 100);
    graphics.strokePath();

    if (this.sound.get('bgm')) {
        this.sound.stopAll();
    }
    bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    bgm.play();

    // ... inside create ...
    // Background Logo (Centered, Dark Gray equivalent via tint or alpha)
    // Using alpha to make it subtle. User asked for "dark gray". 
    // Since background is black, a white logo with low alpha looks gray.
    // Or we can tint it.
    // Walls
    this.matter.world.setBounds(0, 0, 360, 476, 30, true, true, false, true);

    // ... existing code ...

    function endGame() {
        if (isGameOver) return;
        gameOver();
    }
    // Expose for HTML button
    window.endGame = endGame;

    // ... existing functions ...

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

    // Collision Event
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            if (bodyA.gameObject && bodyB.gameObject) {
                const objA = bodyA.gameObject;
                const objB = bodyB.gameObject;

                if (objA.mushroomType !== undefined && objA.mushroomType === objB.mushroomType) {
                    if (objA.active && objB.active) {
                        mergeMushrooms(this, objA, objB);
                    }
                }
            }
        });
    });

    spawnNextMushroom(this);
}

function update() {
    if (isGameOver) return;

    // Game Over Check
    const bodies = this.matter.world.localWorld.bodies;
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body.isStatic && body.gameObject && body.gameObject.active) {
            if (body.position.y < 100 && Math.abs(body.velocity.y) < 0.1 && Math.abs(body.velocity.x) < 0.1) {
                gameOver();
                break;
            }
        }
    }
}

function gameOver() {
    isGameOver = true;
    if (bgm) bgm.stop();

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
    displayHighScores();
}

function checkHighScore() {
    const scores = getHighScores();
    const isHighScore = scores.length < 5 || score > scores[scores.length - 1].score;

    const inputContainer = document.getElementById('high-score-input-container');
    if (isHighScore && inputContainer) {
        inputContainer.style.display = 'block';
    } else if (inputContainer) {
        inputContainer.style.display = 'none';
    }
}

function submitHighScore() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || 'Anonymous';
    saveHighScore(name, score);

    const inputContainer = document.getElementById('high-score-input-container');
    if (inputContainer) inputContainer.style.display = 'none';
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

document.addEventListener('DOMContentLoaded', displayHighScores);

function spawnNextMushroom(scene) {
    if (isGameOver) return;

    let typeIndex = nextMushroomIndex;
    let data = MUSHROOMS[typeIndex];

    nextMushroomIndex = Phaser.Math.Between(0, 2);
    let nextData = MUSHROOMS[nextMushroomIndex];

    const nextImg = document.getElementById('next-img');
    if (nextImg) {
        nextImg.src = `img/${nextData.type}.png`;
        nextImg.style.width = '30px';
        nextImg.style.height = 'auto';
        nextImg.style.objectFit = 'contain';
    }

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

    let mushroom = scene.matter.add.image(x, y, data.type, null, {
        shape: 'circle',
        restitution: 0.3,
        friction: 0.1,
        density: 0.01
    });
    mushroom.setScale(data.scale);

    // Dynamic radius
    let radius = (Math.min(mushroom.width, mushroom.height) * data.scale) / 2;
    mushroom.setCircle(radius);
    mushroom.mushroomType = typeIndex;

    scene.time.delayedCall(1000, () => {
        spawnNextMushroom(scene);
    });
}

function mergeMushrooms(scene, objA, objB) {
    let typeIndex = objA.mushroomType;

    if (typeIndex < MUSHROOMS.length - 1) {
        let newTypeIndex = typeIndex + 1;
        let data = MUSHROOMS[newTypeIndex];

        let x = (objA.x + objB.x) / 2;
        let y = (objA.y + objB.y) / 2;

        objA.destroy();
        objB.destroy();

        let newMushroom = scene.matter.add.image(x, y, data.type, null, {
            shape: 'circle',
            restitution: 0.3,
            friction: 0.1
        });
        newMushroom.setScale(data.scale);

        // Dynamic radius
        let radius = (Math.min(newMushroom.width, newMushroom.height) * data.scale) / 2;
        newMushroom.setCircle(radius);
        newMushroom.mushroomType = newTypeIndex;

        score += data.score;
        updateScore(score);
    }
}

function updateScore(val) {
    const el = document.getElementById('current-score');
    if (el) el.innerText = val;
    const finalEl = document.getElementById('final-score');
    if (finalEl) finalEl.innerText = val;
}

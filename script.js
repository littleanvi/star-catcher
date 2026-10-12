//  HTML elements 
const game = document.getElementById("game");
const basket = document.getElementById("basket");

const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const bestDisplay = document.getElementById("best");

const startButton = document.getElementById("start");
const restartButton = document.getElementById("restart");
const message = document.getElementById("message");

//  Game variables 
let score = 0;
let best = 0;
let timeLeft = 30;
let basketPosition = 50;

let gameState = "ready";
// Possible states: ready, running, paused, ended

let objects = [];
let animationFrame = null;
let gameTimer = null;

let lastFrame = 0;
let spawnElapsed = 0;

let draggingBasket = false;
let activePointerId = null;

// Load saved best score
try {
    best = Number(localStorage.getItem("starCatcherBest")) || 0;
} catch (error) {
    best = 0;
}

//  Update display 
function updateDisplay() {
    scoreDisplay.textContent = score;
    timeDisplay.textContent = timeLeft;
    bestDisplay.textContent = best;
    basket.style.left = basketPosition + "%";
}

//  Update control buttons 
function updateControls() {
    if (gameState === "ready") {
        startButton.textContent = "▶ Start Game";
        startButton.hidden = false;
        restartButton.hidden = true;

    } else if (gameState === "running") {
        startButton.textContent = "⏸ Pause";
        startButton.hidden = false;
        restartButton.hidden = false;

    } else if (gameState === "paused") {
        startButton.textContent = "▶ Resume";
        startButton.hidden = false;
        restartButton.hidden = false;

    } else {
        // After time's up
        startButton.textContent = "▶ Start Game";
        startButton.hidden = false;
        restartButton.hidden = false;
    }
}

//  Basket movement 
function moveBasket(direction) {
    if (gameState !== "running") return;

    basketPosition += direction * 5;
    basketPosition = Math.max(5, Math.min(95, basketPosition));

    basket.style.left = basketPosition + "%";
}

// Keyboard controls
document.addEventListener("keydown", function(event) {
    if (gameState !== "running") return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        moveBasket(event.key === "ArrowLeft" ? -1 : 1);
    }
});

// Touch and drag controls
function moveBasketToTouch(event) {
    if (gameState !== "running") return;

    const rect = game.getBoundingClientRect();
    const percentage = ((event.clientX - rect.left) / rect.width) * 100;

    basketPosition = Math.max(5, Math.min(95, percentage));
    basket.style.left = basketPosition + "%";
}

game.addEventListener("pointerdown", function(event) {
    if (gameState !== "running") return;
    if (event.target.closest("button")) return;

    draggingBasket = true;
    activePointerId = event.pointerId;

    game.setPointerCapture(event.pointerId);
    moveBasketToTouch(event);
});

game.addEventListener("pointermove", function(event) {
    if (!draggingBasket || event.pointerId !== activePointerId) return;
    moveBasketToTouch(event);
});

function stopDragging(event) {
    if (event.pointerId !== activePointerId) return;

    draggingBasket = false;
    activePointerId = null;
}

game.addEventListener("pointerup", stopDragging);
game.addEventListener("pointercancel", stopDragging);

//  Create falling stars and bombs 
function createObject() {
    if (gameState !== "running") return;

    const element = document.createElement("div");
    const isBomb = Math.random() < 0.2;

    element.className = "falling-object";
    element.textContent = isBomb ? "💣" : "⭐";

    const startX = 5 + Math.random() * 90;

    element.style.left = startX + "%";
    element.style.top = "-35px";

    game.appendChild(element);

    objects.push({
        element: element,
        y: -35,
        speed: 100 + Math.random() * 65,
        isBomb: isBomb
    });
}

//  Remove falling object 
function removeObject(index) {
    objects[index].element.remove();
    objects.splice(index, 1);
}

function clearObjects() {
    objects.forEach(function(object) {
        object.element.remove();
    });

    objects = [];
}

//  Save best score 
function saveBestScore() {
    if (score > best) {
        best = score;

        try {
            localStorage.setItem("starCatcherBest", best);
        } catch (error) {
            // The game remains playable if saving is unavailable.
        }
    }
}

//  Update objects and detect collisions 
function updateObjects(deltaTime) {
    const gameRect = game.getBoundingClientRect();
    const basketRect = basket.getBoundingClientRect();

    for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];

        object.y += object.speed * deltaTime;
        object.element.style.top = object.y + "px";

        const objectRect = object.element.getBoundingClientRect();

        const collision =
            objectRect.bottom >= basketRect.top &&
            objectRect.top <= basketRect.bottom &&
            objectRect.right >= basketRect.left &&
            objectRect.left <= basketRect.right;

        if (collision) {
            score = Math.max(0, score + (object.isBomb ? -2 : 1));

            saveBestScore();
            updateDisplay();
            removeObject(i);
            continue;
        }

        if (object.y > gameRect.height) {
            removeObject(i);
        }
    }
}

//  Main animation loop 
function gameLoop(timestamp) {
    if (gameState !== "running") return;

    if (lastFrame === 0) {
        lastFrame = timestamp;
    }

    const deltaTime = Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;

    spawnElapsed += deltaTime;

    if (spawnElapsed >= 0.65) {
        createObject();
        spawnElapsed = 0;
    }

    updateObjects(deltaTime);

    if (gameState === "running") {
        animationFrame = requestAnimationFrame(gameLoop);
    }
}

//  Timer 
function startTimer() {
    clearInterval(gameTimer);

    gameTimer = setInterval(function() {
        if (gameState !== "running") return;

        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

//  Pause game 
function pauseGame() {
    if (gameState !== "running") return;

    gameState = "paused";

    clearInterval(gameTimer);

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    draggingBasket = false;
    activePointerId = null;

    updateControls();
    message.textContent = "⏸ Game paused. Click Resume when you're ready.";
}

//  Resume game 
function resumeGame() {
    if (gameState !== "paused") return;

    gameState = "running";
    lastFrame = 0;

    updateControls();
    message.textContent = "⭐ Catch stars and avoid bombs!";

    startTimer();
    animationFrame = requestAnimationFrame(gameLoop);
}

//  End game 
function endGame() {
    if (gameState !== "running") return;

    gameState = "ended";

    clearInterval(gameTimer);

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    clearObjects();

    draggingBasket = false;
    activePointerId = null;

    updateControls();

    message.textContent = "⏰ Time's up! Your final score: " + score;
}

//  Start a fresh game 
function startGame() {
    clearInterval(gameTimer);

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    clearObjects();

    score = 0;
    timeLeft = 30;
    basketPosition = 50;

    lastFrame = 0;
    spawnElapsed = 0;

    draggingBasket = false;
    activePointerId = null;

    gameState = "running";

    updateDisplay();
    updateControls();

    message.textContent = "⭐ Catch stars (+1) and avoid bombs (-2)!";

    startTimer();
    animationFrame = requestAnimationFrame(gameLoop);
}

//  Start/Pause/Resume button 
startButton.addEventListener("click", function() {
    if (gameState === "running") {
        pauseGame();
    } else if (gameState === "paused") {
        resumeGame();
    } else {
        startGame();
    }
});

//  Separate Restart button 
restartButton.addEventListener("click", function() {
    startGame();
});

//  Initial setup 
updateDisplay();
updateControls();
let move_speed = 3, grativy = 0.5;
let bird = document.querySelector('.bird');
let img = document.getElementById('bird-1');
let sound_point = new Audio('sounds effect/point.mp3');
let sound_die = new Audio('sounds effect/die.mp3');

// getting bird element properties
let bird_props = bird.getBoundingClientRect();

// This method returns DOMReact -> top, right, bottom, left, x, y, width and height
let background = document.querySelector('.background').getBoundingClientRect();

let score_val = document.querySelector('.score_val');
let message = document.querySelector('.message');
let score_title = document.querySelector('.score_title');

let game_state = 'Start';
img.style.display = 'none';
message.classList.add('messageStyle');

document.addEventListener('keydown', (e) => {

    if (e.key == 'Enter' && game_state != 'Play') {
        document.querySelectorAll('.pipe_sprite').forEach((e) => {
            e.remove();
        });
        img.style.display = 'block';
        bird.style.top = '40vh';
        game_state = 'Play';
        message.innerHTML = '';
        score_title.innerHTML = '𝓢𝓬𝓸𝓻𝓮 :- ';
        score_val.innerHTML = '0';
        message.classList.remove('messageStyle');
        play();
    }
});

function play() {
    function move() {
        if (game_state != 'Play') return;

        let pipe_sprite = document.querySelectorAll('.pipe_sprite');
        pipe_sprite.forEach((element) => {
            let pipe_sprite_props = element.getBoundingClientRect();
            bird_props = bird.getBoundingClientRect();

            if (pipe_sprite_props.right <= 0) {
                element.remove();
            } else {
                if (bird_props.left < pipe_sprite_props.left + pipe_sprite_props.width && bird_props.left + bird_props.width > pipe_sprite_props.left && bird_props.top < pipe_sprite_props.top + pipe_sprite_props.height && bird_props.top + bird_props.height > pipe_sprite_props.top) {
                    game_state = 'End';
                    /*message.innerHTML ='𝓖𝓪𝓶𝓮 𝓞𝓿𝓮𝓻 ',fontcolor('red') + '<br>Press Enter To Restart';*/
                    message.innerHTML = '<span style="color: blue;">𝓖𝓪𝓶𝓮 𝓞𝓿𝓮𝓻</span> &#128517;<br>𝓟𝓻𝓮𝓼𝓼 𝓔𝓷𝓽𝓮𝓻 𝓣𝓸 𝓡𝓮𝓼𝓽𝓪𝓻𝓽';
                    message.classList.add('messageStyle');
                    img.style.display = 'none';
                    sound_die.play();
                    return;
                } else {
                    if (pipe_sprite_props.right < bird_props.left && pipe_sprite_props.right + move_speed >= bird_props.left && element.increase_score == '1') {
                        score_val.innerHTML = + score_val.innerHTML + 1;
                        sound_point.play();
                    }
                    element.style.left = pipe_sprite_props.left - move_speed + 'px';
                }
            }
        });
        requestAnimationFrame(move);
    }
    requestAnimationFrame(move);

    let bird_dy = 0;
    function apply_gravity() {
        if (game_state != 'Play') return;
        bird_dy = bird_dy + grativy;
        document.addEventListener('keydown', (e) => {
            if (e.key == 'ArrowUp' || e.key == ' ') {
                img.src = 'Bird-2.png';
                bird_dy = -7.6;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key == 'ArrowUp' || e.key == ' ') {
                img.src = 'Bird.png';
            }
        });

        if (bird_props.top <= 0 || bird_props.bottom >= background.bottom) {
            game_state = 'End';
            message.style.left = '28vw';
            window.location.reload();
            message.classList.remove('messageStyle');
            return;
        }
        bird.style.top = bird_props.top + bird_dy + 'px';
        bird_props = bird.getBoundingClientRect();
        requestAnimationFrame(apply_gravity);
    }
    requestAnimationFrame(apply_gravity);

    let pipe_seperation = 0;

    let pipe_gap = 35;

    function create_pipe() {
        if (game_state != 'Play') return;

        if (pipe_seperation > 115) {
            pipe_seperation = 0;

            let pipe_posi = Math.floor(Math.random() * 43) + 8;
            let pipe_sprite_inv = document.createElement('div');
            pipe_sprite_inv.className = 'pipe_sprite';
            pipe_sprite_inv.style.top = pipe_posi - 70 + 'vh';
            pipe_sprite_inv.style.left = '100vw';

            document.body.appendChild(pipe_sprite_inv);
            let pipe_sprite = document.createElement('div');
            pipe_sprite.className = 'pipe_sprite';
            pipe_sprite.style.top = pipe_posi + pipe_gap + 'vh';
            pipe_sprite.style.left = '100vw';
            pipe_sprite.increase_score = '1';

            document.body.appendChild(pipe_sprite);
        }
        pipe_seperation++;
        requestAnimationFrame(create_pipe);
    }
    requestAnimationFrame(create_pipe);
}


let bg = document.querySelector(".background");
let posX = 0;

function moveBackground() {
    posX -= 1; // Speed of background movement
    bg.style.backgroundPositionX = posX + "px";
    requestAnimationFrame(moveBackground);
}
// Mobile controls
const jumpBtn = document.getElementById('jump-btn');

jumpBtn.addEventListener('touchstart', () => {
    if (game_state === 'Play') {
        img.src = 'Bird-2.png';
        bird_dy = -7.6;
    }
});

jumpBtn.addEventListener('touchend', () => {
    if (game_state === 'Play') {
        setTimeout(() => {
            img.src = 'Bird.png';
        }, 200);
    }
});


document.getElementById('start-btn').addEventListener('click', () => {
    if (game_state !== 'Play') {
        document.querySelectorAll('.pipe_sprite').forEach((e) => e.remove());
        img.style.display = 'block';
        bird.style.top = '40vh';
        game_state = 'Play';
        message.innerHTML = '';
        score_title.innerHTML = '𝓢𝓬𝓸𝓻𝓮 :- ';
        score_val.innerHTML = '0';
        message.classList.remove('messageStyle');
        play();
    }
});
document.querySelectorAll('.mobile-controls button').forEach(btn => {
    btn.addEventListener('touchstart', e => {
        e.preventDefault();
    }, { passive: false });
});


//mobile control
document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn");
    const jumpBtn = document.getElementById("jump-btn");

    // Simulate "Enter" key press
    startBtn?.addEventListener("click", () => {
        const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
        document.dispatchEvent(enterEvent);
    });

    // Simulate "ArrowUp" key press
    jumpBtn?.addEventListener("click", () => {
        const arrowUpEvent = new KeyboardEvent("keydown", { key: "ArrowUp" });
        document.dispatchEvent(arrowUpEvent);
    });
});

function startGame() {
    console.log("Game Started"); // Replace with your actual start game logic
}

function jump() {
    console.log("Jumped"); // Replace with your actual jump logic
}

document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn");
    const jumpBtn = document.getElementById("jump-btn");

    // Button click listeners (Mobile + Desktop)
    startBtn?.addEventListener("click", startGame);
    jumpBtn?.addEventListener("click", jump);

    // Keyboard support (Desktop only)
    document.addEventListener("keydown", (event) => {
        // Optional: log the key
        console.log("Key pressed:", event.key);

        if (event.key === "Enter") {
            event.preventDefault();
            startGame();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            jump();
        }
    });
});

moveBackground(); // Start moving background


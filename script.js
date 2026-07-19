

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');

/* ─ Resize */
let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

/* ─ Constants  */
const GRAVITY       = 0.40;
const JUMP_FORCE    = -7.4;
const PIPE_W        = 74;
const PIPE_GAP_MIN  = 0.24;   // fraction of H
const PIPE_GAP_MAX  = 0.30;
const PIPE_SPEED    = 2.8;
const PIPE_INTERVAL = 88;     // frames between pipes
const BIRD_X_FRAC   = 0.22;   // bird horizontal position
const BIRD_SCALE     = 1.4;   // bird render scale (bigger bird)
const BIRD_HIT_R     = 13 * BIRD_SCALE; // collision radius scales with the bird

/* Pipe colour palette (6 × 3D ramps)  */
const PIPE_PALETTES = [
  { dark:'#155724', mid:'#1e7e34', light:'#28a745', cap:'#34d058', shine:'#5ae679' },
  { dark:'#0d47a1', mid:'#1565c0', light:'#1976d2', cap:'#2196f3', shine:'#64b5f6' },
  { dark:'#4a148c', mid:'#6a1b9a', light:'#8e24aa', cap:'#ab47bc', shine:'#ce93d8' },
  { dark:'#7f2e0a', mid:'#bf360c', light:'#e64a19', cap:'#ff7043', shine:'#ffb74d' },
  { dark:'#004d40', mid:'#00695c', light:'#00897b', cap:'#26a69a', shine:'#80cbc4' },
  { dark:'#560526', mid:'#880e4f', light:'#c2185b', cap:'#e91e63', shine:'#f48fb1' },
];


const BG_THEMES = [
  { h1: 220, h2: 250, h3: 160 }, // deep blue night
  { h1: 280, h2: 320, h3: 200 }, // purple twilight
  { h1: 10,  h2: 30,  h3: 165 }, // sunset orange
  { h1: 170, h2: 195, h3: 120 }, // teal aurora
  { h1: 335, h2: 5,   h3: 160 }, // magenta dusk
  { h1: 45,  h2: 75,  h3: 130 }, // golden dawn
];
const BG_THEME_DURATION = 3000; // ms — background colour changes every 2s
let bgThemeIdx   = 0;
let bgThemeStart = Date.now();

function lerpHue(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/* ── Parallax depth layers (mountains + clouds) for a 3D sense of depth ── */
let mountains = [];
let clouds    = [];
(function buildParallax() {
  for (let i = 0; i < 9; i++) {
    mountains.push({
      x: Math.random() * 2400,
      w: 180 + Math.random() * 220,
      h: 60 + Math.random() * 90
    });
  }
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * 2400,
      y: 0.08 + Math.random() * 0.28,
      w: 70 + Math.random() * 90,
      a: 0.05 + Math.random() * 0.08
    });
  }
})();

/* State  */
let state       = 'menu';   // 'menu' | 'play' | 'over'
let score       = 0;
let bestScore   = 0;
let frame       = 0;
let pipeTimer   = 0;
let colorIdx    = 0;
let pipes       = [];
let particles   = [];
let stars       = [];
let bgOffset    = 0;

let birdY   = 0;
let birdVY  = 0;
let birdRot = 0;

/*  DOM refs  */
const scoreNum  = document.getElementById('score-num');
const bestNum   = document.getElementById('best-num');
const overlay   = document.getElementById('overlay');
const finalBlock= document.getElementById('final-block');
const finalScore= document.getElementById('final-score');
const medalIcon = document.getElementById('medal-icon');
const startBtn  = document.getElementById('start-btn');

/*  STARS */
(function buildStars() {
  for (let i = 0; i < 140; i++) {
    stars.push({
      x:  Math.random() * 4000,
      y:  Math.random(),
      r:  Math.random() * 1.4 + 0.3,
      t:  Math.random() * Math.PI * 2,
      sp: Math.random() * 0.025 + 0.008
    });
  }
})();

/*  GAME FLOW */
function startGame() {
  state     = 'play';
  score     = 0;
  pipes     = [];
  particles = [];
  colorIdx  = 0;
  pipeTimer = 0;
  frame     = 0;
  birdY     = H * 0.42;
  birdVY    = 0;
  birdRot   = 0;

  scoreNum.textContent = '0';
  overlay.classList.add('hidden');
  finalBlock.classList.add('hidden');
  medalIcon.textContent = '';
}

function endGame() {
  state = 'over';

  if (score > bestScore) {
    bestScore = score;
    bestNum.textContent = bestScore;
  }

  finalScore.textContent = score;
  finalBlock.classList.remove('hidden');

  let medal = '';
  if      (score >= 100) medal = '🏆';
  else if (score >= 80) medal = '🥇';
  else if (score >= 50) medal = '🥈';
  else if (score >= 20)  medal = '🥉';
  else                  medal = '💀';
  medalIcon.textContent = medal;

  startBtn.textContent = score > 0 ? '↺ Retry' : '▶ Play';
  overlay.classList.remove('hidden');
}

/*  PARTICLES */
function spawnParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 1,
      r: Math.random() * 3 + 1.5,
      hue: Math.random() * 60 + 20
    });
  }
}

/*  DRAWING UTILITIES */
function roundedRect(x, y, w, h, tl, tr, br, bl) {
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/*  BACKGROUND */
function drawBackground() {
  /* ── Theme cycling: swap to next palette every 2s, cross-fade smoothly ── */
  const now     = Date.now();
  const elapsed = now - bgThemeStart;
  if (elapsed >= BG_THEME_DURATION) {
    bgThemeIdx   = (bgThemeIdx + 1) % BG_THEMES.length;
    bgThemeStart = now;
  }
  const progress  = Math.min(1, (now - bgThemeStart) / BG_THEME_DURATION);
  const ease      = easeInOutQuad(progress);
  const cur       = BG_THEMES[bgThemeIdx];
  const next      = BG_THEMES[(bgThemeIdx + 1) % BG_THEMES.length];
  const hue1 = lerpHue(cur.h1, next.h1, ease);
  const hue2 = lerpHue(cur.h2, next.h2, ease);
  const hue3 = lerpHue(cur.h3, next.h3, ease);

  const tw = Date.now() / 3000; // gentle sparkle wobble, independent of theme swap

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   `hsl(${hue1}, 70%, ${9 + Math.sin(tw) * 3}%)`);
  sky.addColorStop(0.55,`hsl(${hue2}, 55%, ${13 + Math.sin(tw * 0.8) * 3}%)`);
  sky.addColorStop(1,   `hsl(${hue3}, 45%, ${7 + Math.sin(tw) * 2}%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  const scrollX = (bgOffset * 0.3) % W;
  stars.forEach(s => {
    s.t += s.sp;
    const alpha = 0.35 + Math.sin(s.t) * 0.4;
    const sx = ((s.x - scrollX) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.beginPath();
    ctx.arc(sx, s.y * H * 0.75, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
    ctx.fill();
  });

  // Subtle moon / glow
  const moonX = W * 0.82, moonY = H * 0.1;
  const moonG = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 60);
  moonG.addColorStop(0,   'rgba(255,250,220,0.14)');
  moonG.addColorStop(0.4, 'rgba(255,240,180,0.07)');
  moonG.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = moonG;
  ctx.fillRect(moonX - 60, moonY - 60, 120, 120);

  ctx.beginPath();
  ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
  const moonFill = ctx.createRadialGradient(moonX - 5, moonY - 5, 2, moonX, moonY, 18);
  moonFill.addColorStop(0, '#fff9e6');
  moonFill.addColorStop(1, '#d4c97a');
  ctx.fillStyle = moonFill;
  ctx.fill();

  // Drifting clouds (far parallax layer — barely moves, adds depth)
  const cloudScroll = (bgOffset * 0.12) % (W + 400);
  clouds.forEach(c => {
    const cx = ((c.x - cloudScroll) % (W + 400) + W + 400) % (W + 400) - 200;
    const cy = c.y * H;
    ctx.fillStyle = `rgba(255,255,255,${c.a})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.w, c.w * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + c.w * 0.5, cy + 4, c.w * 0.6, c.w * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  const groundH = Math.max(52, H * 0.10);

  // Distant mountain silhouettes (mid parallax layer — moves faster than clouds,
  // slower than pipes, reinforcing a sense of 3D depth)
  const mtnScroll = (bgOffset * 0.45) % (W + 500);
  ctx.fillStyle = `hsla(${hue2}, 35%, 16%, 0.55)`;
  ctx.beginPath();
  ctx.moveTo(-100, H - groundH);
  mountains.forEach(m => {
    const mx = ((m.x - mtnScroll) % (W + 500) + W + 500) % (W + 500) - 250;
    ctx.lineTo(mx, H - groundH - m.h);
    ctx.lineTo(mx + m.w * 0.5, H - groundH - m.h * 0.4);
  });
  ctx.lineTo(W + 100, H - groundH);
  ctx.closePath();
  ctx.fill();

  // Ground
  const gGrad = ctx.createLinearGradient(0, H - groundH, 0, H);
  gGrad.addColorStop(0,   '#2d5a1b');
  gGrad.addColorStop(0.35,'#1a3d0a');
  gGrad.addColorStop(1,   '#0b1f06');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, H - groundH, W, groundH);

  // Ground top highlight strip
  ctx.fillStyle = 'rgba(80,200,60,0.18)';
  ctx.fillRect(0, H - groundH, W, 3);

  // Ground texture — diagonal hatch
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  const gx = bgOffset % 64;
  for (let x = -64 + gx; x < W + 64; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, H - groundH);
    ctx.lineTo(x - 32, H);
    ctx.stroke();
  }

  // Vignette — darkens the edges so the action pops forward (depth cue)
  const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  bgOffset += 1.5;
}

/*  PIPE RENDERING */
function drawPipe(x, topH, botY, pal) {
  const groundH = Math.max(52, H * 0.10);
  const shineW  = PIPE_W * 0.18;
  const darkW   = PIPE_W * 0.16;
  const capX    = x - 11;
  const capW    = PIPE_W + 22;
  const capH    = 32;

  function pipeGrad() {
    const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    g.addColorStop(0,    pal.dark);
    g.addColorStop(0.12, pal.mid);
    g.addColorStop(0.38, pal.light);
    g.addColorStop(0.55, pal.mid);
    g.addColorStop(0.82, pal.dark);
    g.addColorStop(1,    '#000000aa');
    return g;
  }

  function capGrad(y0, y1) {
    const g = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    g.addColorStop(0,    pal.dark);
    g.addColorStop(0.18, pal.cap);
    g.addColorStop(0.45, pal.shine);
    g.addColorStop(0.65, pal.cap);
    g.addColorStop(0.88, pal.mid);
    g.addColorStop(1,    pal.dark);
    return g;
  }

  /* Top pipe  */
  ctx.fillStyle = pipeGrad();
  roundedRect(x, 0, PIPE_W, topH, 0, 0, 6, 6);
  ctx.fill();

  // Inner shine
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundedRect(x + 5, 6, shineW, topH - 10, 0, 0, 4, 4);
  ctx.fill();

  // Dark right edge
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundedRect(x + PIPE_W - darkW - 3, 0, darkW, topH, 0, 0, 0, 0);
  ctx.fill();

  // Top cap
  ctx.fillStyle = capGrad();
  roundedRect(capX, topH - capH, capW, capH, 8, 8, 8, 8);
  ctx.fill();

  // Cap shine
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundedRect(capX + 6, topH - capH + 5, capW * 0.32, capH - 10, 5, 5, 5, 5);
  ctx.fill();

  // Cap bottom edge shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundedRect(capX, topH - 7, capW, 7, 0, 0, 8, 8);
  ctx.fill();

  /*  Bottom pipe  */
  ctx.fillStyle = pipeGrad();
  roundedRect(x, botY, PIPE_W, H - groundH - botY, 6, 6, 0, 0);
  ctx.fill();

  // Inner shine
  ctx.fillStyle = 'rgba(255,255,255,0.11)';
  roundedRect(x + 5, botY + 4, shineW, H - groundH - botY - 8, 4, 4, 0, 0);
  ctx.fill();

  // Dark right edge
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundedRect(x + PIPE_W - darkW - 3, botY, darkW, H - groundH - botY, 0, 0, 0, 0);
  ctx.fill();

  // Bottom cap
  ctx.fillStyle = capGrad();
  roundedRect(capX, botY, capW, capH, 8, 8, 8, 8);
  ctx.fill();

  // Cap shine
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundedRect(capX + 6, botY + 5, capW * 0.32, capH - 10, 5, 5, 5, 5);
  ctx.fill();

  // Cap top shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundedRect(capX, botY, capW, 7, 8, 8, 0, 0);
  ctx.fill();
}


function drawGroundShadow(x, y) {
  const groundH  = Math.max(52, H * 0.10);
  const groundY  = H - groundH;
  const dist     = Math.max(0, groundY - y);
  const t        = Math.max(0, 1 - dist / 260);  // 1 = touching ground, 0 = far away
  const scale    = 0.55 + t * 0.7;
  const alpha    = 0.10 + t * 0.28;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, groundY - 3, 17 * scale * 1.25, 6 * scale * 1.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.filter = 'blur(1.5px)';
  ctx.fill();
  ctx.restore();
}

/*  BIRD RENDERING */
function drawBird(x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(BIRD_SCALE, BIRD_SCALE);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(3, 19, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body gradient (3D sphere feel)
  const bodyG = ctx.createRadialGradient(-5, -6, 2, 0, 0, 20);
  bodyG.addColorStop(0,   '#fff0a0');
  bodyG.addColorStop(0.3, '#ffe066');
  bodyG.addColorStop(0.7, '#ffb300');
  bodyG.addColorStop(1,   '#e65100');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body rim shadow
  ctx.strokeStyle = 'rgba(180,60,0,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 16, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Wing (animated flap in play mode)
  const flap = Math.sin(frame * 0.20) * (state === 'play' ? 8 : 4);
  const wingG = ctx.createRadialGradient(-5, 4, 1, -5, 4, 12);
  wingG.addColorStop(0, '#ffa500');
  wingG.addColorStop(1, '#cc6a00');
  ctx.fillStyle = wingG;
  ctx.beginPath();
  ctx.ellipse(-6, 4 + flap, 11, 6.5, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Wing highlight
  ctx.fillStyle = 'rgba(255,255,200,0.2)';
  ctx.beginPath();
  ctx.ellipse(-6, 3 + flap, 7, 4, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Belly / chest lighter area
  const bellyG = ctx.createRadialGradient(2, 5, 1, 2, 5, 10);
  bellyG.addColorStop(0, 'rgba(255,255,200,0.35)');
  bellyG.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = bellyG;
  ctx.beginPath();
  ctx.ellipse(2, 5, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye white
  // ctx.fillStyle = '#fff';
  // ctx.beginPath();
  // ctx.arc(8.5, -4.5, 5.5, 0, Math.PI * 2);
  // ctx.fill();
    
  
  // Eye white
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(9.5, -5.5, 6.5, 0, Math.PI * 3);
  ctx.fill();
    
  // Pupil
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(9.8, -4.5, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(11, -5.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak upper
  const beakG = ctx.createLinearGradient(13, -3, 23, 3);
  beakG.addColorStop(0, '#ff7043');
  beakG.addColorStop(1, '#bf360c');
  ctx.fillStyle = beakG;
  ctx.beginPath();
  ctx.moveTo(13, -2);
  ctx.lineTo(23.5, 1.5);
  ctx.lineTo(13, 2);
  ctx.closePath();
  ctx.fill();

  // Beak lower (shadow)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(13, 1);
  ctx.lineTo(23.5, 1.5);
  ctx.lineTo(13, 4.5);
  ctx.closePath();
  ctx.fill();

  // Cheek blush
  ctx.fillStyle = 'rgba(255,100,60,0.22)';
  ctx.beginPath();
  ctx.ellipse(5, 4, 5, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}


function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.12;
    p.life -= 0.045;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = `hsl(${p.hue},100%,65%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/*  PIPE SPAWNING & COLLISION */
function spawnPipe() {
  const groundH = Math.max(52, H * 0.10);
  const gap     = H * (PIPE_GAP_MIN + Math.random() * (PIPE_GAP_MAX - PIPE_GAP_MIN));
  const minTop  = H * 0.15;
  const maxTop  = H - groundH - gap - H * 0.15;
  const topH    = minTop + Math.random() * (maxTop - minTop);
  pipes.push({
    x:      W + 20,
    topH,
    botY:   topH + gap,
    pal:    PIPE_PALETTES[colorIdx % PIPE_PALETTES.length],
    scored: false
  });
  colorIdx++;
}

function checkCollision(p) {
  const birdX   = W * BIRD_X_FRAC;
  const hitR    = BIRD_HIT_R;
  const groundH = Math.max(52, H * 0.10);

  // Ground & ceiling
  if (birdY + hitR > H - groundH || birdY - hitR < 0) return true;

  // Pipe bounding box (tight)
  const inX = birdX + hitR > p.x + 8 && birdX - hitR < p.x + PIPE_W - 8;
  if (inX) {
    if (birdY - hitR < p.topH || birdY + hitR > p.botY) return true;
  }
  return false;
}

/* MAIN GAME LOOP */
function loop() {
  requestAnimationFrame(loop);
  frame++;

  ctx.clearRect(0, 0, W, H);
  drawBackground();

  const birdX = W * BIRD_X_FRAC;

  /*  Play state  */
  if (state === 'play') {
    birdVY  += GRAVITY;
    birdY   += birdVY;
    birdRot  = Math.max(-30, Math.min(75, birdVY * 3.2));

    // Pipe timer
    pipeTimer++;
    if (pipeTimer >= PIPE_INTERVAL) { pipeTimer = 0; spawnPipe(); }

    // Update & draw pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= PIPE_SPEED;

      drawPipe(p.x, p.topH, p.botY, p.pal);

      // Score
      if (!p.scored && p.x + PIPE_W < birdX - 20) {
        p.scored = true;
        score++;
        scoreNum.textContent = score;
        spawnParticles(birdX, birdY);
      }

      // Collision
      if (checkCollision(p)) { endGame(); return; }

      if (p.x < -PIPE_W - 30) pipes.splice(i, 1);
    }

    // Ground / ceiling collision
    const groundH = Math.max(52, H * 0.10);
    if (birdY + BIRD_HIT_R > H - groundH || birdY - BIRD_HIT_R < 0) { endGame(); return; }

  } else {
    /*  Menu / Game Over idle  */
    birdY   = H * 0.42 + Math.sin(frame * 0.045) * 14;
    birdRot = Math.sin(frame * 0.045) * 10;
  }

  // Draw particles behind bird
  updateParticles();

  // Cast a ground shadow that reacts to height  adds 3D depth
  drawGroundShadow(birdX, birdY);

  // Draw bird
  drawBird(birdX, birdY, birdRot);
}

requestAnimationFrame(loop);

/*  JUMP */
function jump() {
  if (state !== 'play') return;
  birdVY  = JUMP_FORCE;
  birdRot = -28;
  spawnParticles(W * BIRD_X_FRAC, birdY);
}

/*  INPUT  Keyboard */
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
  if (e.key === 'Enter' && state !== 'play') {
    startGame();
  }
});

/*  Pointer / touch on canvas  */
canvas.addEventListener('click', () => { if (state === 'play') jump(); });
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state === 'play') jump();
}, { passive: false });

/*  Overlay start button  */
startBtn.addEventListener('click', startGame);

/*  Mobile controls */
document.getElementById('m-start').addEventListener('click', startGame);
['click', 'touchstart'].forEach(evt => {
  document.getElementById('m-jump').addEventListener(evt, (e) => {
    e.preventDefault();
    jump();
  }, { passive: false });
});

/* MOBILE DETECTION */
function checkMobile() {
  const mq      = window.matchMedia('(hover: none)');
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                || mq.matches
                || window.innerWidth <= 768;
  document.getElementById('mobile-controls').style.display = isMobile ? 'flex' : 'none';
}
window.addEventListener('resize', checkMobile);
checkMobile();

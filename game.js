/* ============================================================
   press run — the money press
   a tiny endless runner hidden after the letter. a printing
   press jumps pen nibs, eats ink drops, and leaves a trail of
   freshly printed dollars. white-on-blue, canvas, vanilla JS.
   activated by main.js when the reader scrolls past the end.
   ============================================================ */

window.PressRun = (function () {
  const section = document.getElementById("press-run");
  const canvas = document.getElementById("game-canvas");
  if (!section || !canvas) return null;
  const ctx = canvas.getContext("2d");

  const WHITE = "#fdfdfa";
  const BLUE = "#0032ff";

  /* ---------- sizing (k scales everything to the canvas) ---------- */

  let W = 0, H = 0, k = 1, u = 3, groundY = 0, pressX = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = Math.max(0.72, Math.min(1.25, Math.min(H / 330, W / 420)));
    u = 3 * k;
    groundY = H - 34 * k;
    pressX = Math.max(18, W * 0.1);
    initDashes();
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 250));

  /* ---------- state ---------- */

  let live = false;
  let raf = null;
  let last = 0;
  let state = "idle"; // idle | run | over
  let speed = 0, dollars = 0, nextObst = 0, nextTreat = 0;
  let billDist = 0, bobT = 0, jam = 0, overAt = 0;

  let hi = 0;
  try { hi = +(localStorage.getItem("pressrun-hi") || 0); } catch (e) {}

  const player = { y: 0, vy: 0, grounded: true };
  let obstacles = []; // {kind:'nib'|'pen', x, w, h, bottom, vx}
  let treats = [];    // ink drops {x, y, r, t}
  let bills = [];     // dollar trail {x, y, vx, vy, rot, vr, life}
  let dashes = [];    // ground texture {x, y, w}

  function initDashes() {
    dashes = [];
    for (let i = 0; i < 16; i++) {
      dashes.push({
        x: Math.random() * W,
        y: groundY + (7 + Math.random() * 14) * k,
        w: (4 + Math.random() * 10) * k,
      });
    }
  }

  function startRun() {
    state = "run";
    speed = 5.2 * k;
    dollars = 0;
    jam = 0;
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
    obstacles = [];
    treats = [];
    bills = [];
    billDist = 0;
    nextObst = 500 * k;
    nextTreat = 900 * k;
  }

  function jump() {
    if (!player.grounded) return;
    player.grounded = false;
    player.vy = 10.8 * k;
  }

  function gameOver(now) {
    state = "over";
    overAt = now;
    if (dollars > hi) {
      hi = Math.floor(dollars);
      try { localStorage.setItem("pressrun-hi", String(hi)); } catch (e) {}
    }
  }

  /* ---------- spawning ---------- */

  function spawnObstacle() {
    if (dollars > 300 && Math.random() < 0.25) {
      // a fountain pen flies in: low ones you jump, high ones you run under
      const low = Math.random() < 0.5;
      obstacles.push({
        kind: "pen",
        x: W + 20 * k,
        w: 34 * k,
        h: 8 * k,
        bottom: groundY - (low ? 26 * k : 52 * k),
        vx: 0.8 * k,
      });
    } else {
      // a cluster of pen nibs, tips up
      const count = 1 + Math.floor(Math.random() * Math.min(3, 1 + dollars / 250));
      let x = W + 20 * k;
      for (let i = 0; i < count; i++) {
        const w = (14 + Math.random() * 6) * k;
        obstacles.push({
          kind: "nib",
          x,
          w,
          h: (24 + Math.random() * 12) * k,
          bottom: groundY,
          vx: 0,
        });
        x += w + 5 * k;
      }
    }
  }

  function spawnTreat() {
    const x = W + 20 * k;
    // skip if an obstacle is too close — every drop must be eatable
    if (obstacles.some((o) => Math.abs(o.x - x) < 90 * k)) return false;
    treats.push({
      x,
      y: groundY - (Math.random() < 0.5 ? 9 * k : 62 * k),
      r: 7 * k,
      t: Math.random() * 6,
    });
    return true;
  }

  function spawnBill(x, y, burst) {
    if (bills.length > 70) bills.shift();
    bills.push({
      x, y,
      vx: burst ? (Math.random() * 4 - 3) * k : -(speed * 0.55 + Math.random() * 1.5 * k),
      vy: burst ? -(2 + Math.random() * 2.5) * k : -(0.4 + Math.random() * 0.9) * k,
      rot: (Math.random() - 0.5) * 0.8,
      vr: (Math.random() - 0.5) * 0.12,
      life: burst ? 90 : 70,
    });
  }

  /* ---------- update ---------- */

  function update(dtf, now) {
    bobT += dtf * (state === "run" ? 0.20 + speed * 0.012 / k : 0.07);

    if (state === "run") {
      speed = Math.min(10.5 * k, speed + 0.0016 * k * dtf);
      dollars += 0.05 * (speed / k) * dtf;

      // physics
      if (!player.grounded) {
        player.y += player.vy * dtf;
        player.vy -= 0.55 * k * dtf;
        if (player.y <= 0) {
          player.y = 0;
          player.vy = 0;
          player.grounded = true;
        }
      }

      // the press prints as it advances
      billDist += speed * dtf;
      if (billDist > 58 * k) {
        billDist = 0;
        spawnBill(pressX + 2 * k, groundY - player.y - 9 * k, false);
      }

      // world scroll
      obstacles.forEach((o) => { o.x -= (speed + o.vx) * dtf; });
      obstacles = obstacles.filter((o) => o.x + o.w > -30);
      treats.forEach((d) => { d.x -= speed * dtf; d.t += dtf * 0.1; });
      treats = treats.filter((d) => d.x + d.r > -30);
      dashes.forEach((d) => {
        d.x -= speed * dtf;
        if (d.x + d.w < 0) {
          d.x = W + Math.random() * 60 * k;
          d.w = (4 + Math.random() * 10) * k;
        }
      });

      nextObst -= speed * dtf;
      if (nextObst <= 0) {
        spawnObstacle();
        nextObst = speed * (52 + Math.random() * 70);
      }
      nextTreat -= speed * dtf;
      if (nextTreat <= 0) {
        nextTreat = spawnTreat() ? speed * (150 + Math.random() * 170) : speed * 30;
      }

      // collisions (forgiving hitboxes)
      const pad = 3 * k;
      const pL = pressX + u + pad;
      const pR = pressX + 15 * u - pad;
      const pB = groundY - player.y - pad;
      const pT = groundY - player.y - 14 * u + pad;

      for (const o of obstacles) {
        const oT = o.bottom - o.h;
        if (pR > o.x && pL < o.x + o.w && pB > oT && pT < o.bottom) {
          gameOver(now);
          break;
        }
      }
      for (let i = treats.length - 1; i >= 0; i--) {
        const d = treats[i];
        const cx = Math.max(pL, Math.min(d.x, pR));
        const cy = Math.max(pT, Math.min(d.y, pB));
        if ((d.x - cx) ** 2 + (d.y - cy) ** 2 < d.r * d.r) {
          treats.splice(i, 1);
          dollars += 30; // fresh ink — bonus print run
          for (let j = 0; j < 6; j++) spawnBill(d.x, d.y, true);
        }
      }
    }

    if (state === "over") {
      jam = Math.min(1, jam + dtf * 0.12);
    }

    // bills drift, fall, fade — even after a jam
    bills.forEach((b) => {
      b.x += b.vx * dtf;
      b.y += b.vy * dtf;
      b.vy += 0.06 * k * dtf;
      if (b.y > groundY - 3 * k) {
        b.y = groundY - 3 * k;
        b.vy = 0;
        b.vx = state === "run" ? -speed * 0.9 : b.vx * 0.9;
      }
      b.rot += b.vr * dtf;
      b.life -= dtf;
    });
    bills = bills.filter((b) => b.life > 0 && b.x > -30);
  }

  /* ---------- drawing ---------- */

  function drawPress() {
    const by = groundY - player.y;
    const bob = (Math.sin(bobT) + 1) / 2; // 0 = platen up, 1 = stamped down
    ctx.save();
    ctx.translate(pressX + 8 * u, by);
    ctx.rotate(-0.2 * jam);
    ctx.translate(-8 * u, 0);
    ctx.fillStyle = WHITE;
    // base + bed
    ctx.fillRect(0, -2.5 * u, 16 * u, 2.5 * u);
    ctx.fillRect(2 * u, -4.5 * u, 12 * u, 2 * u);
    // fresh sheet feeding out the front
    ctx.fillRect(13.5 * u, -5.2 * u, 3.6 * u, 0.9 * u);
    // columns
    ctx.fillRect(2.5 * u, -12 * u, 1.8 * u, 8 * u);
    ctx.fillRect(11.7 * u, -12 * u, 1.8 * u, 8 * u);
    // top beam + handle
    ctx.fillRect(1.5 * u, -14 * u, 13 * u, 2.2 * u);
    ctx.fillRect(5.5 * u, -15.2 * u, 5 * u, 1.2 * u);
    // screw shaft + platen (the part that stamps)
    const platenY = -9.3 * u + bob * 1.8 * u;
    ctx.fillRect(7.2 * u, -12 * u, 1.6 * u, platenY + 12 * u);
    ctx.fillRect(4.5 * u, platenY, 7 * u, 1.8 * u);
    // flywheel
    ctx.beginPath();
    ctx.arc(0.4 * u, -6.5 * u, 2.6 * u, 0, 7);
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.arc(0.4 * u, -6.5 * u, 0.9 * u, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function drawNib(o) {
    const x = o.x, y = o.bottom, w = o.w, h = o.h;
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h);
    ctx.lineTo(x + w, y - h * 0.35);
    ctx.lineTo(x + w * 0.85, y);
    ctx.lineTo(x + w * 0.15, y);
    ctx.lineTo(x, y - h * 0.35);
    ctx.closePath();
    ctx.fill();
    // slit + breather hole
    ctx.fillStyle = BLUE;
    ctx.fillRect(x + w / 2 - 0.8 * k, y - h, 1.6 * k, h * 0.42);
    ctx.beginPath();
    ctx.arc(x + w / 2, y - h * 0.46, 1.9 * k, 0, 7);
    ctx.fill();
  }

  function drawPen(o) {
    const y = o.bottom - o.h;
    ctx.fillStyle = WHITE;
    // body
    ctx.fillRect(o.x + 9 * k, y, o.w - 9 * k, o.h);
    // nib pointing forward (left)
    ctx.beginPath();
    ctx.moveTo(o.x, y + o.h / 2);
    ctx.lineTo(o.x + 10 * k, y);
    ctx.lineTo(o.x + 10 * k, y + o.h);
    ctx.closePath();
    ctx.fill();
    // clip
    ctx.fillRect(o.x + o.w - 8 * k, y - 2.4 * k, 6 * k, 2.4 * k);
  }

  function drawTreat(d) {
    const y = d.y + Math.sin(d.t) * 2.5 * k;
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(d.x, y, d.r, 0, 7);
    ctx.moveTo(d.x - d.r * 0.68, y - d.r * 0.55);
    ctx.lineTo(d.x, y - d.r * 1.9);
    ctx.lineTo(d.x + d.r * 0.68, y - d.r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.arc(d.x - d.r * 0.3, y + d.r * 0.1, d.r * 0.22, 0, 7);
    ctx.fill();
  }

  function drawBill(b) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life / 30));
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.fillStyle = WHITE;
    ctx.fillRect(-8 * k, -4.5 * k, 16 * k, 9 * k);
    ctx.fillStyle = BLUE;
    ctx.font = `700 ${Math.round(8 * k)}px "Space Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 0.5 * k);
    ctx.restore();
  }

  function pad(n) {
    return String(Math.max(0, Math.floor(n))).padStart(5, "0");
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // ground
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, groundY, W, 2 * k);
    ctx.globalAlpha = 0.55;
    dashes.forEach((d) => ctx.fillRect(d.x, d.y, d.w, 1.6 * k));
    ctx.globalAlpha = 1;

    bills.forEach(drawBill);
    treats.forEach(drawTreat);
    obstacles.forEach((o) => (o.kind === "nib" ? drawNib(o) : drawPen(o)));
    drawPress();

    // score
    ctx.fillStyle = WHITE;
    ctx.font = `700 ${Math.round(13 * k)}px "Space Mono", monospace`;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 0.6;
    ctx.fillText(`HI $${pad(hi)}`, W - 10, 24 * k);
    ctx.globalAlpha = 1;
    ctx.fillText(`$${pad(dollars)}`, W - 10, 44 * k);

    // overlays
    ctx.textAlign = "center";
    if (state === "idle") {
      ctx.font = `700 ${Math.round(15 * k)}px "Space Mono", monospace`;
      ctx.fillText("tap, click or space — start the press", W / 2, H * 0.32);
    } else if (state === "over") {
      ctx.font = `700 ${Math.round(26 * k)}px "Space Mono", monospace`;
      ctx.fillText("PRESS JAMMED", W / 2, H * 0.3);
      ctx.font = `700 ${Math.round(13 * k)}px "Space Mono", monospace`;
      ctx.fillText(`$${pad(dollars)} printed — tap to reprint`, W / 2, H * 0.3 + 28 * k);
    }
  }

  /* ---------- loop ---------- */

  function loop(now) {
    raf = live ? requestAnimationFrame(loop) : null;
    const dtf = Math.min(3, (now - last) / 16.667); // normalized to 60fps frames
    last = now;
    update(dtf, now);
    draw();
  }

  /* ---------- input ---------- */

  function pressKey() {
    if (!live) return;
    if (state === "idle") startRun();
    else if (state === "run") jump();
    else if (state === "over" && performance.now() - overAt > 400) startRun();
  }

  window.addEventListener("keydown", (e) => {
    if (!live) return;
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      if (!e.repeat) pressKey();
    }
  });
  section.addEventListener("pointerdown", pressKey);

  /* ---------- public ---------- */

  function setLive(v) {
    if (v === live) return;
    live = v;
    section.classList.toggle("live", v);
    section.setAttribute("aria-hidden", String(!v));
    if (v) {
      resize();
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(loop);
    }
  }

  resize();
  return { setLive };
})();

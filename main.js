/* ============================================================
   1’rie — typewriter edition
   scroll = the typing head. every character is one unit of
   scroll; scrolling back un-types. vanilla JS, no libraries.
   ============================================================ */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced) init();

function init() {
  document.body.classList.add("typing");

  const paper = document.querySelector(".paper");
  const cursor = document.querySelector(".type-cursor");
  const hint = document.querySelector(".scroll-hint");
  const progress = document.querySelector(".progress-line i");

  /* ---------- build the ordered unit list ----------
     unit = one "keystroke": a character, an icon stamp,
     a strike-out stroke, or a carriage-return ding.      */

  const units = [];

  function splitTextNodes(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.replace(/\s+/g, " ");
        const frag = document.createDocumentFragment();
        let word = null; // chars group into unbreakable words so lines wrap cleanly
        [...text].forEach((ch) => {
          const span = document.createElement("span");
          span.className = "char";
          span.textContent = ch;
          if (ch === " ") {
            frag.appendChild(span);
            word = null;
          } else {
            // ink irregularity: every key strikes a little differently
            span.style.transform = `rotate(${((Math.random() * 2 - 1) * 1.5).toFixed(2)}deg)`;
            span.style.opacity = (0.82 + Math.random() * 0.18).toFixed(2);
            if (!word) {
              word = document.createElement("span");
              word.className = "word";
              frag.appendChild(word);
            }
            word.appendChild(span);
          }
          units.push({ type: "char", el: span });
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList.contains("t-stamp")) {
          units.push({ type: "stamp", el: child });
        } else if (child.tagName !== "BR") {
          splitTextNodes(child);
        }
      }
    });
  }

  document.querySelectorAll(".t").forEach((block) => {
    splitTextNodes(block);
    // corrections happen after the line is fully typed
    block.querySelectorAll(".strikeable .char").forEach((c) => {
      units.push({ type: "strike", el: c });
    });
    units.push({ type: "ding" });
  });

  /* for each position, the index of the most recent typed character —
     that's where the cursor sits */
  const lastCharAt = new Array(units.length + 1).fill(-1);
  for (let i = 0; i < units.length; i++) {
    lastCharAt[i + 1] = units[i].type === "char" ? i : lastCharAt[i];
  }

  /* ---------- scroll length ---------- */

  const PX = window.innerWidth < 760 ? 5 : 7; // scroll pixels per keystroke
  const space = document.querySelector(".scroll-space");
  // extra viewport past the letter hides the mini game (see game.js)
  space.style.height = units.length * PX + window.innerHeight * 2.4 + "px";

  /* ---------- sound (WebAudio, off until toggled) ---------- */

  let audioCtx = null;
  let soundOn = false;
  let lastClack = 0;
  const soundBtn = document.querySelector(".sound-toggle");

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    if (soundOn && !audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    soundBtn.textContent = soundOn ? "sound: on" : "sound: off";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) clack(true);
  });

  function noiseBurst(len, freq, gainVal, when) {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + len);
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start(when);
  }

  /* key clack — throttled so fast scrolls sound like fast typing, not noise */
  function clack(force) {
    if (!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime;
    if (!force && t - lastClack < 0.035) return;
    lastClack = t;
    noiseBurst(0.03, 2600 + Math.random() * 800, 0.05, t);
  }

  /* carriage return ding */
  function ding() {
    if (!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1860;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  /* icon stamp thunk */
  function thunk() {
    if (!soundOn || !audioCtx) return;
    noiseBurst(0.07, 220, 0.12, audioCtx.currentTime);
  }

  /* ---------- reveal / un-reveal ---------- */

  function reveal(unit, forward) {
    switch (unit.type) {
      case "char":
        unit.el.classList.add("on");
        if (forward && unit.el.textContent !== " ") clack(false);
        break;
      case "stamp":
        unit.el.classList.add("on");
        if (forward) thunk();
        break;
      case "strike":
        unit.el.classList.add("struck");
        if (forward) clack(false);
        break;
      case "ding":
        if (forward) ding();
        break;
    }
  }

  function unreveal(unit) {
    if (unit.type === "char") unit.el.classList.remove("on");
    else if (unit.type === "stamp") unit.el.classList.remove("on");
    else if (unit.type === "strike") unit.el.classList.remove("struck");
  }

  /* ---------- the typing loop ---------- */

  let shown = 0;       // units currently revealed
  let cur = 0;         // smoothed position
  let paperY = 0;      // smoothed paper offset

  function frame() {
    const target = Math.min(units.length, Math.max(0, window.scrollY / PX));
    cur += (target - cur) * 0.25;
    if (Math.abs(target - cur) < 0.4) cur = target;
    const n = Math.round(cur);

    while (shown < n) reveal(units[shown++], true);
    while (shown > n) unreveal(units[--shown]);

    /* cursor follows the last typed character (or waits at the first) */
    const lcIdx = lastCharAt[shown];
    const headEl = lcIdx >= 0 ? units[lcIdx].el : paper.querySelector(".char");
    if (headEl) {
      cursor.style.left = headEl.offsetLeft + (lcIdx >= 0 ? headEl.offsetWidth : 0) + "px";
      cursor.style.top = headEl.offsetTop + "px";
      cursor.style.height = headEl.offsetHeight + "px";
    }

    /* the paper rolls up through the platen: keep the typing line
       around 30% from the top of the viewport */
    const lineTop = headEl ? headEl.offsetTop : 0;
    const targetY = Math.max(0, lineTop - window.innerHeight * 0.30);
    paperY += (targetY - paperY) * 0.12;
    paper.style.transform = `translateY(${-paperY}px)`;

    /* past the end of the letter, the money press takes over */
    const gameLive = window.scrollY > units.length * PX + window.innerHeight * 0.55;
    if (window.PressRun) window.PressRun.setLive(gameLive);

    /* hud */
    progress.style.transform = `scaleX(${shown / units.length})`;
    const hintText = shown >= units.length ? "keep scrolling ↓" : "scroll to type ↓";
    if (hint.textContent !== hintText) hint.textContent = hintText;
    hint.classList.toggle("gone", gameLive || (shown > 12 && shown < units.length));

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

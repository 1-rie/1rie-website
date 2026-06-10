/* ============================================================
   l’1rie — animations
   gsap + ScrollTrigger + lenis (all loaded from CDN)
   ============================================================ */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- text splitting helpers ---------- */

function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  // group chars inside unbreakable word spans so lines only wrap between words
  text.split(" ").forEach((word, i, arr) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "char-word";
    wordSpan.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      wordSpan.appendChild(span);
    });
    el.appendChild(wordSpan);
    if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
  });
  return el.querySelectorAll(".char");
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute("aria-label", el.textContent.trim());
  el.textContent = "";
  words.forEach((w, i) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = w;
    span.setAttribute("aria-hidden", "true");
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
  return el.querySelectorAll(".word");
}

/* ---------- reduced motion: show everything, bail out ---------- */

if (reduced) {
  document.querySelector(".preloader")?.remove();
  document.querySelector(".nav").style.opacity = 1;
} else {
  init();
}

function init() {
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll (lenis) ---------- */

  const lenis = new Lenis({ lerp: 0.12 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // locked until the preloader is done

  /* ---------- sound effects (WebAudio, off until toggled) ---------- */

  let audioCtx = null;
  let soundOn = false;
  const soundBtn = document.querySelector(".sound-toggle");

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    if (soundOn && !audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    soundBtn.textContent = soundOn ? "sound: on" : "sound: off";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) printZip();
  });

  /* short soft click — used on hoverable elements */
  function blip() {
    if (!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1500;
    gain.gain.setValueAtTime(0.025, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /* dot-matrix print zip — bandpassed noise bursts */
  function printZip() {
    if (!soundOn || !audioCtx) return;
    const t0 = audioCtx.currentTime;
    for (let i = 0; i < 6; i++) {
      const len = 0.035;
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2200 + i * 180;
      bp.Q.value = 2;
      const gain = audioCtx.createGain();
      const t = t0 + i * 0.065;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(bp).connect(gain).connect(audioCtx.destination);
      src.start(t);
    }
  }

  /* ---------- custom cursor ---------- */

  const cursor = document.querySelector(".cursor");
  const ring = document.querySelector(".cursor-ring");
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { x: pos.x, y: pos.y };

  window.addEventListener("mousemove", (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
  });
  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * 0.14;
    ringPos.y += (pos.y - ringPos.y) * 0.14;
    cursor.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%,-50%)`;
  });
  document.querySelectorAll("[data-hover]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.classList.add("is-hover");
      blip();
    });
    el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
  });

  /* ---------- hero blob follows the mouse, slowly ---------- */

  const blob = document.querySelector(".hero-blob");
  window.addEventListener("mousemove", (e) => {
    gsap.to(blob, {
      x: (e.clientX / innerWidth - 0.5) * 120,
      y: (e.clientY / innerHeight - 0.5) * 120,
      duration: 2.5,
      ease: "power2.out",
    });
  });

  /* ---------- split the big titles ---------- */

  const heroChars = splitChars(document.querySelector(".hero-title .split"));
  const sectionTitles = document.querySelectorAll(".section-title .split, .contact-title .split");
  sectionTitles.forEach((t) => splitChars(t));
  const manifestoWords = splitWords(document.querySelector("[data-fill]"));

  /* ---------- preloader : l’imprime(rie) pressed into l’1(rie) ---------- */

  const pre = gsap.timeline({
    onComplete: () => {
      document.querySelector(".preloader").remove();
      lenis.start();
      ScrollTrigger.refresh();
    },
  });

  pre
    .from(".pre-bit, .pre-collapse", {
      yPercent: 120,
      duration: 0.7,
      stagger: 0.06,
      ease: "power3.out",
    })
    .to(".pre-caption", { opacity: 0.7, duration: 0.4 }, "-=0.3")
    .to(".pre-collapse", {
      width: 0,
      opacity: 0,
      duration: 0.65,
      ease: "power4.inOut",
    }, "+=0.45")
    .to(".pre-one", {
      width: "auto",
      opacity: 1,
      duration: 0.65,
      ease: "power4.inOut",
    }, "<")
    .to(".preloader", {
      yPercent: -100,
      duration: 0.9,
      ease: "expo.inOut",
    }, "+=0.5")
    /* hero intro overlaps the curtain lift */
    .from(heroChars, {
      yPercent: 115,
      rotate: 4,
      duration: 1,
      stagger: 0.05,
      ease: "power4.out",
    }, "-=0.45")
    .from(".hero-eyebrow, .hero-sub, .hero-foot", {
      y: 24,
      opacity: 0,
      duration: 0.7,
      stagger: 0.1,
      ease: "power3.out",
    }, "-=0.6")
    .to(".nav", { opacity: 1, duration: 0.6 }, "<");

  /* ---------- scroll progress bar ---------- */

  gsap.to(".progress", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
  });

  /* ---------- hero drifts away on scroll ---------- */

  gsap.to(".hero-inner", {
    yPercent: -18,
    opacity: 0.15,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  /* ---------- manifesto : words fill with ink ---------- */

  gsap.set(manifestoWords, { opacity: 0.12 });
  gsap.to(manifestoWords, {
    opacity: 1,
    stagger: 0.06,
    ease: "none",
    scrollTrigger: {
      trigger: ".manifesto",
      start: "top 75%",
      end: "center 45%",
      scrub: true,
    },
  });

  /* ---------- work : pinned horizontal scroll ---------- */

  const track = document.querySelector(".work-track");
  const horizontal = gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth),
    ease: "none",
    scrollTrigger: {
      trigger: ".work",
      start: "top top",
      end: () => "+=" + (track.scrollWidth - innerWidth),
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  /* phones drift + tilt as they cross the viewport */
  document.querySelectorAll("[data-parallax]").forEach((phone, i) => {
    gsap.fromTo(
      phone,
      { y: 40, rotate: i % 2 ? 4 : -4 },
      {
        y: -40,
        rotate: i % 2 ? -4 : 4,
        ease: "none",
        scrollTrigger: {
          trigger: phone,
          containerAnimation: horizontal,
          start: "left right",
          end: "right left",
          scrub: true,
        },
      }
    );
  });

  /* panel info slides in as each panel arrives */
  document.querySelectorAll(".panel-info").forEach((info) => {
    gsap.from(info, {
      x: 80,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: info,
        containerAnimation: horizontal,
        start: "left 85%",
        toggleActions: "play none none reverse",
        onEnter: printZip,
      },
    });
  });

  /* ---------- section titles rise in ---------- */

  sectionTitles.forEach((title) => {
    gsap.from(title.querySelectorAll(".char"), {
      yPercent: 115,
      duration: 0.8,
      stagger: 0.035,
      ease: "power4.out",
      scrollTrigger: {
        trigger: title,
        start: "top 88%",
        toggleActions: "play none none reverse",
      },
    });
  });

  /* ---------- scroll reveals ---------- */

  document.querySelectorAll("[data-reveal]").forEach((row) => {
    gsap.from(row, {
      y: 50,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: row,
        start: "top 88%",
        toggleActions: "play none none reverse",
      },
    });
  });

  /* ---------- nav inverts over blue sections ---------- */

  document.querySelectorAll(".work, .marquee, .contact").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 48px",
      end: "bottom 48px",
      onToggle: (self) => {
        document.querySelector(".nav").classList.toggle("on-blue", self.isActive);
      },
    });
  });

  /* ---------- magnetic email button ---------- */

  const magnet = document.querySelector("[data-magnetic]");
  magnet.addEventListener("mousemove", (e) => {
    const r = magnet.getBoundingClientRect();
    gsap.to(magnet, {
      x: (e.clientX - r.left - r.width / 2) * 0.3,
      y: (e.clientY - r.top - r.height / 2) * 0.4,
      duration: 0.5,
      ease: "power3.out",
    });
  });
  magnet.addEventListener("mouseleave", () => {
    gsap.to(magnet, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
  });

  /* ---------- anchor links via lenis ---------- */

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
  });

  /* ---------- keep measurements honest ---------- */

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

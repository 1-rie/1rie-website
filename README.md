# 1’rie — landing page

One-page animated landing for l’Imprimerie (1’rie), an AI-native mobile app studio.

## Two editions

- **`/` (classic)** — the animated one-pager: GSAP ScrollTrigger + Lenis, pinned horizontal work showcase, CSS printer animations.
- **`/v2/` (typewriter)** — "a letter to the world": scroll drives a typewriter that types the letter character by character (scrolling up un-types it). The wordmark gets typed as "l'imprimerie", struck out, and retyped as 1'rie; app icons get stamped onto the paper. Vanilla JS, no libraries. The two editions link to each other.

## Stack

Static HTML/CSS/JS — no build step. Drop the folder on any web server.

- `index.html` / `styles.css` / `main.js` — classic edition
- `v2/` — typewriter edition (self-contained except shared `assets/`)
- `assets/` — real app icons, shared by both editions

GSAP, Lenis and the Google Fonts (Archivo, Space Mono) load from CDNs; vendor them locally later if you want zero external requests.

## Run locally

```sh
python3 -m http.server 8080
# → http://localhost:8080
```

## Content notes

- **Apps** — the Work section shows the real portfolio: PGT, SundayCup, Unsweet, Low Dopamine Path, Kithe, LutAI. Real app icons live in `assets/` (downscaled from each app's AppIcon set). Edit the `.panel` blocks in `index.html` to adjust copy or add App Store links.
- **Sound** — the `sound: off` toggle in the nav enables WebAudio effects (hover clicks + dot-matrix print zips). Synthesized at runtime, no audio files.

## Placeholders to replace (search "PLACEHOLDER" in index.html)

1. **Email** — `bonjour@limprimerie.studio` in the footer.
2. **Socials** — the `#` links in the footer.

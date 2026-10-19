# Mallard Protocol: Blueprint and Handoff

For any AI or developer picking this project up. Written by Claude (Anthropic) for Dre (DreDarkroom, DJ and drummer, co-organiser of NOT A CULT festival). Status: working prototype, version 6, one self-contained HTML file.

## 1. What it is
A single-page audiovisual journey for phones and laptops. Dark techno mood, a psychedelic look, hand-inked manga touches.
It starts as a glossy yellow bath-toy duck, then turns out to be a cyborg, then moves through illusions, a striped tribal cat reveal, mini games, a labyrinth, a rhythm puzzle (the original Beat Match idea) and a starship scene about spacetime. Once the page has been open for 6 minutes 66 seconds (426 s) a robot appears.

Core idea: misdirection. Attention is a spotlight. The duck is the trick and the cat is the reveal. The player is guided, never hypnotised.

## 2. Rules (do not break these)
1. **Safety first.** Nothing flashes more than 3 times in any second, in every mode. Warning screen on load. Three modes: Calm (slow, no screen shake, no robot sound or voice), Full, and Intense (opt-in checkbox, faster, still within flash limits). Always a Skip button during the 6:66 scene and in the mini games. Respect `prefers-reduced-motion`.
2. **No hypnosis claims or attempts.** Use real, named illusions (Troxler fading, café wall) and say plainly that it is the viewer's own visual system.
3. **Copyright.** All text, drawings and sounds are original or synthesised. No text from *2001: A Space Odyssey*, Clarke's later books or Disney's *Fantasia*. Public-domain or CC0 only for any outside material.
4. **Logos and photos from NOT A CULT** may be used because Dre has permission, but they were not available to the author (the build sandbox could not reach notacult.co.uk). Do not invent or approximate the logo. Ask Dre to supply files.
5. **Privacy.** UK audience. Analytics must be cookieless and anonymous. No fingerprinting.
6. **Honesty.** Facts in the narrative must be checkable. Current ones: time dilation gamma = 1/sqrt(1 - v^2/c^2), about 7.09 at 0.99c; dark matter is roughly a quarter of the universe and ordinary matter about 5% (derived from Planck 2018 densities, see below).
7. **Do not take over screens, post links publicly, or message people on Dre's behalf** without explicit approval.

## 3. Experience timeline (phases in code)
| Phase | What | Notes |
|---|---|---|
| gate | Warning and mode choice | Unlocks audio |
| 0 | Toy duck on a shelf | Tap to squeak |
| 1 | Squeaks | |
| 2 | Double tap: red eye, glitch bars | |
| 3 | Triple tap: chrome plates, circuits, gear. Music starts (126 BPM) | |
| 4 | Troxler fade (pink ring around a white dot) | |
| 5 | Café wall illusion | |
| 6 | Tunnel and a pair of amber eyes | |
| 7 | Cat reveal: manga speed lines, ink outline draws, colour floods out from the eyes, tabby stripes, glowing tribal marks, chest mandala. Sub drop and meow | caption "You watched the duck" |
| 8 | Street-art wall cycles brick / halftone / kaleidoscope, cat holds, purr | |
| 9 | Games: Echo (Simon with stereo notes), Odd eye, Labyrinth, Beat lock, Ship finale | Skip available |
| end | "Transmogrify" card, tap to restart | |
| any | 6:66 robot at 426 s (add `#horror` to the URL to trigger it after 6 s) | 12 s, skippable |

Everything auto-advances so it also plays hands-off.

## 4. Interaction map
- Tap: squeak. Double tap: wake. Triple tap: open.
- One-finger drag: steer. Two-finger swipe: shift colours. Three-finger swipe: warp speed.
- Keyboard: 1/2/3 for taps, arrows to steer, Q/E hue, W/S warp, Esc skips the robot.
- Stereo: squeaks pan to where you tapped, hats ping-pong left and right, drone pair is panned hard left and right and detuned a few Hz so it beats, notes in Echo pan by orb position.

## 5. Architecture
- One HTML file, no build step, no frameworks. Canvas 2D for everything visual, Web Audio for all sound (no audio files), `speechSynthesis` for the robot voice line.
- Seeded pseudo-randomness helper `rnd(seed)` (mulberry32). In the sister project "Beat Match Roads" the seed comes from the player's scribble. Design note: humans avoid repeats when asked for randomness (Wagenaar 1972) and real timing drift is 1/f-like (Hennig et al. 2011), so "random" here means rule-bound and hand-fed rather than plain dice.
- Fonts: Google Fonts (Rubik Mono One, DM Sans). Everything else is inline.
- State is a few globals: `phase`, `game`, `horror`, `hue`, `warp`, `steerX/Y`, `mode`.
- Hosting: private Claude artifact for review. The same file can be copied to any static host (GitHub Pages, Cloudflare Pages). A repo copy lives at `labs/mallard/index.html` if the PR was merged.

## 6. Tuning guide
- Colour palette: warm yellow `#ffd23a`, beak orange, hot magenta, cyan, near-black `#06040a`. Cat: light-brown fur, grey rim, black tabby stripes, with neon only on the tribal marks.
- Tempo 126 BPM, bass pattern A-A-C-G, hats on offbeats, extra hats from phase 3.
- Make it more intense by raising `K()` (mode multiplier) and adding scenes, never by adding strobing.

## 7. What is missing (backlog, in priority order)
1. Real playtesting by 5 to 10 people on different phones. Record what confuses them.
2. Cinematic polish: camera pans in the cat scene, a fuller cat body, richer street-art stages.
3. Free media: CC0 or public-domain photos (for example from Pexels or Wikimedia Commons, check each licence) as background textures. A CC0 music bed. A "wall of videos" built from embeds whose terms allow it.
4. Wonderland mode: original magical section inspired by public-domain Alice (1865), plus Méliès-style trickery. No Disney material.
5. Dashboard: cookieless, anonymous counts (visits, completion by phase, mode chosen, skips, time to 6:66). A phone page that sends a tiny steering signal. Needs a backend (for example a Cloudflare Worker with a KV or D1 store).
6. NOT A CULT references once Dre supplies the logo files.
7. The DarkLabs robot drummer joining the beat.
8. Accessibility pass: captions are on screen already, but check focus order, contrast and screen-reader labels.

## 8. Success metrics
Completion rate per phase, the share of people who reach the cat, the share who choose Calm, skips on the robot scene, median time on page, and any reports of nausea or discomfort (treat each as a bug).

## 9. Working agreement for any AI taking over
- Small slices. Ship each slice to a private preview, then ask Dre before making anything public.
- Always test at 412 px wide and keep the page free of horizontal scroll.
- Keep a changelog. Honest self-ratings only (the last was about 6/10), with the reasons.
- Credit sources in the page or this file when a fact comes from outside.
- If a request is blocked (network, access, licence), skip it and say so.
- A calm philosophy for the process, used lightly: do one thing, then look at it; remove before you add; the empty frame is part of the picture.

## 10. Sources checked
- Hennig et al. (2011), "The Nature and Perception of Fluctuations in Human Musical Rhythms", PLoS ONE, https://pmc.ncbi.nlm.nih.gov/articles/PMC3202537
- Wagenaar (1972), "Generation of random sequences by human subjects: a critical survey of literature", Psychological Bulletin 77, 65-72 (citation confirmed, full text not read).
- Planck 2018 results VI, https://ui.adsabs.harvard.edu/abs/2020A%26A...641A...6P/abstract (cold dark matter density 0.120 h^-2, baryons 0.0224 h^-2, H0 about 67.4, so roughly 26% and 5% of the total).
- Same-document View Transitions reached cross-browser support in Oct 2025, https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
- Flashing limits: WCAG 2.3.1 Three Flashes or Below Threshold, see https://kb.daisy.org/publishing/docs/wcag/three-flashes-or-below-threshold.html (sources disagree on the small-area exemption, check the W3C text before relying on it).
- Track used as mood reference: Mat Zo, "Astatine (Extended Mix)", https://open.spotify.com/track/2TPeZTFa1Q45AUZ6txxXUI (not sampled or reproduced).

## 11. Ready-made prompt for another AI
> You are continuing "Mallard Protocol", a single-file canvas and Web Audio experience (file: labs/mallard/index.html). Read BLUEPRINT.md first. Follow section 2 without exception. Pick one item from section 7, build it as a small slice, test at 412 px wide, and report what you changed, what you could not verify, and an honest rating out of 10.

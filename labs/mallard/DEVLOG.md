# Development log: DazzleDre//\DreDazzle / Mallard Protocol

Newest entries at the bottom. Only claims that were checked are marked "verified". Everything else is marked as not verified.

## Roles
- **Dre**: human director, final creative authority, tester, owner of accounts and deployment.
- **Claude Code**: implementation, tests, documentation. Cannot touch DNS, Cloudflare or accounts from the sessions so far.
- **Other AI tools** (ChatGPT, Gemini, Jules, Antigravity, Dola, Codex): possible collaborators. No integration has been built, so none of them has been shown to communicate with this project automatically. Handoff is by files (`BLUEPRINT.md`) pasted by a human.

## 2026-10-13 to 16: Beat Match (the original puzzle)
- A first rhythm puzzle: listen to a target beat, rebuild it on a kick/snare/hat grid, 7 levels.
- Feedback from Dre: needs clearer "correct" signal, more guidance, incremental hints, green feedback, an animated success, a bell ding.
- Added: how-to panel, green/red Check feedback, progressive hints, win animation, a single bell ding. Moved into `labs/`.
- Lesson: a link to a private test was added to the public homepage by mistake and was removed. Check where a domain actually points before adding a link.

## 2026-10-19: Beat Match Roads
- Branching journey with ear training (A/B tests, swing, sidechain), colour-coded lanes, count labels, near-miss feedback, XP and stickers, hand-seeded randomness (a scribble seeds the generator).
- Research logged: people avoid repeats when asked for randomness (Wagenaar 1972); real timing drift is long-range correlated (Hennig et al. 2011).

## 2026-10-19: Mallard Protocol v1 to v7
- v1: warning screen with Calm / Full / Intense (opt in), toy duck, gestures, stereo squeak.
- v2 to v3: cat reveal; the cat was redrawn from a plain oval into a hand-inked manga cat (ink outline, flood colour, screentone, tabby stripes, neon tribal marks, chest mandala).
- v4: 6:66 robot scene (at 426 s), with skip, Esc, calm-mode swap, `#horror` shortcut.
- v5: mini games: Echo, Odd eye, Labyrinth, Beat lock.
- v6: starship scene (time dilation, cosmic web, lensing, two-places-at-once).
- v7: Wonderland scene (tap objects to grow or shrink, floating grin, music-box arpeggio).
- Self-rating at this point: about 6/10 (critic's view); short of 7 because of no real media, simple synthesis, no playtest.

## 2026-10-19: v8 music engine (PR #10, draft)
- 48-bar progressive loop at 126 BPM: intro, build, main, breakdown, rebuild.
- Syncopation (3+3+2 bass, ghost kicks and clap, one-bar kick dropouts), polyrhythm (5-step arp over 16), reverb, ping-pong delay, sidechain ducking, phaser, Haas widening, autopan, Shepard-Risset tone, HRTF-orbiting bells, whispers, risers.
- **Verified (headless Chromium):** each of the five sections renders with no clipping and no errors (peak 0.15 intro, about 0.8 main and rebuild, RMS 0.04 to 0.13).
- **Not verified:** how it sounds, how it sounds on a phone speaker, how the HRTF bell lands without headphones.

## 2026-10-19: checkpoint (handoff review)
State found:
- `main` contains `labs/` with the index, Beat Match, Beat Match Roads and Mallard (up to the Wonderland scene). Homepage `index.html` is the original links page.
- Draft PR #10 (music engine) is open and not merged.
- Other open draft PRs in the repo belong to other sessions (shop prototype, Greentea Peng tribute, wobbly collab page, MULE game, DreDOS v0.1 marked "do not merge"). They were not touched.
- A front-door Worker (`dre-front-door`) is described in PR #7 as serving `dre.me.uk`, with Dub as fallthrough. So merging files to this repo does not by itself make a `/labs/` page appear on `dre.me.uk`.
- A public URL for `labs/mallard/` was **not verified**: the AI sandbox cannot reach `dre.me.uk` or the github.io address (connection refused by its proxy).
Regression evidence (headless Chromium, fake clock fast-forward, branch head): phases 1 to 8 advance, games 0 to 5 advance, the end card appears, the 6:66 robot appears and ends. No page errors.

## Known blockers
See `README.md`. In short: no verified deployment, OBS audio capture, no DNS/Cloudflare access for the AI session, logo and photos not retrievable, no playtest notes.

## Notes for the OBS audio issue (not verified here)
This is a documented issue on Dre's machine and was not reproduced by the AI. Questions worth checking, in order: Is the page's audio device the one OBS is listening to? Is the browser tab muted or routed to a different output (TV via HDMI)? Does OBS capture it as Desktop Audio, an Application/Window audio source, or a Browser Source? The page needs a click before it makes sound, so the audio only starts after the Start button.

## Reusable toolkit ideas (for later, not started)
- A checklist for "private preview first, public second".
- A safety checklist for flashing, motion and loud sound (the three modes and skip buttons used here).
- A headless "journey regression" script (fast-forward clock, assert phases, check audio levels) that any AI can run before a handoff.
- The `BLUEPRINT.md` handoff prompt as a template.
- Possible later packaging as a Claude directory plugin. Not started.

## Next decision needed from Dre
1. Listen to the v8 score and say keep / change / revert.
2. Say whether PR #10 should be merged.
3. Decide where the public experiment should live (clickfiction or another host) and who sets up DNS.

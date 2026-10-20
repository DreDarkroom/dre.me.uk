# QUEUE: small things to build and try next

Rule: these are things to *do*, not plans. Take the first unchecked item, build it, run the tests, commit, tick it only with evidence (command and result in the dev log). One item per run unless two are tiny. Never weaken the safety rules in `AGENTS.md`.

Each item says what to change, how it is checked, and what "stellar" looks like (the extra mile, optional).

- [ ] **Q1. Cat marks follow the arpeggio.** In `drawCat` (labs/mallard/index.html), make the glowing tribal marks brighten with `MB.arp[i % 5]` (the five arpeggio pips) by at most 35 percent, with the existing smooth decay. No new flashing. Check: tests pass; screenshot at bar 20 shows marks of different brightness; the Calm mode uses at most half the effect. Stellar: marks on the left side follow the left-panned notes, right side the right.
- [ ] **Q2. Tunnel breathes with the kick.** In the tunnel scene, scale ring spacing by `1 + 0.06 * MB.kick` and rotation speed by the section (`MB.sect`). Check: tests pass; no motion above 3 changes per second of whole-screen brightness; Calm halves it.
- [ ] **Q3. Bells paint.** When a bell event starts (`MB.bell`), spawn one paint splat on the wall at the bell's screen azimuth (the same x the marker uses), colour from `hue + 200`. Check: tests pass; a splat appears within 0.2 s of the bell event in a screenshot sequence.
- [ ] **Q4. DISCOMBOBULATED moment (labyrinth).** Halfway through the labyrinth (after the player's 8th move), mirror the swipe and arrow directions for 6 seconds with the caption `DISCOMBOBULATED`, a low detuned sound and a 3D whoosh, then restore with the caption `STELLAR`. Skipped entirely in Calm mode. Check: a unit-style test that the mirrored mapping is applied during the window and restored after; skip button still works.
- [ ] **Q5. Clean take.** When recording starts, fade out the Sound, Record and Gestures pills (keep a tiny red dot), and restore them on stop. Check: a new test records 2 s and asserts the pills are hidden during recording and visible after, and that the saved video is still non-silent.
- [ ] **Q6. Beat Match "Labs" link.** On `labs/beatmatch/`, make the "Labs" link reachable before pressing Start (move it above the start screen layer or add a small link on the start screen). Check: a Playwright click on the link works on a fresh load.
- [ ] **Q7. Whisper ripples.** Whisper events (add an `emit` in `whisper()`) draw a slow ring ripple at the whisper's stereo position. Check: tests pass; event counted in `MB.seen.whisper`.
- [ ] **Q8. Section titles.** On each section change show a 2-second small caption near the dial (`INTRO`, `BUILD`, `MAIN`, `BREAKDOWN`, `REBUILD`) that fades smoothly (no flashing). Check: tests pass; text appears in a screenshot at a section start bar.
- [ ] **Q9. Auto quality.** If the average frame time over 1 second exceeds 28 ms, drop the canvas scale (DPR) one step (never below 0.6), and step back up after 30 smooth seconds. Check: unit test of the decision function; no change at normal speed. (Read DevelopDrop's approach for ideas; do not copy its code.)
- [ ] **Q10. Euclidean rhythm helper.** Add a tested pure function `euclid(k, n)` and use `euclid(5, 16)` to show the 5-against-16 relationship as a ghost ring on the dial. Check: unit tests for `euclid(3,8)`, `euclid(5,16)`; dial still renders.

## Done
(nothing yet)

# Roadmap: DazzleDre//\DreDazzle / Mallard Protocol

Mallard Protocol is the first playable chapter. This file separates what is done, what is the next small step, and what is a larger future experiment. Nothing under "Future" exists yet.

## Done and verified (see DEVLOG.md)
- The playable journey: toy duck, cyborg reveal, illusions, manga cat, five mini games, Wonderland, 6:66 robot.
- The v8 score: 48-bar progressive loop with syncopation, polymeter, stereo tricks and spooky SFX. Levels checked offline (no clipping). Not yet judged by ear.
- **Music event bus (v9, first audio-reactive step).** The score emits step, bar, kick, arpeggio and bell events stamped with the time they will be heard. The picture releases them when the audio clock (minus output latency) reaches them. Currently drives: a small dial at the top centre (16 ticks for the bar, 5 pips for the arpeggio cycle, a line joining the sounding pip to the current step, a kick ring), a glowing dot that follows an orbiting bell around a top-down view of the room, and a gentle colour shift at section changes (bars 8, 16, 32, 40). Verified in headless Chromium: events are produced and consumed, the colour shift fires, audio levels are unchanged, the full journey still runs. Not verified: how it looks and feels on a real phone and TV.

## Done: in-page recorder (v10)
A **Record** button (top right) saves the picture and the page's own master audio to a video file (WebM, or MP4 where that is all the browser offers) on the device. It does not use OBS, a microphone or any upload. While recording, the dial and the captions are drawn onto the canvas so they appear in the video; the normal caption text is hidden to avoid doubling. It stops by itself after 8 minutes. After stopping, a panel previews the video with Save and Close buttons.
- Verified in headless Chromium: a 4.7 s recording produced a 1.5 MB `video/webm;codecs=vp9,opus` file; its audio decoded with non-silent level (RMS 0.146); the video track was 412 x 860; the button timer, the caption hand-over and a second recording all worked; no page errors; the earlier audio-level and full-journey regression checks still pass.
- **Not verified:** a real phone, a TV at 1080p, Safari or iPhone (MP4 fallback untested), whether Save downloads in Dre's browser, or that this solves the OBS capture problem on Dre's machine.
- **Known limits:** the robot's spoken line in the 6:66 scene uses the browser's speech engine and is **not** in the recording (the sound effects and music are). If Sound is switched off, the audio is silent. Recording at full phone resolution makes large files (about 30 MB a minute at the chosen 4 Mbps).

## Next small milestone (recommended, not started)
Decide with Dre after he has tried the recorder: either (a) make the 6:66 voice line capturable by replacing the browser speech with a synthesised or pre-rendered voice, or (b) add a "clean mode" like DevelopDrop's (hide the Record and Sound pills during a take).

## Larger experiments (separate, one at a time)
1. **Audio-reactive scenes.** Use the same event bus to drive scene geometry: the cat's tribal marks follow the arpeggio, the tunnel's polygon sides follow the 5-against-16 pattern, bells place visual elements where they sound, major section changes become cinematic cuts. Rule: no flashing above 3 times per second, and a Calm mode that reduces all of it.
2. **Production layer.** More neurofunk-style bass design (stacked detuned saws, moving band-reject or phaser filters, waveshaping, resampled layers), tighter section transitions, more rhythmic variation, controlled escalation. All original; no copied tracks or arrangements.
3. **Maths-and-music piece.** A chapter built on a single mathematical idea made audible and visible (for example primes, Euclidean rhythms, or the 5-against-16 cycle repeating after 80 steps), in the spirit of Max Cooper's practice.
4. **Live performance rig.** Projection, reflective surfaces, physical movement, lighting and live control. See Research (nothing reliable found on the Salt-Wax apparatus).
5. **Phone as remote.** Steering and triggering from a phone. DevelopDrop's roadmap describes a WebRTC pairing approach worth reusing.
6. **Reusable audiovisual instrument.** Pull the event bus, the Calm/Full/Intense safety model and the score engine out of the single file into a small library, so other chapters can share them.
7. **Public deployment.** See `deploy/labs/README.md` once PR #11 is merged. Not deployed.

## Research notes (what was found, and how sure we are)
- **Salt-Wax spinning-head apparatus: not identified.** Searches found no performance, artist or apparatus with that name. Related but different results (not confirmed as what Dre meant): live projection hybrids using analogue and digital tools, a Scottish performance called *Waxen Figures* using wax and the human form, and expanded-cinema work with rotating colour-filter wheels. Needed from Dre: the artist or show name, venue or year, or a photo or video, before any technique is named.
  - Practical, safe equivalents to explore regardless: projection onto a slowly rotating matte or mirrored surface (a lazy-susan style turntable with a guarded motor, or a hand-turned disc), a hand-held mirror or prism in a projector beam, a rotating coloured-filter wheel on a lamp, live control from a MIDI pad or phone. Safety first: slow rotation, guarded and fixed parts, no strobing, check the venue's rules for projection and moving equipment. These are ideas, not instructions for a specific apparatus.
- **Max Cooper.** His *Emergence* show is described as telling the story from the Big Bang to modern society, with mathematical themes (for example the distribution of the primes), made with video artists and two mathematicians. Reported setup: Ableton Live with Max for Live on one laptop sending MIDI data to two other laptops running Resolume, with visuals across several screens. Sources: [Ableton blog](https://www.ableton.com/de/blog/composing-infinity-max-cooper-his-new-album/) (German), [Max Cooper's RA review page](https://www.maxcooper.net/ra-review-emergence-tresor-berlin). The same idea (one score sending events to separate visual engines) is what the Mallard event bus starts to do. Fibonacci and the golden ratio were not confirmed in the sources found.
- **Noisia / neurofunk.** Noisia's own production methods were not found. General neurofunk practice reported by tutorials and forums: detuned saw stacks, modulated band-reject filters, distortion and waveshaping, resampling and layering several processed copies. Treat these as general techniques, not as claims about Noisia.
- **DevelopDrop (verified by reading its public repository, read-only).**
  - It is a mature project (version 3.3.1 at the time of reading) with `README.md`, `ROADMAP.md` and `CLAUDE.md`. Spell it **DevelopDrop**, not "Develop Drop". It is the "steady" version; new ideas go first in **DreVelopDrop**, an experimental sister repository with a studio page and plain ES-module source.
  - Relevant features: a sequencer-to-picture event queue released when events are *heard* (the pattern now used in Mallard), a "journey" mode that raises tempo while the picture thickens, builds and drops, MIDI mapping, performance recording and playback, a recorder with several video modes, a clean fullscreen mode meant for streaming and OBS, and phone touch and pen gestures.
  - Its roadmap already lists a phone remote (WebRTC) and streaming a performance as events. These match Mallard's own wishes.
  - Its rules say no invented branding, logos or lore, and that deploying or renaming needs the owner's go-ahead. So Mallard should share ideas and, later, a small event format, not edit or relabel DevelopDrop.
  - Not verified: whether its code can be reused inside Mallard as is (there is no package or API for that). No code was copied.

## Principles
- Preserve the playable journey and the existing score. Add, do not replace.
- One workstream at a time. Verified claims only.
- Safety first: no strobing, Calm mode, skip buttons.
- Original work only: no copied tracks, arrangements or visuals.

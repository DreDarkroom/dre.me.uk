# DazzleDre//\DreDazzle: Mallard Protocol

**DazzleDre//\DreDazzle** is Dre's wider creative universe: experimental audiovisual toys, games and tools made with AI collaborators under human direction. Repository slug: `DazzleDre-DreDazzle`.

**Mallard Protocol** is the first experiment inside it. It is not the name of the whole repository.

## Origin story
It began as a rhythm puzzle called Beat Match: listen to a beat, rebuild it on a grid. Dre played it, wanted more colour, more music theory and more strangeness, and asked for a trippy, dark-techno journey with a plastic duck that turns out to be a cyborg, a hand-inked striped cat, optical illusions, stereo trickery and a scary robot at 6 minutes 66 seconds. The puzzle came back as a lock inside the journey. Dre is the creative authority; Claude Code wrote and tested the code.

## Where things are
| Path | What |
|---|---|
| `labs/mallard/index.html` | Mallard Protocol: one self-contained HTML file, no build step |
| `labs/mallard/BLUEPRINT.md` | Design rules, timeline, music engine notes, backlog, handoff prompt for other AI tools |
| `labs/mallard/DEVLOG.md` | Dated log of milestones, evidence, discoveries and blockers |
| `labs/mallard/ROADMAP.md` | What is done, the next small milestone, larger experiments, and research notes |
| `labs/beatmatch/`, `labs/roads/` | The earlier puzzle versions (first Beat Match; Beat Match Roads) |
| `labs/index.html` | Labs index |

## Run it
Open `labs/mallard/index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open /labs/mallard/
```

Turn sound on. Headphones give the best stereo effect. Add `#horror` to the URL to jump to the robot scene after 6 seconds.

## Safety
Nothing flashes more than 3 times per second. A warning screen offers Calm, Full and an opt-in Intense mode. Skip buttons exist in the games and the robot scene. Moving patterns can make some people dizzy; stop if you feel unwell.

## Current milestone
Working prototype, version 10 (v9 plus an in-page **Record** button that saves the picture and the page's audio to a video file on the device; v9 was the v8 score plus a first audio-reactive step: a music event bus driving a small dial, an orbiting-bell marker and section colour shifts): toy duck, cyborg reveal, three illusions, manga cat reveal, five mini games (Echo, Odd eye, Labyrinth, Beat lock, Starship), Wonderland scene, 6:66 robot, and a new 48-bar progressive score. See `DEVLOG.md` for what is verified and what is not.

## Outstanding blockers
1. **Deployment not verified.** The files are in the repo, but nobody has confirmed a public URL that serves them. `dre.me.uk` is handled by a front-door Worker and Dub, so a repo page may not appear there.
2. **Audio capture for screen recordings.** OBS is not capturing the project's audio correctly (documented issue). The in-page Record button is a workaround; it has not yet been tried on Dre's machine. The robot's spoken line is not captured by it.
3. **No Cloudflare, DNS or domain access** for the AI session, so no subdomain (for example on clickfiction) has been created.
4. **NOT A CULT logo and photos** have not been used: the build sandbox could not reach notacult.co.uk.
5. **No human playtest notes yet**, and nobody has listened critically to the new score.

## Credits and sources
Concept and direction: Dre (DreDarkroom). Code and drawing: Claude (Anthropic). Mood reference: Mat Zo, "Astatine (Extended Mix)" (nothing sampled). Research: Hennig et al. 2011 (PLoS ONE) on timing in human rhythm; Wagenaar 1972 (Psychological Bulletin) on human randomness; Planck 2018 results VI for the dark-matter figures. All text, drawings and sounds are original or synthesised.

## Licence
Private working repository. All rights reserved for now. Logos, photography and third-party media keep their own terms.

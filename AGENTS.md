# AGENTS.md: instructions for AI coding agents (Jules, Codex, Claude Code, Antigravity and others)

Project: **DazzleDre//\DreDazzle** (short name **Daz**). First chapter: Mallard Protocol (`labs/mallard/`). Human director: Dre (DreDarkroom). The AI briefing pack (AI-PACK.md), task queue and overnight rules live in the private repository `DreDarkroom/DazzleDre-DreDazzle`, not here. If you do not have them, ask Dre before changing anything.

## Rules that always apply
1. Work on a branch and open a draft pull request. Never push to `main`. Never merge your own pull request.
2. Never deploy, and never change DNS, Cloudflare, Dub, accounts, billing or repository settings. Config files for deploys may be written, but only Dre runs them.
3. No secrets in the repo, in prompts or in logs. If you find one, stop and report it without repeating it.
4. Do not claim something works unless you ran it. Quote the command and the real output. Label claims VERIFIED, UNVERIFIED or PLANNED.
5. Safety: nothing may flash more than 3 times per second in any mode; keep Calm mode calmer than Full; keep skip buttons; never claim a visual induces hypnosis.
6. Original work only: no copied tracks, arrangements, characters or images. Record the licence of anything third-party.
7. Preserve what works: add, do not replace. Keep `labs/mallard/index.html` behaviour identical unless the task says otherwise. One workstream at a time.
8. UK English. Never write "coming soon". Spell DevelopDrop exactly like that.
9. End every report with a HANDOFF BLOCK (format in the private repo's AI-PACK.md, Part B).

## How to check your work
```
cd tests
npm install
npx playwright install chromium
npm test            # 5 tests: modes, full journey, audio levels, event bus, recorder
```
Or `docker compose run --rm tests` from the repo root (see `docker/README.md`). Environment variables: `PLAYWRIGHT_PATH`, `CHROMIUM_PATH`, `MALLARD_URL`.

## Where things are
- `labs/mallard/index.html`: the playable experience (one file). `labs/mallard/*.md`: README, DEVLOG, ROADMAP, BLUEPRINT.
- The briefing (AI-PACK.md), task queue (QUEUE.md) and overnight rules (OVERNIGHT.md) are in the private repo.
- `deploy/dazzle/`: Cloudflare Worker config for dazzle.dredarkroom.com (not deployed).
- Useful test hooks in the page: `window.__startStep` (set before load: start the score at bar*16), globals `phase`, `game`, `horror`, `MB` (music event bus), `go(n)`, `startGames()`.

## When you finish
Update `labs/mallard/DEVLOG.md` (additive), tick the item in the private repo's QUEUE.md only if you have evidence, and open a draft pull request describing what you verified and what you could not.

# Docker helpers

Docker is optional. It gives you a clean, repeatable box so "it works on my machine" means the same on every machine (yours, Jules's, a scheduled agent's).

| Command (run in the repo root) | What it does |
|---|---|
| `docker compose up serve` | Serves `labs/` at http://localhost:8080/ so you can try `/mallard/` exactly as a static host would. Press Ctrl+C to stop. |
| `docker compose run --rm tests` | Builds a container with Chromium, runs the 5 regression tests (journey, audio levels, event bus, recorder) and prints pass or fail. |
| `docker compose run --rm dryrun` | Runs the Cloudflare `wrangler deploy --dry-run` check on `deploy/dazzle/`. It cannot deploy and needs no login. |

## Windows notes (DreDarktop)
- Install Docker Desktop and let it use WSL 2 (it will offer to enable it; this needs a restart and hardware virtualisation turned on in the BIOS/UEFI).
- Run the commands from PowerShell or Windows Terminal in the repo folder.
- Containers cannot play sound to your speakers, so they test the audio *signal* (levels, silence, clipping), not what it sounds like. Listen on the real page.
- Docker Desktop's licence is free for personal use and small businesses; larger companies need a paid plan. Check the current terms on docker.com.

## Status
Written but not run: the machine that wrote these files had the Docker command but no running Docker engine. The `compose.yml` was syntax-checked; the images were never built. If a command fails, copy the error into the next AI handoff.

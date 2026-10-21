# Handoff to a local session: DazzleDre//\DreDazzle (Daz)

Written for a local Claude Code session on Dre's laptop (DreDarktop). Read `AGENTS.md` first and follow its rules. Briefing, task queue and overnight rules are in the private repo `DreDarkroom/DazzleDre-DreDazzle`.

## Why this handoff
The cloud session's network policy blocks the Cloudflare connector (403 from the proxy), and cloud credits are limited. Local work uses Dre's own connection and costs less.

## State (VERIFIED unless stated)
- Mallard Protocol v10 is in `labs/mallard/index.html`. Five headless tests passed in the cloud sandbox (`cd tests && npm install && npx playwright install chromium && npm test`).
- Deploy config for `dazzle.dredarkroom.com` is in `deploy/dazzle/wrangler.jsonc`. Dry run was clean. UNVERIFIED: never deployed.
- AI briefing documents were moved out of this public repo. They remain in older commits of PR #11's history (no secrets in them).
- UNVERIFIED: real-device behaviour, how the score sounds, Docker builds, the OBS audio issue, Cloudflare zone details.

## First task
Add `dazzle.dre.me.uk` as a second address, as a config change only.
1. In `deploy/dazzle/wrangler.jsonc`, add a second `custom_domain` route for `dazzle.dre.me.uk` (keep the existing route).
2. Run a dry run (`npx wrangler@4 deploy --dry-run -c deploy/dazzle/wrangler.jsonc`) and quote the real output.
3. Do NOT deploy. Do NOT change DNS, Cloudflare, Dub, accounts or billing. Dre runs deploys.

## Questions Dre must answer first (do not assume)
1. Which Cloudflare zone holds `dre.me.uk`, and is it in Dre's single Cloudflare account?
2. Should `dazzle.dre.me.uk` be a second route on the same Worker, or a redirect to `dazzle.dredarkroom.com`?
3. Does a wildcard record or the existing front-door Worker already catch `*.dre.me.uk`? (A read-only DNS and Worker-route check will show this.)
Custom Domains need the zone to be active in the same account and no existing CNAME for that hostname.

## Read-only Cloudflare check (only once the connector works locally)
List zones, DNS records for `dre.me.uk`, and Worker routes. Report findings. Change nothing without Dre's explicit approval for that exact change.

## Other open items for Dre
- Merge the import PR in the private repo; turn on branch protection for its `main`.
- Close PR #11 in the public repo once the private repo has everything.
- Create the Dub link `dre.me.uk/daz` after the site is live.
- Overnight scheduled runs: NOT approved, none created.
- Try Mallard and Record on a phone and send notes.

## Rules reminder
Draft PRs only; never push to `main`; no secrets anywhere; label claims VERIFIED, UNVERIFIED or PLANNED; nothing flashes more than 3 times per second; UK English; never write "coming soon"; end reports with a HANDOFF BLOCK.

# Cloudflare access: how to give AI helpers what they need and nothing else

Decision (Dre, 20 Oct 2026): everything lives in one Cloudflare account, including dredarkroom.com and the other domains. Dre wants AI helpers to be able to work with Cloudflare, but only on things approved for this project.

## What exists today (checked)
- Claude Code has a read-oriented Cloudflare connection: it can list Workers, read a Worker's code and search the docs. The same connector also offers create and delete tools for KV, R2 and D1, which have not been used. It has no DNS, zone or deploy tools. Nothing has been changed in the account.

## Recommended: agents propose, Dre approves, a deploy job does the work
1. Agents (Claude Code, Jules, Antigravity) write code and config and open pull requests. They never hold Cloudflare credentials.
2. A narrowly scoped Cloudflare API token lives only in the private repo's GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Nobody pastes it into a chat.
3. Deploys run only when Dre presses "Run workflow" (`deploy-dazzle.yml`), with "Dry run" ticked by default.
This gives a slick, repeatable deployment without giving any AI the keys.

## The token (create in the Cloudflare dashboard: Manage Account > Account API tokens > Create token > Custom token)
Name: `dazzledre-deploy`. Permissions, as narrow as possible:
- Account: Workers Scripts: Edit
- Zone: Workers Routes: Edit (zone `dredarkroom.com` only)
- Zone: DNS: Edit (zone `dredarkroom.com` only), because creating a Custom Domain also creates a DNS record. Whether this is strictly needed is not verified; try without it first, and add it only if the first deploy asks for it.
- Zone: Zone: Read (zone `dredarkroom.com` only)
Resources: this account; Zone: specific zone `dredarkroom.com`. Do not select "All zones". Add an expiry date (for example 30 days) and, if your connection has a fixed address, an IP restriction. Cloudflare's own Workers CI/CD docs recommend scoping the token to the one account and as few zones as possible. The Cloudflare dashboard shows the secret once: copy it straight into GitHub's secret box.

## What needs explicit approval every time
Any DNS record change, any new or changed Worker route or custom domain, deleting anything, changing the `dre-front-door` Worker or Dub, anything on other domains, anything that costs money.

## Alternative (Dre-run, no GitHub secrets)
From DreDarktop: `npx wrangler@4 login`, then `npx wrangler@4 deploy -c deploy/dazzle/wrangler.jsonc` from the repo root. The login stays on that laptop.

## Not recommended
Handing an AI an all-powerful "global API key" or a token covering all zones, or a standing connection that can delete resources. If you would rather not leave the create and delete tools of the current connector enabled, disconnect that connector in Claude's connector settings and reconnect it when needed.

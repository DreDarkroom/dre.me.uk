# dazzle.dredarkroom.com: deploy notes

Status: **config only. Not deployed.** Nothing here has touched Cloudflare, DNS or any live service.

`wrangler.jsonc` defines a static Worker named `dazzledre` that serves the repo's `labs/` folder at `https://dazzle.dredarkroom.com/`:

- `/` Labs index (to be replaced by a DazzleDre landing page later)
- `/mallard/` Mallard Protocol
- `/roads/` Beat Match Roads
- `/beatmatch/` Beat Match

`workers_dev` and preview URLs are off, so the only public address is the custom domain. This replaces the earlier `labs.dre.me.uk` idea (Dre chose `dazzle.dredarkroom.com`). To also serve it at `labs.dre.me.uk` later, add a second route to the `routes` list.

## Checked here (sandbox, read-only access to Cloudflare)
- `npx wrangler@4 deploy --dry-run -c deploy/dazzle/wrangler.jsonc` from the repo root reads the `labs/` assets and exits cleanly.
- Serving `labs/` at a local web root, the index and all three pages load with the right titles and no 404s.
- A read-only look at the Cloudflare account's Workers shows no Worker named `dazzledre`, `dre-labs` or `dredos` yet, so this would not overwrite anything.

## Not known (could not be checked from the sandbox)
- Whether the `dredarkroom.com` zone is in the same Cloudflare account you deploy with. A Custom Domain needs an active zone in that account, and cannot be created on a hostname that already has a CNAME record.
- Whether a `dazzle` DNS record already exists.
- Whether the sandbox can resolve the hostname: it cannot reach the public internet for DNS, so nothing about live resolution was verified.

## To deploy (Dre, with Cloudflare auth)
1. Confirm `dredarkroom.com` is a zone in your Cloudflare account and that no `dazzle` record exists (or remove it on purpose).
2. From the repo root: `npx wrangler@4 deploy -c deploy/dazzle/wrangler.jsonc`
3. Wrangler creates the Worker, the custom-domain DNS record and a certificate. If a `dazzle` CNAME already exists it will refuse and say so.
4. Verify: open `https://dazzle.dredarkroom.com/` and `https://dazzle.dredarkroom.com/mallard/`, or run `curl -I https://dazzle.dredarkroom.com/` and expect `200`. Certificates can take a few minutes.

## Notes
- This does not touch the `dre-front-door` Worker or Dub, which serve `dre.me.uk`.
- To undo: delete the `dazzledre` Worker and its custom domain in the Cloudflare dashboard.
- Everything under `labs/` becomes public once deployed (pages carry `noindex`, but that only asks search engines to skip them).
- Known small issue: on Beat Match the "Labs" link is hidden behind the Start screen until you press Start.

# labs.dre.me.uk: deploy notes

Status: **config only. Not deployed.** Nothing here has touched Cloudflare, DNS or any live service.

`wrangler.jsonc` defines a static Worker named `dre-labs` that serves the repo's `labs/` folder at `https://labs.dre.me.uk/`:

- `/` Labs index
- `/mallard/` Mallard Protocol
- `/roads/` Beat Match Roads
- `/beatmatch/` Beat Match

`workers_dev` and preview URLs are off, so the only public address is the custom domain.

## Checked here (sandbox, no Cloudflare access)
- `npx wrangler@4 deploy --dry-run -c deploy/labs/wrangler.jsonc` from the repo root reads 10 files from `labs/` and exits cleanly.
- Serving the `labs/` folder at a local web root, the index and all three pages load with the right titles and no 404s, so relative links work at a subdomain root.

## To deploy (Dre, with Cloudflare auth)
1. `dre.me.uk` must be a zone in the Cloudflare account you log in to wrangler with.
2. From the repo root: `npx wrangler@4 deploy -c deploy/labs/wrangler.jsonc`
3. Wrangler creates the Worker and the `labs` custom-domain DNS record. If a `labs` DNS record already exists, Cloudflare will refuse and say so. Remove or rename the old record first, on purpose.
4. Verify: open `https://labs.dre.me.uk/` and `https://labs.dre.me.uk/mallard/`, or run `curl -I https://labs.dre.me.uk/` and expect `200`. Certificate issuance can take a few minutes.

## Notes
- This does not change the `dre-front-door` Worker or Dub, which serve `dre.me.uk` itself.
- To undo: delete the `dre-labs` Worker and its custom domain in the Cloudflare dashboard.
- Pages carry `noindex`. Anything in `labs/` becomes public once deployed, so only put things there you are happy to share.
- Known small issue: on Beat Match the "Labs" link is hidden behind the Start screen until you press Start.

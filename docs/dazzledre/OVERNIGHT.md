# OVERNIGHT.md: rules for unattended runs

Purpose: let an AI agent make steady, safe progress while Dre sleeps, by *trying things*, not by writing more plans.

## What a run does (one run = about one hour)
1. Read `AGENTS.md`, this file, `docs/dazzledre/QUEUE.md` and the last 40 lines of `docs/dazzledre/OVERNIGHT-LOG.md`.
2. If a file named `docs/dazzledre/STOP` exists, write one line in the log saying so and do nothing else.
3. Take the first unchecked item in the queue. Build it on the working branch.
4. Run the tests (`cd tests && npm test`). If they fail and you cannot fix them within the run, revert your change and log why.
5. Commit and push to the working branch. Never to `main`. Open or update one draft pull request.
6. Tick the item in `QUEUE.md` only with evidence. Append to `OVERNIGHT-LOG.md`: time, item, what changed, test result, screenshot name if any, anything unverified.
7. Stop. Do not start a second large item.

## Hard limits
- No merging. No deploying. No Cloudflare, DNS, Dub, GitHub settings or account changes. Read-only Cloudflare lookups are allowed.
- No new third-party services, no paid tools, no secrets, no emails or messages to people.
- No more than one pull request open at a time from overnight runs.
- If a task needs a decision from Dre, write the question at the top of the log under `QUESTIONS FOR DRE` and move to the next item.
- Safety rules in `AGENTS.md` always win over finishing a task.

## Kill switch
Dre can stop everything by: (a) adding a file `docs/dazzledre/STOP` on the working branch, or (b) deleting the scheduled tasks in Claude, or (c) revoking the GitHub app's access to the repository.

## Morning summary
At the end of the last scheduled run, write `docs/dazzledre/MORNING.md`: what was built, what passed, what failed, questions for Dre, and the next three queue items.

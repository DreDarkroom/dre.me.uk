# daz-log: local daily development summary

Turns Git history (reliable) and ActivityWatch app time (optional, uncertain) into one Markdown file per day. Standard library only. Needs Python 3.11+ and git. It reads and writes locally and sends nothing anywhere.

## Run it
```bash
python3 tools/daz-log/daz_log.py                      # today, this repo, reports in ~/.daz/reports
python3 tools/daz-log/daz_log.py --date 2026-10-19 --repo path/one --repo path/two
python3 tools/daz-log/daz_log.py --offline            # Git only
```
Reports go to `~/.daz/reports/YYYY-MM-DD.md` by default, outside any repository so they cannot be committed by accident. Use `--out` to change that.

## What a report contains
- **Repository changes (Git):** commits for that local calendar day across all branches, with times, files and line counts. Project name = repository folder name.
- **Observed activity (ActivityWatch):** time while not AFK, split by application. If a window title contains a repository's name, that time is listed per project and marked **(uncertain)**. Application time is not productive time.
- **Blockers and next actions:** only what you write in commit messages as lines starting `Blocked:` / `Next:` / `TODO:`. Nothing is guessed.
- **My notes:** a section for your own text. Re-running replaces only the block between the `daz:begin` / `daz:end` markers, so notes are kept and nothing is duplicated.

## Privacy
- Window titles are read in memory only to match project names. They are never written to the report (tested).
- The report does contain commit subject lines. Do not put secrets in commit messages. Keep `~/.daz` out of any synced or public folder.
- `--aw-url` only accepts localhost, 127.0.0.1 or ::1.
- Not collected: file contents, URLs, browser history, keystrokes, author names.

## ActivityWatch facts used (checked against the ActivityWatch docs and watcher source on 2026-10-20)
- Server default `http://localhost:5600`, API under `/api/0/`, no authentication by default, localhost only.
- `GET /api/0/buckets/` and `GET /api/0/buckets/<id>/events?start=&end=&limit=` (RFC 3339 timestamps; negative limit = no limit).
- AFK watcher events: type `afkstatus`, `data.status` is `afk` or `not-afk`. Window watcher events: type `currentwindow`, `data.app` and `data.title`.
- Not yet verified against a real ActivityWatch install: this was tested only against a fake server shaped like the above. Run it once on the laptop with ActivityWatch open and check the numbers against the ActivityWatch web page at http://localhost:5600.

## Tests
```bash
cd tools/daz-log && python3 -m unittest -v
```
Seven tests: Git evidence and notes, day boundaries, idempotent rewrite that keeps your notes, AFK intersection and title privacy against a fake local server, unreachable server, non-local URL refused, not-a-repo.

## Run it automatically (NOT enabled; nothing here has been installed)
Only do this once you have run it by hand and the numbers look right. Commands below are unverified: I could not test them (this was built in a Linux cloud sandbox, your laptop is Windows).

**Windows (Task Scheduler, built in).** Replace the paths, then run in a normal Command Prompt:
```
schtasks /Create /SC DAILY /ST 22:30 /TN "DazLog" /TR "python C:\path\to\dre.me.uk\tools\daz-log\daz_log.py --repo C:\path\to\repo1 --repo C:\path\to\repo2"
```
If the laptop is often off at 22:30, open the task in Task Scheduler, Settings tab, tick "Run task as soon as possible after a scheduled start is missed".

**Linux or macOS:** a cron line such as `30 22 * * * python3 /path/to/daz_log.py --repo /path/to/repo`.

**Disable:** `schtasks /Change /TN "DazLog" /DISABLE` (re-enable with `/ENABLE`). **Remove:** `schtasks /Delete /TN "DazLog"`. Reports already written stay where they are.

**Recovery:** the script is safe to re-run for any past date; `--date YYYY-MM-DD` rebuilds that day. Git evidence can always be rebuilt. ActivityWatch evidence is only as old as the data ActivityWatch still holds.

## Limits
- Git shows commits, not time spent or work not yet committed (uncommitted changes are not counted).
- Only repositories you pass are scanned. Work in other folders is invisible.
- Timestamps use the machine's local time zone.
- Completed work is whatever the commit subjects say.

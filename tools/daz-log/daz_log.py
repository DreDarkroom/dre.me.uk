#!/usr/bin/env python3
"""daz-log: a local daily development summary from Git history and (optionally) ActivityWatch.

Standard library only. Needs Python 3.11+ and git on the PATH.

Evidence sources:
  - Git: commits, files and line counts per repository for one local calendar day.
  - ActivityWatch (optional): app time while the user was not AFK, read from the local server
    only (default http://localhost:5600). Window titles are used in memory to match project
    names and are NEVER written to the report.

Application time is not productive time. Project matches from window titles are marked uncertain.
Re-running for the same day rewrites only the generated block, so notes you write elsewhere in the
file are kept and nothing is duplicated.
"""
import argparse
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

BEGIN = "<!-- daz:begin (generated; edit outside these markers) -->"
END = "<!-- daz:end -->"
NOTE_RE = re.compile(r"^\s*(blocked|blocker|next|todo)\s*:\s*(.+?)\s*$", re.I)
DEFAULT_OUT = Path.home() / ".daz" / "reports"


def local_day_bounds(day):
    start = datetime.combine(day, datetime.min.time()).astimezone()
    end = datetime.combine(day + timedelta(days=1), datetime.min.time()).astimezone()
    return start, end


def parse_ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def fmt_dur(seconds):
    m = int(round(seconds / 60))
    return f"{m // 60}h {m % 60:02d}m" if m >= 60 else f"{m}m"


# ---------- Git ----------

def git(repo, *args):
    r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=False)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "git failed")
    return r.stdout


def repo_root(path):
    return Path(git(path, "rev-parse", "--show-toplevel").strip())


def git_day(repo, start, end):
    """Commits made in [start, end), de-duplicated across branches, oldest first."""
    fmt = "%x1e%H%x1f%aI%x1f%s%x1f%b%x1f"
    out = git(repo, "log", "--all", "--no-merges", f"--since={start.isoformat()}",
              f"--until={end.isoformat()}", "--reverse", "--numstat", f"--format={fmt}")
    commits = []
    for chunk in out.split("\x1e")[1:]:
        h, when, subject, body, stats = chunk.split("\x1f", 4)
        files = added = removed = 0
        for line in stats.strip().splitlines():
            parts = line.split("\t")
            if len(parts) == 3:
                files += 1
                added += int(parts[0]) if parts[0].isdigit() else 0
                removed += int(parts[1]) if parts[1].isdigit() else 0
        notes = [(m.group(1).lower(), m.group(2)) for m in map(NOTE_RE.match, body.splitlines()) if m]
        commits.append({"hash": h[:7], "when": parse_ts(when), "subject": subject,
                        "files": files, "added": added, "removed": removed, "notes": notes})
    return commits


# ---------- ActivityWatch ----------

def aw_get(base, path, params=None, timeout=5):
    url = base.rstrip("/") + "/api/0/" + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.load(resp)


def merge(intervals):
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def intersect_seconds(s, e, merged):
    total = 0.0
    for ms, me in merged:
        lo, hi = max(s, ms), min(e, me)
        if hi > lo:
            total += (hi - lo).total_seconds()
    return total


def aw_day(base, start, end, project_names):
    """Returns a dict, or {'error': reason}. Titles never leave this function."""
    try:
        buckets = aw_get(base, "buckets/")
    except (urllib.error.URLError, OSError, ValueError) as exc:
        return {"error": f"ActivityWatch not reachable at {base} ({type(exc).__name__})"}
    afk_ids = [b for b, v in buckets.items() if v.get("type") == "afkstatus"]
    win_ids = [b for b, v in buckets.items() if v.get("type") == "currentwindow"]
    if not afk_ids or not win_ids:
        return {"error": "ActivityWatch is running but has no afkstatus and currentwindow buckets for this day"}
    params = {"start": start.isoformat(), "end": end.isoformat(), "limit": -1}

    active = []
    for b in afk_ids:
        for ev in aw_get(base, f"buckets/{b}/events", params):
            if ev["data"].get("status") == "not-afk":
                s = max(parse_ts(ev["timestamp"]), start)
                e = min(parse_ts(ev["timestamp"]) + timedelta(seconds=ev["duration"]), end)
                if e > s:
                    active.append((s, e))
    merged = merge([tuple(x) for x in active])

    apps, matched = defaultdict(float), defaultdict(float)
    for b in win_ids:
        for ev in aw_get(base, f"buckets/{b}/events", params):
            s = max(parse_ts(ev["timestamp"]), start)
            e = min(parse_ts(ev["timestamp"]) + timedelta(seconds=ev["duration"]), end)
            if e <= s:
                continue
            secs = intersect_seconds(s, e, merged)
            if secs <= 0:
                continue
            apps[ev["data"].get("app") or "unknown"] += secs
            title = (ev["data"].get("title") or "").lower()
            for name in project_names:
                if len(name) >= 4 and name.lower() in title:
                    matched[name] += secs
    return {"active": sum((e - s).total_seconds() for s, e in merged),
            "apps": sorted(apps.items(), key=lambda kv: -kv[1]), "matched": dict(matched)}


# ---------- Report ----------

def render(day, tz_name, repos, aw, offline):
    L = [f"### Generated summary for {day.isoformat()} ({tz_name})", ""]
    L += ["Evidence only. Application time is not productive time; items marked (uncertain) are guesses.", ""]
    L += ["#### Repository changes (Git, reliable)", ""]
    total_commits = 0
    for name, commits in repos:
        total_commits += len(commits)
        if not commits:
            L.append(f"- **{name}**: no commits")
            continue
        a = sum(c["added"] for c in commits)
        r = sum(c["removed"] for c in commits)
        first, last = commits[0]["when"].astimezone(), commits[-1]["when"].astimezone()
        L.append(f"- **{name}**: {len(commits)} commit(s), +{a} / -{r} lines, "
                 f"first {first:%H:%M}, last {last:%H:%M}")
        for c in commits:
            L.append(f"  - {c['when'].astimezone():%H:%M} `{c['hash']}` {c['subject']} "
                     f"({c['files']} file(s), +{c['added']}/-{c['removed']})")
    if total_commits == 0 and repos:
        L.append("")
        L.append("No commits found in the scanned repositories for this day.")
    L += ["", "#### Observed activity (ActivityWatch)", ""]
    if offline:
        L.append("- Skipped (--offline).")
    elif "error" in aw:
        L.append(f"- Unavailable: {aw['error']}.")
    else:
        L.append(f"- Active (not AFK) time: {fmt_dur(aw['active'])}")
        for app, secs in aw["apps"][:8]:
            L.append(f"  - {app}: {fmt_dur(secs)}")
        if aw["matched"]:
            L.append("- Time with a project name in the window title (uncertain; titles not stored):")
            for name, secs in sorted(aw["matched"].items(), key=lambda kv: -kv[1]):
                L.append(f"  - {name}: {fmt_dur(secs)} (uncertain)")
        else:
            L.append("- No window titles matched a scanned project name.")
    blockers = [(n, t) for _, cs in repos for c in cs for n, t in c["notes"] if n in ("blocked", "blocker")]
    nexts = [(n, t) for _, cs in repos for c in cs for n, t in c["notes"] if n in ("next", "todo")]
    L += ["", "#### Blockers (from commit messages starting `Blocked:`)", ""]
    L += [f"- {t}" for _, t in blockers] or ["- None recorded."]
    L += ["", "#### Next actions (from commit messages starting `Next:` or `TODO:`)", ""]
    L += [f"- {t}" for _, t in nexts] or ["- None recorded."]
    return "\n".join(L)


def write_report(out_dir, day, block):
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{day.isoformat()}.md"
    generated = f"{BEGIN}\n{block}\n{END}"
    if path.exists():
        text = path.read_text(encoding="utf-8")
        if BEGIN in text and END in text:
            head, rest = text.split(BEGIN, 1)
            _, tail = rest.split(END, 1)
            new = head + generated + tail
        else:
            new = text.rstrip("\n") + "\n\n" + generated + "\n"
    else:
        new = (f"# Daz log {day.isoformat()}\n\n## My notes (kept when the summary is regenerated)\n\n\n"
               f"## Summary\n\n{generated}\n")
    if not path.exists() or path.read_text(encoding="utf-8") != new:
        path.write_text(new, encoding="utf-8")
    return path


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--date", help="local day as YYYY-MM-DD (default: today)")
    p.add_argument("--repo", action="append", help="repository path (repeatable; default: the current one)")
    p.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"report folder (default {DEFAULT_OUT})")
    p.add_argument("--aw-url", default="http://localhost:5600", help="ActivityWatch server (local only)")
    p.add_argument("--offline", action="store_true", help="skip ActivityWatch")
    a = p.parse_args(argv)

    host = urllib.parse.urlparse(a.aw_url).hostname
    if not a.offline and host not in ("localhost", "127.0.0.1", "::1"):
        p.error("--aw-url must be a local address; private activity data is not sent or read remotely")
    day = date.fromisoformat(a.date) if a.date else date.today()
    start, end = local_day_bounds(day)

    roots = []
    for r in (a.repo or ["."]):
        try:
            root = repo_root(r)
        except (RuntimeError, OSError) as exc:
            print(f"skipping {r}: {exc}", file=sys.stderr)
            continue
        if root not in roots:
            roots.append(root)
    if not roots:
        print("no usable Git repository", file=sys.stderr)
        return 2
    repos = [(r.name, git_day(r, start, end)) for r in roots]
    aw = {} if a.offline else aw_day(a.aw_url, start, end, [r.name for r in roots])
    block = render(day, start.tzname() or "local", repos, aw, a.offline)
    print(write_report(a.out, day, block))
    return 0


if __name__ == "__main__":
    sys.exit(main())

import contextlib
import io
import json
import os
import subprocess
import tempfile
import threading
import unittest
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import daz_log

DAY = date(2026, 10, 14)
START, END = daz_log.local_day_bounds(DAY)


def at(hours):
    return (START + timedelta(hours=hours)).isoformat()


def run(cmd, cwd, env=None):
    subprocess.run(cmd, cwd=cwd, check=True, capture_output=True, env={**os.environ, **(env or {})})


def make_repo(root, name="dazproj"):
    repo = Path(root) / name
    repo.mkdir()
    run(["git", "init", "-q", "-b", "main"], repo)
    run(["git", "config", "user.email", "t@example.invalid"], repo)
    run(["git", "config", "user.name", "T"], repo)
    for i, (h, msg) in enumerate([(9, "Add parser"), (11, "Fix parser\n\nBlocked: waiting on API key\nNext: write docs")]):
        (repo / f"f{i}.txt").write_text("a\nb\nc\n")
        run(["git", "add", "."], repo)
        d = at(h)
        run(["git", "commit", "-q", "-m", msg], repo, {"GIT_AUTHOR_DATE": d, "GIT_COMMITTER_DATE": d})
    return repo


class FakeAW(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.endswith("/buckets/"):
            body = {"aw-watcher-afk_h": {"type": "afkstatus"}, "aw-watcher-window_h": {"type": "currentwindow"}}
        elif "afk" in u.path:
            body = [{"timestamp": at(10), "duration": 3600, "data": {"status": "not-afk"}},
                    {"timestamp": at(11), "duration": 3600, "data": {"status": "afk"}}]
        else:
            body = [{"timestamp": at(10), "duration": 7200,
                     "data": {"app": "Code", "title": "dazproj - SECRET-PRIVATE-MESSAGE"}}]
        data = json.dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)


@contextlib.contextmanager
def fake_aw():
    srv = HTTPServer(("127.0.0.1", 0), FakeAW)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{srv.server_port}"
    finally:
        srv.shutdown()
        srv.server_close()


def main(*args):
    with contextlib.redirect_stdout(io.StringIO()):
        return daz_log.main(list(args))


class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = make_repo(self.tmp.name)
        self.out = Path(self.tmp.name) / "out"
        self.report = self.out / f"{DAY}.md"

    def tearDown(self):
        self.tmp.cleanup()

    def args(self, *extra):
        return ["--date", str(DAY), "--repo", str(self.repo), "--out", str(self.out), *extra]

    def test_git_evidence_and_notes(self):
        self.assertEqual(main(*self.args("--offline")), 0)
        text = self.report.read_text()
        self.assertIn("**dazproj**: 2 commit(s), +6 / -0 lines", text)
        self.assertIn("Add parser", text)
        self.assertIn("- waiting on API key", text)
        self.assertIn("- write docs", text)

    def test_other_days_excluded(self):
        main("--date", "2026-10-15", "--repo", str(self.repo), "--out", str(self.out), "--offline")
        self.assertIn("no commits", (self.out / "2026-10-15.md").read_text())

    def test_idempotent_and_keeps_manual_notes(self):
        main(*self.args("--offline"))
        first = self.report.read_text()
        main(*self.args("--offline"))
        self.assertEqual(first, self.report.read_text())
        edited = first.replace("## My notes (kept when the summary is regenerated)\n",
                               "## My notes (kept when the summary is regenerated)\nMy own note\n")
        self.report.write_text(edited)
        main(*self.args("--offline"))
        self.assertEqual(edited, self.report.read_text())
        self.assertEqual(self.report.read_text().count(daz_log.BEGIN), 1)
        self.assertEqual(self.report.read_text().count("Add parser"), 1)

    def test_activitywatch_intersection_and_privacy(self):
        with fake_aw() as url:
            main(*self.args("--aw-url", url))
        text = self.report.read_text()
        self.assertIn("Active (not AFK) time: 1h 00m", text)
        self.assertIn("- Code: 1h 00m", text)
        self.assertIn("dazproj: 1h 00m (uncertain)", text)
        self.assertNotIn("SECRET-PRIVATE-MESSAGE", text)

    def test_activitywatch_unreachable_is_reported_not_fatal(self):
        self.assertEqual(main(*self.args("--aw-url", "http://127.0.0.1:9")), 0)
        self.assertIn("Unavailable: ActivityWatch not reachable", self.report.read_text())

    def test_remote_activitywatch_refused(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            daz_log.main(self.args("--aw-url", "http://example.com:5600"))

    def test_not_a_repo_returns_error(self):
        plain = Path(self.tmp.name) / "plain"
        plain.mkdir()
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(daz_log.main(["--date", str(DAY), "--repo", str(plain), "--out", str(self.out), "--offline"]), 2)


if __name__ == "__main__":
    unittest.main()

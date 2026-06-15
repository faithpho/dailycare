#!/usr/bin/env python3
"""
DailyCare server — serves the app and handles Agnes AI video generation.
Run: python3 server.py
Open: http://localhost:8080/index.html
"""
import json, os, subprocess, threading, uuid
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Load API key from environment or .env file
AGNES_API_KEY = os.environ.get("AGNES_API_KEY", "")
if not AGNES_API_KEY:
    for env_path in [".env", "../.env"]:
        full = os.path.join(os.path.dirname(os.path.abspath(__file__)), env_path)
        if os.path.exists(full):
            for line in open(full):
                if line.startswith("AGNES_API_KEY="):
                    AGNES_API_KEY = line.strip().split("=", 1)[1]

# Find Agnes video script
_base = os.path.dirname(os.path.abspath(__file__))
for _rel in ["../agnes-free-model-skills", "../../agnes-free-model-skills"]:
    _candidate = os.path.join(_base, _rel, "agnes-free-video/scripts/agnes_video.py")
    if os.path.exists(_candidate):
        VIDEO_SCRIPT = _candidate
        break
else:
    VIDEO_SCRIPT = None

OUTPUT_DIR = _base  # videos download here, next to server.py
jobs = {}           # { job_id: {status, progress, file, error} }

class Handler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == "/generate-video":
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n)) if n else {}
            prompt = body.get("prompt", "A warm cozy morning scene with soft golden light and flowers")
            job_id = str(uuid.uuid4())[:8]
            jobs[job_id] = {"status": "queued", "progress": 0, "file": None, "error": None}
            threading.Thread(target=self._run, args=(job_id, prompt), daemon=True).start()
            self._json({"job_id": job_id})
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        # 0. Config endpoint — sends API key to browser safely
        if self.path == "/config":
            self._json({"agnes_api_key": AGNES_API_KEY})
            return

        # 1. Video status polling
        if self.path.startswith("/video-status/"):
            job_id = self.path.split("/")[-1]
            self._json(jobs.get(job_id, {"status": "not_found"}))

        # 2. Serve downloaded .mp4 video files
        elif self.path.startswith("/videos/"):
            filename = self.path[len("/videos/"):]
            filepath = os.path.join(OUTPUT_DIR, filename)
            if os.path.exists(filepath):
                size = os.path.getsize(filepath)
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(size))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                with open(filepath, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()

        # 3. Serve all other static files (index.html, script.js, styles.css etc.)
        else:
            super().do_GET()

    def _run(self, job_id, prompt):
        jobs[job_id]["status"] = "in_progress"
        env = os.environ.copy()
        env["AGNES_API_KEY"] = AGNES_API_KEY

        if not VIDEO_SCRIPT:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = "Agnes video script not found"
            print("❌ Could not find agnes_video.py")
            return

        cmd = ["python3", VIDEO_SCRIPT, "create",
               "--prompt", prompt,
               "--download",
               "--output-dir", OUTPUT_DIR,
               "--timeout", "300"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=360)
            output = result.stdout + result.stderr
            print(output)
            for line in output.splitlines():
                if line.startswith("Downloaded:"):
                    filepath = line.replace("Downloaded:", "").strip()
                    filename = os.path.basename(filepath)
                    jobs[job_id]["status"] = "completed"
                    jobs[job_id]["file"] = f"/videos/{filename}"
                    jobs[job_id]["progress"] = 100
                    print(f"✅ Job {job_id} done: {filename}")
                    return
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = output[-300:]
            print(f"❌ Job {job_id} failed: {output[-200:]}")
        except Exception as e:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
            print(f"❌ Job {job_id} exception: {e}")

    def _json(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def log_message(self, fmt, *args):
        print(f"  {self.path} → {args[1]}")


if __name__ == "__main__":
    os.chdir(_base)  # Serve files relative to server.py location
    port = 8080
    print(f"""
╔══════════════════════════════════════════╗
║   DailyCare  →  http://localhost:{port}      ║
║   Open: http://localhost:{port}/index.html   ║
║   Ctrl+C to stop                         ║
╚══════════════════════════════════════════╝""")
    print(f"✅ Key: {AGNES_API_KEY[:12]}..." if AGNES_API_KEY else "⚠️  No API key found!")
    print(f"✅ Video script: {VIDEO_SCRIPT}" if VIDEO_SCRIPT else "⚠️  Agnes video script not found!")
    print()
    HTTPServer(("localhost", port), Handler).serve_forever()

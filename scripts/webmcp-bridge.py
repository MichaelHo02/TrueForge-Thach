"""Temporary stateless MCP relay. Browser execution is supplied by a local worker.

No browser automation, simulator, model call, or solution is implemented here.
Only the three discovered game tools and a bounded live-plan helper are exposed.
"""
import argparse
import json
import os
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

NATIVE_NAMES = {"duck_get_board", "duck_move", "duck_restart"}
DIRECTIONS = {"up", "down", "left", "right"}


def validate_call(name, arguments):
    if not isinstance(arguments, dict):
        raise ValueError("Tool arguments must be an object")
    if name == "duck_play_plan":
        if set(arguments) != {"moves", "expectedRevision"}:
            raise ValueError("Supply moves and expectedRevision only")
        moves = arguments["moves"]
        if not isinstance(moves, list) or not 1 <= len(moves) <= 100 or any(not isinstance(x, str) or x not in DIRECTIONS for x in moves):
            raise ValueError("Use 1 to 100 valid directions")
    elif name not in NATIVE_NAMES:
        raise ValueError("Unknown game tool")
    if name != "duck_get_board":
        revision = arguments.get("expectedRevision")
        if isinstance(revision, bool) or not isinstance(revision, int) or revision < 0:
            raise ValueError("Use expectedRevision from the latest board receipt")


def error(message):
    return {"isError": True, "content": [{"type": "text", "text": json.dumps({"error": message})}]}


class Relay:
    def __init__(self, directory, tools, timeout=360):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.timeout = timeout
        self.tools = [{k: tool[k] for k in ("name", "description", "inputSchema")}
                      for tool in tools if tool["name"] in NATIVE_NAMES]
        if {tool["name"] for tool in self.tools} != NATIVE_NAMES:
            raise ValueError("Discover the three native page tools before starting")
        self.tools.append({"name": "duck_play_plan", "description": "Execute your completed plan on the live Duck Delivery board. The bridge invokes native WebMCP duck_move once per step and returns actual board receipts. Plan and validate before calling; this is live play, not a simulator.", "inputSchema": {"type": "object", "properties": {"moves": {"type": "array", "items": {"type": "string", "enum": sorted(DIRECTIONS)}, "minItems": 1, "maxItems": 100}, "expectedRevision": {"type": "integer", "minimum": 0}}, "required": ["moves", "expectedRevision"], "additionalProperties": False}})
        self.lock = threading.Lock()

    def call(self, name, arguments):
        try:
            validate_call(name, arguments)
        except ValueError as exc:
            return error(str(exc))
        # One live operation at a time; simultaneous callers cannot mix plans.
        if not self.lock.acquire(blocking=False):
            return error("A live browser operation is already running. Wait for its receipt.")
        job_id = str(uuid.uuid4())
        job = self.directory / (job_id + ".job.json")
        receipt = self.directory / (job_id + ".result.json")
        try:
            payload = {"id": job_id, "tool": name, "arguments": arguments, "expiresAt": time.time() + self.timeout}
            temporary = job.with_suffix(".tmp")
            temporary.write_text(json.dumps(payload))
            os.replace(temporary, job)
            while time.time() < payload["expiresAt"]:
                if receipt.exists():
                    return json.loads(receipt.read_text())
                time.sleep(0.1)
            return error("Browser worker timed out. Read the live board before retrying; some moves may have executed.")
        finally:
            job.unlink(missing_ok=True)
            self.lock.release()


def make_handler(relay, mcp_path):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Do not log capability URLs or user request bodies.

        def reply(self, status, payload=None):
            body = b"" if payload is None else json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.reply(405 if self.path == mcp_path else 404)

        def do_DELETE(self):
            self.reply(405)

        def do_POST(self):
            if self.path != mcp_path:
                return self.reply(404)
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 65536:
                    return self.reply(413)
                request = json.loads(self.rfile.read(size))
                if not isinstance(request, dict) or request.get("jsonrpc") != "2.0":
                    return self.reply(400)
                method = request.get("method")
                if "id" not in request:
                    return self.reply(202)
                if method == "initialize":
                    result = {"protocolVersion": request.get("params", {}).get("protocolVersion", "2025-03-26"), "capabilities": {"tools": {}}, "serverInfo": {"name": "duck-live-webmcp", "version": "1.0.0"}}
                elif method == "tools/list":
                    result = {"tools": relay.tools}
                elif method == "tools/call":
                    params = request.get("params", {})
                    result = relay.call(params.get("name"), params.get("arguments", {}))
                elif method == "ping":
                    result = {}
                else:
                    return self.reply(200, {"jsonrpc": "2.0", "id": request["id"], "error": {"code": -32601, "message": "Method not supported"}})
                self.reply(200, {"jsonrpc": "2.0", "id": request["id"], "result": result})
            except (ValueError, TypeError, KeyError):
                self.reply(400)
    return Handler


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue-dir", required=True)
    parser.add_argument("--tools", required=True)
    parser.add_argument("--path-file", required=True, help="Private file containing the temporary MCP URL path")
    parser.add_argument("--port", type=int, default=4180)
    args = parser.parse_args()
    path = Path(args.path_file).read_text().strip()
    if not path.startswith("/mcp/") or len(path) < 30:
        parser.error("Use a random capability path beginning /mcp/")
    relay = Relay(args.queue_dir, json.loads(Path(args.tools).read_text()))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(relay, path))
    print("Game-only MCP relay listening on loopback; browser worker required", flush=True)
    server.serve_forever()

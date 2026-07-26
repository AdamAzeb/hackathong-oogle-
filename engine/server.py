"""
BACKED engine — HTTP server. Stdlib only.

    python3 engine/server.py          # serves http://localhost:8787

Endpoints (all JSON in, JSON out, CORS open so file:// pages can call it):

  GET  /health
  POST /open_market  {user_id, topic, minutes, start_hour}
       → {action:"open_market", probability, rationale}
       | {action:"counter_offer", reason, revised:{topic,minutes,hour}}
  POST /margin_call  {user_id, idle_minutes, price_now, minutes_left}
       → {text}
  POST /resolve      {market_id, commitment, topic, minutes,
                      evidence_text? , image_b64?, mime?}
       → {resolution:"YES"|"NO", confidence, text}
"""

import json
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

import gemma

PORT = 8787


class Handler(BaseHTTPRequestHandler):

    def _send(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send({})

    def do_GET(self):
        if self.path == "/health":
            self._send({"ok": True, "model": gemma.MODEL})
        else:
            self._send({"error": "not found"}, 404)

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            p = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            self._send({"error": "bad json"}, 400)
            return

        try:
            if self.path == "/open_market":
                out = gemma.open_market(
                    p["user_id"], p["topic"], int(p["minutes"]), str(p["start_hour"]))
            elif self.path == "/margin_call":
                out = gemma.margin_call(
                    p["user_id"], int(p["idle_minutes"]),
                    int(p["price_now"]), int(p["minutes_left"]))
            elif self.path == "/resolve":
                out = gemma.resolve(
                    p.get("market_id", "mkt"), p.get("commitment", ""),
                    p.get("topic", ""), int(p.get("minutes", 30)),
                    evidence_text=p.get("evidence_text"),
                    image_b64=p.get("image_b64"),
                    mime=p.get("mime", "image/jpeg"))
            else:
                self._send({"error": "not found"}, 404)
                return
            self._send(out)
        except KeyError as e:
            self._send({"error": f"missing field {e}"}, 400)
        except Exception as e:  # the demo never hard-fails
            self._send({"error": str(e)[:300]}, 500)

    def log_message(self, fmt, *args):
        print(f"[engine] {self.command} {self.path} — {args[1] if len(args) > 1 else ''}")


if __name__ == "__main__":
    print(f"BACKED engine on http://localhost:{PORT}  (model: {gemma.MODEL})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()

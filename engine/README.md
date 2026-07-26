# BACKED engine

The three live Gemma 4 calls (`gemma-4-26b-a4b-it` via the Gemini API). Stdlib only — nothing to install.

## Run

```bash
# needs GEMINI_API_KEY in the environment or in ../.env (gitignored)
python3 engine/server.py        # → http://localhost:8787
```

## Smoke test (also pre-warms the demo cache)

```bash
python3 engine/gemma.py
```

Runs all four demo inputs: the doomed commitment (→ counter-offer), the winnable one (→ priced), the margin call, and a text-evidence resolution. Responses are cached in `engine/cache.json` keyed on input hash — re-running the demo costs zero quota, and the cache is the on-stage fallback. `BACKED_NOCACHE=1` bypasses it.

## Endpoints

| | body | returns |
|---|---|---|
| `POST /open_market` | `{user_id, topic, minutes, start_hour}` | `{action:"open_market", probability, rationale}` or `{action:"counter_offer", reason, revised:{topic,minutes,hour}}` — thinking: **high** |
| `POST /margin_call` | `{user_id, idle_minutes, price_now, minutes_left}` | `{text}` — thinking: **off** |
| `POST /resolve` | `{market_id, commitment, topic, minutes, evidence_text? \| image_b64?, mime?}` | `{resolution:"YES"\|"NO", confidence, text}` — thinking: **high**, multimodal |
| `GET /health` | | `{ok, model}` |

## Frontend wiring (for whoever lands Phase 4)

`api.js` in the repo root exposes `BackedAPI.openingLine() / doomedCommitment() / marginCall() / resolve(imageB64)`. Each returns the exact shape app.js already reads from `data.js`, falling back to the mock on any failure or 4s timeout — no try/catch needed at call sites. Wiring is one script tag in `index.html` (after `data.js`, before `app.js`) plus swapping three string reads in `app.js`.

## Before the demo

1. `python3 engine/gemma.py` once on venue wifi — pre-warms every cached response.
2. **Test `/resolve` with the exact photo you'll photograph on stage** (base64 it, POST it) so the multimodal answer is cached.

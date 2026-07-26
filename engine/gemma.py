"""
BACKED engine — the three live Gemma 4 calls.

  open_market   thinking: high   price a commitment, or refuse and counter-offer
  margin_call   thinking: off    one nudge for an idle learner, mid-session
  resolve       thinking: high   multimodal — judge submitted evidence

Stdlib only: REST via urllib, so nothing to install and nothing to break
on venue wifi. Every call is cached to cache.json keyed on its input hash —
re-running the demo costs zero quota, and a pre-warmed cache is the
fallback if the network dies on stage.
"""

import base64
import hashlib
import json
import os
import time
import urllib.error
import urllib.request

MODEL = "gemma-4-26b-a4b-it"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.path.join(ROOT, "cache.json")
LEARNERS_PATH = os.path.join(ROOT, "learners.json")


def _api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    # fall back to the repo's .env so `python3 engine/server.py` just works
    env = os.path.join(ROOT, "..", ".env")
    if os.path.exists(env):
        for line in open(env):
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("GEMINI_API_KEY not set and no .env found")


def load_learners():
    with open(LEARNERS_PATH) as f:
        return json.load(f)


# ── cache ────────────────────────────────────────────────────────

def _cache_load():
    try:
        with open(CACHE_PATH) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _cache_save(cache):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=1)


def _hash(*parts):
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:24]


# ── transport ────────────────────────────────────────────────────

def _generate(parts, system=None, thinking=None, retries=4):
    """One generateContent call. Returns the model's answer text
    (thought parts skipped). Retries 429/5xx with exponential backoff."""
    body = {"contents": [{"role": "user", "parts": parts}]}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if thinking:
        body["generationConfig"] = {"thinkingConfig": {"thinkingLevel": thinking}}

    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": _api_key()},
    )

    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)
            out = [
                p["text"]
                for p in data["candidates"][0]["content"]["parts"]
                if "text" in p and not p.get("thought")
            ]
            return "".join(out).strip()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise


def _parse_json(text):
    """The model is told 'JSON only' but may still wrap it in fences."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```")[1]
        if t.startswith("json"):
            t = t[4:]
    start, end = t.find("{"), t.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"no JSON object in model output: {text[:200]}")
    return json.loads(t[start : end + 1])


def _cached_call(key, fn, fallback):
    """Cache hit → return it. Miss → live call, cache the result.
    Any failure → the hardcoded fallback. The demo never hard-fails."""
    cache = _cache_load()
    if key in cache and not os.environ.get("BACKED_NOCACHE"):
        return {**cache[key], "cached": True}
    try:
        out = fn()
        cache[key] = out
        _cache_save(cache)
        return out
    except Exception as e:
        return {**fallback, "fallback": True, "error": str(e)[:200]}


# ── helpers ──────────────────────────────────────────────────────

def size_bucket(minutes):
    if minutes < 30:
        return "under_30m"
    if minutes <= 60:
        return "30_60m"
    return "over_60m"


# ── call 1: open_market / counter_offer (thinking: high) ─────────

PRICING_SYSTEM = """You are the book for BACKED. You price markets on whether a learner
will complete a study commitment.

You have their full record: completion rate by topic, by hour, by
block size, their last seven results, their drift profile, and an
attempt log of specific (topic, hour, size) combinations.

Respond ONLY with valid JSON, no markdown fences. Two possible shapes:

To price the market:
{"action":"open_market","probability":<int 0-100>,"rationale":"<one line>"}

To refuse and counter-offer — REQUIRED when the attempt log shows this
same topic at this same hour at this same size attempted three or more
times with zero or one completion:
{"action":"counter_offer","reason":"<one line citing the record>",
 "revised":{"topic":"<topic>","minutes":<int>,"hour":"<HH>"},
 "asked_probability":<int 0-100 — the punitive line you would quote if
 the learner insists on opening the requested market anyway>}

When you counter, name the specific slot and size their record
supports, and cite the record (e.g. "you're 7-from-9 in that slot").

The rationale is ONE line in the voice of a bookmaker who has seen
this person's form. Be calibrated, not kind.

If the commitment is trivial relative to their history, price it near
95 and say the payout will be worthless. Do not let them farm easy wins.

Never moralise. Never mention discipline or willpower. You quote numbers."""


def open_market(user_id, topic, minutes, start_hour):
    learner = load_learners().get(user_id.lower())
    if not learner:
        return {"action": "open_market", "probability": 50,
                "rationale": "No record on file. The book opens you blind at even money.",
                "fallback": True}

    prompt = json.dumps({
        "commitment": {"topic": topic, "minutes": minutes,
                       "start_hour": start_hour, "size": size_bucket(minutes)},
        "learner": learner,
    })
    key = _hash("open_market", "v2", prompt)   # v2: counter includes asked_probability
    fallback = {"action": "open_market", "probability": 64,
                "rationale": "Opening you at 64. You've cleared thirty-minute blocks at ten in the morning seven times from nine — that's the only reason this line isn't worse."}

    def call():
        out = _parse_json(_generate([{"text": prompt}], system=PRICING_SYSTEM, thinking="high"))
        assert out.get("action") in ("open_market", "counter_offer")
        return out

    return _cached_call(key, call, fallback)


# ── call 2: margin_call (thinking: off) ──────────────────────────

MARGIN_SYSTEM = """The learner is mid-session and has gone idle. Write ONE nudge, maximum
two sentences.

You must include: the idle time, the current price, and the single
smallest concrete action that would recover the position.

Voice: a trading desk, not a coach. Impersonal and factual. You are
reporting a price movement, not expressing disappointment.

Never say "you're failing", "you should", or anything about
discipline. Never use an exclamation mark.

Good: "Nine minutes idle, you've drifted to 24, and Sara's adding to
her No. One problem gets you back over thirty."

Respond ONLY with valid JSON, no markdown fences:
{"text":"<the nudge>"}"""


def margin_call(user_id, idle_minutes, price_now, minutes_left, watcher="Sara"):
    learner = load_learners().get(user_id.lower(), {})
    prompt = json.dumps({
        "idle_minutes": idle_minutes, "price_now": price_now,
        "minutes_left": minutes_left,
        "a_no_holder_adding_to_position": watcher,
        "drift_profile": learner.get("drift_profile", {}),
    })
    key = _hash("margin_call", prompt)
    fallback = {"text": "Nine minutes idle, you've drifted to 24, and Sara's adding to her No. One problem gets you back over thirty."}

    def call():
        out = _parse_json(_generate([{"text": prompt}], system=MARGIN_SYSTEM))
        assert out.get("text")
        return out

    return _cached_call(key, call, fallback)


# ── call 3: resolve (thinking: high, multimodal) ─────────────────

RESOLVE_SYSTEM = """You are the resolution oracle for BACKED, a market on whether a
learner completed a study commitment.

Judge whether genuine engagement with the topic occurred at roughly
the committed minutes of effort. You are NOT grading correctness — a
page of wrong working is still work.

Fail: vague summaries, generic content, off-topic material, or
anything that could have been produced without doing the work.

Respond ONLY with valid JSON, no markdown fences:
{"resolution":"YES"|"NO","confidence":<int 0-100>,
 "text":"<one sentence the whole group will see>"}"""


def resolve(market_id, commitment, topic, minutes, evidence_text=None,
            image_b64=None, mime="image/jpeg"):
    header = (f"Resolve this market: {commitment}\n"
              f"Topic: {topic}. Committed effort: roughly {minutes} minutes.")
    # image before text — multimodal prompt ordering per the Gemma docs
    parts, ev_key = [], ""
    if image_b64:
        parts.append({"inline_data": {"mime_type": mime, "data": image_b64}})
        ev_key = _hash("img", image_b64)
    parts.append({"text": header + (f"\nEvidence (text): {evidence_text}" if evidence_text else "\nEvidence: the attached photograph.")})

    key = _hash("resolve", market_id, commitment, evidence_text or "", ev_key)
    fallback = {"resolution": "YES", "confidence": 88,
                "text": "Photograph shows worked problems with unit-consistent working, consistent with roughly thirty minutes of effort. Not graded for correctness."}

    def call():
        out = _parse_json(_generate(parts, system=RESOLVE_SYSTEM, thinking="high"))
        assert out.get("resolution") in ("YES", "NO")
        return out

    return _cached_call(key, call, fallback)


# ── smoke test: python3 engine/gemma.py ──────────────────────────

if __name__ == "__main__":
    print("1. open_market — the commitment the history says will fail:")
    print(json.dumps(open_market("max", "thermodynamics", 90, "16"), indent=2))
    print("\n2. open_market — the winnable version:")
    print(json.dumps(open_market("max", "thermodynamics", 30, "10"), indent=2))
    print("\n3. margin_call:")
    print(json.dumps(margin_call("max", 9, 24, 22), indent=2))
    print("\n4. resolve — text evidence:")
    print(json.dumps(resolve("mkt_thermo_01",
                             "Max finishes the thermodynamics problem set",
                             "thermodynamics", 30,
                             evidence_text="Worked problems 1-6 on entropy change: calculated dS for isothermal expansion of ideal gas, two Carnot cycle efficiency problems with T1=500K T2=300K, and a heat exchanger entropy balance. All with unit conversions shown."),
                     indent=2))

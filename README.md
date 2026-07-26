# BACKED

**A live market on whether you'll actually do the work.**

Built in one day at *Build with Gemma: GDGoC Aberdeen* (26 July 2026). You commit to a study block; **Gemma 4** prices you from your own history of what you avoid — or refuses to recommend the bet and counter-offers a version you can win. Your friends buy Yes or No. While you work, idle time drifts your price down in public, and Gemma fires a margin call at the moment of avoidance. At the end you photograph your worked pages and Gemma — as a multimodal resolution oracle — judges whether real work happened. Settlement moves the leaderboard, and today's result is tomorrow's odds.

**Live demo:** https://adamazeb.github.io/hackathong-oogle-/ · **Writeup:** [kaggle-writeup.md](kaggle-writeup.md)

## Run it

```bash
# frontend only (hosted demo behaves the same): just open index.html — no build, no deps

# fully live (the three Gemma calls):
echo 'GEMINI_API_KEY=your-key' > .env        # https://aistudio.google.com/apikey
python3 engine/server.py                     # localhost:8787, stdlib only
open index.html
```

With the engine up, **＋ NEW** runs the full loop on real input: type an assignment → Gemma prices or refuses it → publish (your mandatory Yes bet places) → bets move the price → **START SESSION** → drift + live margin call → upload evidence → Gemma resolves → the right side gets paid. **▶ RUN** plays the scripted demo sequence; without the engine, every beat falls back to canned copy so nothing hard-fails.

## Gemma 4 integration (`gemma-4-26b-a4b-it` via the Gemini API)

| Call | Thinking | Job |
|---|---|---|
| [`open_market`](engine/gemma.py) | high | calibrated probability + bookmaker rationale from the learner model; refuses & counter-offers doomed commitments (advisory — insist and it opens at the punitive line) |
| [`margin_call`](engine/gemma.py) | off | one impersonal nudge: idle time, live price, smallest recovering action |
| [`resolve`](engine/gemma.py) | high, **multimodal** | judges photographed evidence; YES/NO + confidence + public verdict |

Responses cached by input hash (`engine/cache.json`, gitignored), exponential backoff on 429s, hardcoded fallback per call. Payout arithmetic is plain code — never the model. Details: [engine/README.md](engine/README.md).

## Layout

```
index.html / styles.css / data.js / app.js   frontend — vanilla JS, no build step
api.js                                       fetch-with-fallback bridge to the engine
engine/server.py                             stdlib HTTP server, localhost:8787
engine/gemma.py                              the three live Gemma 4 calls
engine/learners.json                         seeded per-learner history (the learner model)
```

Counterparties are simulated in this sprint; pricing, nudging and resolution are live model calls.

## Team

Built by the BACKED team with pair-programming assistance from Claude.

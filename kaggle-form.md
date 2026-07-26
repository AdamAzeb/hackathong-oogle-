# Kaggle Writeup form — paste-ready

## Title (already set)
BACKED - HackathonG(oogle)

## Subtitle (≤140 chars)
Your friends bet on whether you'll finish studying. Gemma 4 sets your odds, margin-calls your idle time, and judges the photo evidence.

## Card image (560×280)
Screenshot the price block at the "The market has you at 31%" hold — the big red 31% with the form line visible. It reads as a prediction market in one glance.

## Project Description (paste everything below this line)

---

### 💡 Inspiration

Procrastination runs on shame, and shame is private. You avoid the task, feel bad about avoiding it, and the task becomes more aversive because the failure is now attached to it — so you avoid it harder. The loop tightens in secret, which is why it survives. Every student in our group knows the 4pm study block that has never once happened.

Commitment devices are the most evidenced anti-procrastination intervention there is, but self-set stakes don't bind — you forgive yourself quietly every time. So we built the opposite: **BACKED**, a prediction market where your friends bet real positions on whether you'll do the work you said you'd do. When the market has you at 31%, the thing you were hiding is already public, already quantified, and priced by people who know you — not cruel, just accurate. There's nothing left to conceal, so there's nothing left to be ashamed of. Shame becomes stakes. The interface never says *your friends think you'll fail*; it says *the market has you at 31%*. Market language is impersonal, and impersonal is what makes the number survivable. It answers no study questions at all — it prices your follow-through and makes you watch it move.

### 🛠️ How we built it

**Model:** `gemma-4-26b-a4b-it` via the Gemini API — the MoE's ~4B active parameters keep on-stage latency low while retaining 26B-class reasoning for pricing. **Stack:** deliberately dependency-free — a vanilla-JS frontend that opens from `file://` with no build step, and a ~100-line Python *stdlib* engine bridging to the API. **Technique:** prompt engineering with strict-JSON system prompts (no fine-tuning, no RAG), a per-learner JSON model (completion rates by topic/hour/block-size, last seven results, drift profile, attempt log), and a deliberate thinking-mode split. Gemma has four jobs:

1. **The book** (thinking: high) — reads the learner model and returns a calibrated probability with one line of bookmaker rationale. Given a never-seen commitment ("Linear algebra coursework 2 — eigenvalue proofs", 45 min at 11:00) it priced 40%: *"You're 2-from-7 in your last seven and your completion rate in the 30–60m bracket is only 48%."*
2. **Adaptive pacing — the advisory counter-offer** (thinking: high) — if your record shows this same topic/hour/size failed 3+ times, Gemma refuses to recommend the market and counters with a winnable one, citing the record: *"you're 0-for-4 in thermodynamics at 16:00 over 60m; 7-from-9 in the 10:00 under-30m slot."* You stay sovereign: **OPEN IT ANYWAY** opens your market — at the punitive 5% line Gemma quotes for insisting. The app never overrides you; the market just makes ignoring your own history expensive.
3. **The margin call** (thinking: off, for speed) — idle time drifts your price down in public; at a threshold Gemma generates one trading-desk nudge naming the idle time, the live price, and the smallest action that recovers the position. It fires at the exact moment of avoidance and never scolds.
4. **The resolution oracle** (thinking: high, **multimodal**) — you photograph your worked pages and Gemma judges whether genuine engagement happened at roughly the committed effort, *not* grading correctness. YES/NO, confidence, one-line public verdict. Fed a blank image it returned *NO, confidence 100: "the provided image is a blank solid color and contains no evidence of work performed."* Settlement arithmetic is plain code — never the model.

Resolution is the hardest problem in prediction markets, and ours has no ground truth anywhere. It's gameable — you can photograph someone else's notes — and we say so. Our answers are design, not denial: any No-holder can challenge and Gemma generates a targeted comprehension question (designed and prompted this sprint, not wired into the demo), and thin evidence tanks your form, widening every future line — the market prices dishonesty automatically. Bonus: proving you studied means articulating what you learned, so verification is itself retrieval practice.

Every response is cached by input hash with exponential backoff on 429s, and every call has a hardcoded fallback — the demo cannot hard-fail. Track fit: **streaks** (the seven-square form line has market consequences), **accountability mechanics** (the market itself), **adaptive pacing** (the counter-offer), and the **emotional side of procrastination** (the shame-to-stakes inversion, enforced by every line of copy — no exclamation marks, no encouragement, anywhere).

### 🚀 The Prototype

- **Code:** https://github.com/AdamAzeb/hackathong-oogle-
- **Live demo:** https://adamazeb.github.io/hackathong-oogle-/

Click **▶ RUN** for the choreographed sequence, or **＋ NEW** for the full loop on your own input: type an assignment → Gemma prices or refuses it → publish (the subject's mandatory Yes bet auto-places — you're always long on yourself) → bets move the price → session with public drift and the margin call → submission portal → resolution → an itemised settlement paying the winning side. The hosted page runs on built-in fallbacks; the three Gemma calls go live with a free API key and two commands (see the README). Counterparties are simulated in this sprint; pricing, nudging and resolution are live model calls.

### 🧗 Challenges we ran into

Scoping one day around three genuinely-live model calls and making everything else deterministic. Gemma 4 returns internal `thought` parts that must be filtered out of responses, and JSON arrives fence-wrapped — we parse defensively with a per-call fallback. Free-tier rate limits (a 60s multimodal call can eat an RPM window) forced input-hash caching. Our single-threaded demo server deadlocked a slow multimodal resolution behind a nudge call until we made it threaded. And the hardest design problem wasn't code: making an accountability tool that never moralises — the copy rules ("report the price, never the person") took as much iteration as the prompts.

---

## Attachments → Project links (add both)
1. `https://github.com/AdamAzeb/hackathong-oogle-`
2. `https://adamazeb.github.io/hackathong-oogle-/`

## Media gallery
Screenshots to take right now (browser at 100% zoom): the 31% hold · the THE BOOK REFUSES modal · the MARGIN CALL banner · the RESOLVED YES card with the SETTLEMENT rows. If you record the rehearsal run, upload to YouTube as unlisted and add it.

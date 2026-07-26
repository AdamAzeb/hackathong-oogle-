# BACKED — Final Build Spec

**A live market on whether you'll actually do the work.**

Build with Gemma · GDGoC Aberdeen · 26 July 2026 · **lock 17:00**
**Track: Motivation & Habits.** Primary target: Best Overall ($500).

---

## 1. The product, in one paragraph

You commit to a study block. Gemma prices you — using your own history of what you avoid, when, and at what size — and if the commitment is one you've failed before, it **refuses the bet and counter-offers a version you can win**. The market opens to your group. Your friends buy Yes or No, and the price moves. Then you see your number. While you work, **the line stays live**: go idle and it drifts down, in public, and the book calls you on it. At the end you submit evidence and Gemma resolves the market — the hardest problem in prediction markets, applied to "did this person actually study." Settlement moves the leaderboard and updates your form, which changes the odds you get next time.

**The line to close on:** *"Every study app asks you to be disciplined. This one prices your follow-through, and makes you watch it move."*

---

## 2. Audit against the challenge — line by line

The brief is short and every clause is a scoring hook. This is the check:

| The brief says | How BACKED answers it |
|---|---|
| *"...fights procrastination"* | The mechanic is a commitment contract with social stakes — the most evidenced anti-procrastination device that exists. |
| *"...keeps learners on track"* | The line is live during the session. Idle time moves the price down. Being off-track has an immediate, visible, public cost. |
| *"...not just answers questions"* | It answers none. The only text it generates is pricing rationale, nudges, and resolution verdicts. |
| *"easy to build and easy to ignore"* | Hard to ignore by construction: your friends have money on you and the number is on screen. |
| *"actively help learners do the work"* | Three active interventions: the counter-offer before, the margin call during, the settlement after. |
| **"nudging them at the right moment"** | **The margin call — §5, stage 5.** This is the clause that was missing and is now the core of the fix. |
| **"adapting to how they're progressing"** | Two loops: within-session (drift and nudge respond to live activity) and between-session (your form changes your future opening lines). |
| **"holding them accountable to their own goals"** | Literal. Your own stated goal, priced by people who know you, settled in public. |

**Nothing in the brief is unanswered.** That table goes in the writeup nearly as-is.

---

## 3. Audit against the Motivation & Habits track

The track names four things. Judges scoring a rubric with four named elements will look for four named elements. Each is a real feature, not a claim:

| Track keyword | The feature |
|---|---|
| **Streaks** | The form line — last seven commitments, hit or miss. It isn't decorative: a run of hits tightens your opening line and raises your payouts. The streak has market consequences. |
| **Accountability mechanics** | The market itself. Direct hit, no stretch required. |
| **Adaptive pacing** | **The counter-offer.** Gemma refuses commitments your history says will fail and proposes a winnable size and time slot. That is pacing, adapted to the individual, enforced rather than suggested. |
| **Interventions addressing the emotional side of procrastination** | §4 below — this is the strongest argument in the whole project and it should lead the writeup. |

### The emotional argument (lead with this)

Procrastination runs on **shame**, and shame is private. You avoid the task, you feel bad about avoiding it, the task becomes more aversive because it now carries the failure attached to it, and you avoid it harder. The loop tightens in secret, which is exactly why it survives.

**BACKED breaks it by pricing the avoidance before it happens.**

When your friends put you at 31%, the thing you were hiding is already public, already quantified, and already priced — by people who like you and are not being cruel, just accurate. There is nothing left to conceal, so there is nothing to be ashamed of. The private failure becomes a public number you can move.

That inversion — **shame converted into stakes** — is the emotional design of the product, and it is a substantially more interesting answer to "the emotional side of procrastination" than a supportive chatbot voice.

**Design consequence:** the copy never says *your friends think you'll fail.* It says *the market has you at 31%.* Market language is impersonal, and impersonal is what makes it survivable. Get this right in the UI or the whole argument collapses.

---

## 4. Audit against the scoring rubric

| Criterion | Pts | How we score |
|---|---|---|
| **Gemma Integration** | 0–30 | Four distinct jobs, none of them a wrapper call: pricing from history, refusal and counter-offer, live nudge generation, and **multimodal resolution**. Deliberate thinking-mode split (high for pricing and resolution, off for commentary). Deliberate model choice (26b-a4b for demo latency). Remove Gemma and there is no product — the odds, the pacing decision, and the oracle all disappear. |
| **Innovation & Impact** | 0–30 | Two original moves: a prediction market where *the asset is a person's follow-through*, and **an LLM as the resolution oracle for a subjective outcome**. The second is a genuinely hard, genuinely unsolved problem and no other team will be near it. |
| **Functionality** | 0–20 | Scope is engineered for this: three live Gemma calls, everything else deterministic. §7 defines exactly what runs live. |
| **Presentation & Writeup** | 0–20 | §9 skeleton with word budgets. §3's table and §4's argument are the two things that make it read as designed rather than assembled. |

**Best Overall** is the $500 and it is track-agnostic. The oracle section is what wins it — it's the part a technical judge will still be thinking about an hour later.

---

## 5. The full loop

Seven stages. Gemma's role at each is explicit.

### Stage 1 — Commit
Learner states a goal: topic, minutes, deadline.
*No model call.*

### Stage 2 — The book prices you *(or refuses)*
Gemma reads the learner model and returns a calibrated probability plus one line of rationale in a bookmaker's voice.

**If the history says this commitment fails** — same topic, same hour, same size, failed 3+ times — Gemma calls `counter_offer` instead:

> *"You've failed this exact block four times at four in the afternoon. I'm not opening that market. Counter: thirty minutes, tomorrow at ten. You're 7-from-9 in that slot."*

This is **adaptive pacing**, and it's enforced rather than suggested — you cannot open the bad market. It is also the single best demo beat in the app, because the app tells the user *no*, which no other submission will do.

`thinking_level: high`. **Live call.**

### Stage 3 — Market opens
Group sees the market. Positions are taken. Price moves.
*Scripted in the sprint — see §7.*

### Stage 4 — You see your number
The accountability hit. **"The market has you at 31%."**
*No call — this is UI.*

### Stage 5 — You work, and the line stays live ⭐ **THE FIX**

This is the clause the earlier design missed, and it's the one the brief cares most about.

**The market does not freeze while you work.** Activity keeps it steady. Idle time makes it drift down — visibly, publicly, in real time. Your friends are watching the same number you are.

At a drift threshold, Gemma fires a **margin call**:

> *"Nine minutes idle. You've drifted to 24. Sara's adding to her No. Twenty-two minutes left — one problem gets you back over thirty."*

Why this is the right nudge and not a generic notification:
- **It arrives at the exact moment of avoidance**, which is what the brief asks for.
- **It uses the market as the pressure source** — no bolted-on mechanic, no nagging voice. The app never scolds; it just reports the price.
- **It's emotionally calibrated** — impersonal, factual, and it always ends with the specific smallest action that recovers the position. Never "you're failing." Always "one problem gets you back over thirty."
- **It's cheap** — one short call, thinking off, triggered by a deterministic Python threshold.

`thinking_level: off`. **Live call.** This is the second most important thing you build today.

### Stage 6 — Resolution *(the oracle)*
Evidence submitted — photograph of worked problems, or a summary of what was learned. Gemma judges whether real work happened.

`thinking_level: high`, **multimodal**. **Live call.**

### Stage 7 — Settlement
Payouts computed **in Python, never the model**. Form line updates. Leaderboards move. Your next opening line reflects today.

The loop closes: today's result is tomorrow's odds.

---

## 6. Gemma's four jobs

### 6.1 The learner model

One JSON object per user. Read before every decision, written after every settlement. This is the artefact that proves adaptation over time.

```json
{
  "user": "max",
  "completion": {
    "by_topic": { "thermodynamics": 0.22, "statics": 0.78, "materials": 0.61 },
    "by_hour":  { "09": 0.81, "10": 0.78, "15": 0.31, "21": 0.24 },
    "by_size":  { "under_30m": 0.74, "30_60m": 0.48, "over_60m": 0.19 }
  },
  "form": [0,1,0,0,1,0,0],
  "run": 0,
  "markets": 23,
  "drift_profile": { "median_idle_min": 11, "recovers_after_nudge": 0.58 }
}
```

`drift_profile` is what makes the margin call personal rather than generic — it knows how long *this* person typically stalls and whether nudges have historically worked on them.

### 6.2 Tools

```python
TOOLS = [
  { "name":"open_market",
    "description":"Set a calibrated opening line for a study commitment from the learner's history. Return probability and one line of bookmaker rationale.",
    "parameters":{"user_id":"string","topic":"string","minutes":"integer","start_hour":"string"} },

  { "name":"counter_offer",
    "description":"Refuse a commitment the history says will fail. Propose a winnable topic/size/slot and explain why.",
    "parameters":{"user_id":"string","reason":"string","revised":"object"} },

  { "name":"margin_call",
    "description":"Generate a short nudge for an idle learner mid-session. Reference the live price, the time remaining, and the smallest action that recovers the position.",
    "parameters":{"user_id":"string","idle_minutes":"integer","price_now":"integer","minutes_left":"integer"} },

  { "name":"resolve_market",
    "description":"Judge submitted evidence and resolve YES or NO with confidence and a one-line public rationale.",
    "parameters":{"market_id":"string","evidence_type":"string","evidence":"string"} },

  { "name":"challenge",
    "description":"A No-holder disputes a resolution. Generate a targeted comprehension question on the material.",
    "parameters":{"market_id":"string","topic":"string"} }
]
```

### 6.3 Prompts — usable drafts

**Pricing / refusal** *(thinking: high)*
```
You are the book for BACKED. You price markets on whether a learner
will complete a study commitment.

You have their full record: completion rate by topic, by hour, by
block size, their last seven results, and their drift profile.

Return a probability 0-100 and ONE line of rationale in the voice of a
bookmaker who has seen this person's form. Be calibrated, not kind.

Call counter_offer instead of pricing if the learner has failed this
same topic at this same hour at this same size three or more times.
When you counter, name the specific slot and size their record
supports, and cite the record.

If the commitment is trivial relative to their history, price it near
95 and tell them the payout will be worthless. Do not let them farm
easy wins.

Never moralise. Never mention discipline or willpower. You quote
numbers.
```

**Margin call** *(thinking: off — keep it fast)*
```
The learner is mid-session and has gone idle. Write ONE nudge, maximum
two sentences.

You must include: the idle time, the current price, and the single
smallest concrete action that would recover the position.

Voice: a trading desk, not a coach. Impersonal and factual. You are
reporting a price movement, not expressing disappointment.

Never say "you're failing", "you should", or anything about
discipline. Never use an exclamation mark.

Good: "Nine minutes idle, you've drifted to 24, and Sara's adding to
her No. One problem gets you back over thirty."
```

**Resolution** *(thinking: high, multimodal)*
```
Resolve this market: {commitment}

Evidence: {evidence}

Judge whether genuine engagement with {topic} occurred at roughly
{minutes} minutes of effort. You are NOT grading correctness — a page
of wrong working is still work.

Fail: vague summaries, generic content, off-topic material, or
anything that could have been produced without doing the work.

Return resolution (YES/NO), confidence 0-100, and one sentence the
whole group will see.
```

### 6.4 The oracle problem — your differentiator

Every prediction market's hardest component is **resolution**: who decides what happened. Polymarket's is its most contested piece, and it resolves against *public facts*.

**Yours resolves on "did this person actually study," which has no ground truth anywhere.**

Say plainly in the writeup that it's gameable — you can photograph someone else's notes — then show the two design responses:

1. **Adversarial resolution.** Any No-holder can challenge. Gemma then asks the learner a targeted question about the material. The people financially motivated to catch fraud are exactly the people who will challenge, and Gemma adjudicates. It's an oracle dispute mechanism, in a study app, and it's elegant.
2. **Reputation compounds.** Thin evidence tanks your form, which widens your line, which shrinks every future payout. The market prices dishonesty in automatically.

**Bonus that's worth one sentence:** proving you studied requires you to articulate what you learned, which is retrieval practice. *The verification step is itself a learning intervention.*

Naming your own weakness and showing the design response reads as maturity. Hiding it and being caught in Q&A does the opposite.

---

## 7. Live vs scripted — read this before you build

It is ~14:30. You have roughly **75 minutes of build before freeze.** Scope is now the only thing that decides whether you finish.

**Three calls must be genuinely live.** These are what "effectively utilised Gemma 4" means and a judge may ask you to run one off-script:

1. **The counter-offer** (stage 2) — proves reasoning over history
2. **The margin call** (stage 5) — proves the nudge is generated, not canned
3. **The resolution** (stage 6) — proves multimodal, and it's the oracle story

**Everything else is deterministic and pre-computed:**

| Element | Sprint build |
|---|---|
| Friends' positions | **Scripted** — fixed sequence, fixed sizes |
| Price movement | **Deterministic** — from the scripted positions |
| Drift while idle | **Python timer**, linear decay. No model. |
| Settlement arithmetic | **Python.** Never the model. |
| Leaderboards | **Seeded**, updated from the demo market |
| Histories | **Seeded** — four users, two weeks. C writes these first. |

This is not cutting corners; it is demo engineering. State it in one line in the writeup — *"counterparties are simulated in this sprint; pricing, nudging and resolution are live model calls"* — and it reads as scope discipline rather than weakness.

---

## 8. Demo script — 3 minutes

| Time | Beat | Live? |
|---|---|---|
| 0:00 | Leaderboards. *"This is a market on whether people do what they said they'd do."* | — |
| 0:20 | Commit: thermodynamics, 90 minutes, 4pm. | — |
| 0:30 | **Gemma refuses.** *"Failed this four times at this hour. Not opening that market. Counter: thirty minutes at ten."* Accept. | ✅ **LIVE** |
| 1:00 | Market opens at 64. Positions land. Price falls: **51 · 42 · 31.** | scripted |
| 1:30 | **Hold on the number.** *"The market has you at 31%."* Say nothing for two seconds. | — |
| 1:45 | Session starts. Timer runs. Go idle deliberately. **The line drifts down live.** | timer |
| 2:00 | **Margin call fires.** *"Nine minutes idle, drifted to 24, Sara's adding to her No. One problem gets you back over thirty."* | ✅ **LIVE** |
| 2:20 | Work happens. Photograph the worked problems. Upload. | — |
| 2:35 | **Gemma resolves.** Multimodal, live, one-line public verdict. | ✅ **LIVE** |
| 2:50 | Settlement. Form line flips to a hit. *"Every study app asks you to be disciplined. This one prices your follow-through, and makes you watch it move."* | — |

**Two hero beats: 1:30 and 2:00.** The refusal at 0:30 is the surprise. Build and protect those three; everything else is connective tissue.

---

## 9. Writeup skeleton — 1,500 word cap

| Section | Words | Contains |
|---|---|---|
| The problem | 150 | Procrastination runs on shame, and shame is private. Commitment devices work; self-set stakes don't bind. |
| **The emotional inversion** | 200 | §4. Shame → stakes. This is your best paragraph — do not bury it. |
| The mechanic | 150 | Why the market must be *others* betting on you. Self-priced markets are gameable. |
| **Gemma 4 as book, coach and oracle** | **400** | Four jobs. Tool schemas. Thinking-mode split and why. Model choice and why. |
| The oracle problem | 200 | No ground truth. Adversarial resolution. Honest about gaming. |
| Meeting the brief | 150 | §2's table, compressed to prose. |
| Sprint scope | 100 | What's live, what's simulated, what we cut. |
| Track justification | 100 | §3's four keywords, named explicitly. |
| Risks & responsible design | 50 | No RNG, no chasing, non-monetary stakes. |

**Use the track's own vocabulary** — *streaks, accountability mechanics, adaptive pacing, emotional side of procrastination.* A judge scoring against a printed rubric rewards a writeup that speaks it back. These are free points and most teams won't take them.

---

## 10. Timeline — from 14:30

| Time | A — engine | B — frontend | C — data + writeup |
|---|---|---|---|
| **14:30** | Confirm model string. `open_market` + `counter_offer` returning valid output | Wire Claude Design output to mock objects | **Seed 4 histories, 2 weeks — BLOCKING, nothing works without this** |
| **15:00** | `margin_call` + Python drift timer | Drift animation + margin-call banner | Writeup: problem + emotional inversion |
| **15:20** | `resolve_market` multimodal — **test with the actual photo you'll use** | Resolution + settlement states | Writeup: Gemma + oracle sections |
| **15:45** | **FREEZE.** Caching, fallbacks, error handling only | Polish the three hero beats only | Writeup final |
| **16:00** | **SUBMIT A VALID DRAFT.** Bank it. Re-submit freely after | | Attach repo + demo links |
| **16:15** | Repo public, `.env` purged, README | **Rehearse the demo twice, end to end** | Check word count, check track selected |
| **16:40** | Buffer | | |

**If you are behind at 15:45, cut in this order:** the challenge mechanic → the second leaderboard → manual trading → the drift animation (keep the margin call, fake the drift). **Never cut the three live calls.**

---

## 11. Q&A prep — you will get these three

**"Isn't this just gambling?"**
> No RNG, no chasing, no re-staking, non-monetary stakes. The only variable is whether someone does what they said they'd do — and the house refuses bets it thinks you'll lose, which no bookmaker would ever do. It's a commitment contract with price discovery.

**"What if I don't have friends on it?"**
> Cold start opens against the book at a wider spread with no payout multiplier. It's thinner, and we'd say so — the social layer is where the mechanic gets its power, and that's the honest answer.

**"Can't you just fake the evidence?"**
> Yes, and we say so in the writeup. Two responses: any No-holder can challenge and Gemma then questions you on the material, and thin evidence compounds into worse odds forever. We price dishonesty rather than pretending we prevent it.

Rehearse all three out loud. Assign them to whoever presents.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Multimodal resolution slow or fails on stage | **Test with the exact photo now.** Cache the response. Text-evidence fallback path ready. |
| Rate limits during the demo | Pre-warm every live call once before presenting. Cache by input hash. |
| Malformed tool JSON | Strip code fences before parsing. Try/except with a hardcoded fallback — the demo never hard-fails. |
| Venue wifi dies | Screen recording of the full run on a local drive. Insurance only — don't lead with it. |
| Settlement arithmetic wrong on stage | Python. Never the model. |
| Scope creep past 15:45 | The freeze is not negotiable. Cut order is in §10. |
| Secrets in the public repo | `.env` in `.gitignore` from commit one. `git log -p` before going public. |

---

## 13. Cut list — do not build

Real payments · auth or accounts · real multiplayer · trading out before resolution · order matching · any RNG or casino game · notifications · mobile · more than four users · anything containing the word "wallet"

---

## 14. The one thing to protect

If the demo drifts into being about the leaderboard, the animations, or the trading interface, you've built a game with studying attached — and the brief explicitly warns against tools that are easy to build and easy to ignore.

**Every beat comes back to the number.** The product is the moment someone watches their own price fall while they're not working, and starts working.

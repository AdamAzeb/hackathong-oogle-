# DATA.md — BACKED

All content lives in `data.js`. No string is ever hardcoded in `app.js` or `index.html`.
Every place the real backend will plug in is marked `// HOOK:`.

---

## data.js

```js
/* ============================================================
   BACKED — mock data
   Swap these objects for API responses. Hook points marked below.
   ============================================================ */

export const USER = {
  name: "Max",
  initial: "M",
  balance: 1240
};

export const CHIPS = ["Live", "Today", "My markets", "Group", "Resolved"];

// HOOK: GET /market/:id
export const MARKET = {
  id: "mkt_thermo_01",
  subject: "Max",
  initial: "M",
  question: "Max finishes the thermodynamics problem set",
  duration: "30 MIN",
  resolves: "RESOLVES 10:00",
  volume: 350,
  holders: 4,
  openingPrice: 64,
  form: [0,1,0,0,1,0,0],          // rightmost = most recent. 1 hit, 0 miss.
  // HOOK: open_market → Gemma, thinking:high
  openingComment: "Opening you at 64. You've cleared thirty-minute blocks at ten in the morning seven times from nine — that's the only reason this line isn't worse."
};

// HOOK: price_position → Gemma, one call per counterparty
export const DEMO = {
  positions: [
    { who:"Priya", side:"no", size:120, price:36, to:51,
      book:"Priya takes No at 36. She's 12-4 on this group." },
    { who:"Tom",   side:"no", size:80,  price:49, to:42,
      book:"Tom follows her in." },
    { who:"Sara",  side:"no", size:150, price:58, to:31,
      book:"Sara hits it hard. The book is getting a very clear message." }
  ],
  atNumber: "The market has you at 31%",
  afterAll: "Three of three took No. The market is telling you something you already know.",

  // HOOK: margin_call → Gemma, thinking:off
  marginCall: {
    triggersAt: 24,
    label: "MARGIN CALL",
    text: "Nine minutes idle, you've drifted to 24, and Sara's adding to her No. One problem gets you back over thirty."
  },

  recoversTo: 38,

  // HOOK: resolve_market → Gemma, thinking:high, multimodal
  resolution: {
    verdict: "RESOLVED YES",
    confidence: 88,
    text: "Photograph shows six worked problems on entropy change with unit-consistent working, consistent with roughly thirty minutes of effort. Not graded for correctness. No holders may challenge for five minutes."
  },

  settledCaption: "Settled · No holders paid at 31¢"
};

export const ORDER_BOOK = {
  bids: [
    { price:31, size:120, total:120 },
    { price:29, size:80,  total:200 },
    { price:26, size:210, total:410 },
    { price:22, size:95,  total:505 },
    { price:18, size:140, total:645 }
  ],
  asks: [
    { price:33, size:90,  total:90 },
    { price:36, size:150, total:240 },
    { price:41, size:70,  total:310 },
    { price:45, size:180, total:490 },
    { price:52, size:110, total:600 }
  ]
};

export const ACTIVITY = [
  { who:"Sara",  side:"no",  size:150, price:58, ago:"2m" },
  { who:"Tom",   side:"no",  size:80,  price:49, ago:"4m" },
  { who:"Priya", side:"no",  size:120, price:36, ago:"7m" },
  { who:"Max",   side:"yes", size:50,  price:64, ago:"9m" }
];

export const HOLDERS = {
  yes: [{ who:"Max", size:50 }],
  no:  [{ who:"Sara", size:150 }, { who:"Priya", size:120 }, { who:"Tom", size:80 }]
};

export const COMMENTS = [
  { who:"Sara",  ago:"6m", text:"four pm thermo. we've all seen this film" },
  { who:"Tom",   ago:"5m", text:"taking No purely on the 4pm slot tbf" },
  { who:"Max",   ago:"3m", text:"the disrespect is noted" }
];

export const FOLLOW_THROUGH = [
  { name:"Sara",  rate:"81%", pnl:+240 },
  { name:"Priya", rate:"74%", pnl:+180 },
  { name:"Max",   rate:"52%", pnl:-60, self:true },
  { name:"Tom",   rate:"46%", pnl:-95 }
];

export const SHARPEST = [
  { name:"Sara",  record:"12-4", pnl:+410 },
  { name:"Tom",   record:"9-6",  pnl:+120 },
  { name:"Priya", record:"7-8",  pnl:-40 },
  { name:"Max",   record:"3-9",  pnl:-210, self:true }
];
```

---

## Backend contract

When the engine is ready, these are the only replacements needed.

| Hook | Replaces | Returns |
|---|---|---|
| `MARKET.openingPrice` + `openingComment` | `open_market` | `{ probability: int, rationale: string }` |
| — | `counter_offer` | `{ reason: string, revised: {topic, minutes, hour} }` — renders as a modal over the market card |
| `DEMO.positions[]` | `price_position` per counterparty | `{ who, side, size, price }` |
| `DEMO.marginCall.text` | `margin_call` | `{ text: string }` |
| `DEMO.resolution` | `resolve_market` | `{ verdict, confidence, text }` |

**Note for whoever wires the backend:** the counter-offer modal is not built in Phase 1–4. If the engine is ready before 15:45, add it as a simple overlay on the market card with the reason, the revised commitment, and an `Accept` button. If not, the demo opens the market directly and the refusal is described verbally.

## Copy rules — non-negotiable

The emotional design of this product depends on the interface staying impersonal.

**Always:** "The market has you at 31%" · "You've drifted to 24" · "Three of three took No"
**Never:** "Your friends think you'll fail" · "You're falling behind" · "Don't give up!"

Market language is neutral, and neutral is what makes the number survivable rather than humiliating. No exclamation marks anywhere in the app. No encouragement. The interface reports prices; it does not have feelings about you.

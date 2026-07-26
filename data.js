/* ============================================================
   BACKED — mock data
   Swap these objects for API responses. Hook points marked below.

   NOTE ON `export`: DATA.md specifies `export const`. ES modules are
   blocked by CORS under file:// , which BUILD.md requires, so these are
   plain top-level consts loaded via <script>. Shapes are unchanged — a
   bundler build can re-add `export` with no other edits.
   ============================================================ */

const USER = {
  name: "Max",
  initial: "M",
  balance: 1240
};

const CHIPS = ["Live", "Today", "My markets", "Group", "Resolved"];

// HOOK: GET /market/:id
const MARKET = {
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

// HOOK: GET /market/:id/series — pre-market line history, oldest first.
// The demo resets the chart to exactly this series, then extends it live.
const SERIES_BASE = [
  62,63,62,64,63,65,64,66,65,64,66,65,63,
  64,66,65,64,63,65,64,66,65,64,65,64,64
];

// HOOK: price_position → Gemma, one call per counterparty
const DEMO = {
  // HOOK: counter_offer → Gemma, thinking:high. The doomed commitment the
  // demo asks for first; reason/revised are the canned fallback if the
  // engine is down. Live values come from BackedAPI.doomedCommitment().
  doomed: {
    topic: "thermodynamics", minutes: 90, hour: "16",
    reason: "You've failed this exact block four times at four in the afternoon. I'm not opening that market.",
    revised: { topic: "thermodynamics", minutes: 30, hour: "10" }
  },

  positions: [
    { who:"Priya", side:"no", size:120, price:36, to:51,
      book:"Priya takes No at 36. She's 12-4 on this group." },
    { who:"Tom",   side:"no", size:80,  price:49, to:42,
      book:"Tom follows her in." },
    { who:"Sara",  side:"no", size:150, price:58, to:31,
      book:"Sara hits it hard. The book is getting a very clear message." }
  ],
  opening: "Opening line set by the book",
  open: "Market open to your group",
  atNumber: "The market has you at 31%",
  afterAll: "Three of three took No. The market is telling you something you already know.",

  // HOOK: margin_call → Gemma, thinking:off
  marginCall: {
    triggersAt: 24,
    label: "MARGIN CALL",
    text: "Nine minutes idle, you've drifted to 24, and Sara's adding to her No. One problem gets you back over thirty."
  },

  sessionCaption: "Session running · 22 min left",

  // §9 asks for 1 point every 900ms AND a margin call at ~9s. From 31 to 24
  // that rate takes 6.3s, putting the call at ~12.8s; the gaps after it are
  // kept as specified. Set this to 360 to match the table's absolute times.
  driftMs: 900,

  recoversTo: 38,

  // HOOK: resolve_market → Gemma, thinking:high, multimodal
  resolution: {
    verdict: "RESOLVED YES",
    confidence: 88,
    text: "Photograph shows six worked problems on entropy change with unit-consistent working, consistent with roughly thirty minutes of effort. Not graded for correctness. No holders may challenge for five minutes."
  },

  settledCaption: "Settled · No holders paid at 31¢",

  // HOOK: GET /standings after settlement — replaces FOLLOW_THROUGH / SHARPEST
  // Derived from the positions above at a cost basis of size × price: Max's
  // Yes 50 @ 64¢ cost $32 and returns $50 (+18); the No holders lose their
  // stakes (Sara 150 @ 58¢ = 87, Tom 80 @ 49¢ = 39, Priya 120 @ 36¢ = 43).
  // Only Max's own completion rate moves — the others' commitments are
  // unaffected by this market, so no row changes rank. See note in app.js.
  settled: {
    followThrough: [
      { name:"Sara",  rate:"81%", pnl:+240 },
      { name:"Priya", rate:"74%", pnl:+180 },
      { name:"Max",   rate:"55%", pnl:-32, self:true },
      { name:"Tom",   rate:"46%", pnl:-95 }
    ],
    sharpest: [
      { name:"Sara",  record:"12-5", pnl:+323 },
      { name:"Tom",   record:"9-7",  pnl:+81 },
      { name:"Priya", record:"7-9",  pnl:-83 },
      { name:"Max",   record:"4-9",  pnl:-192, self:true }
    ]
  }
};

const ORDER_BOOK = {
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

const ACTIVITY = [
  { who:"Sara",  side:"no",  size:150, price:58, ago:"2m" },
  { who:"Tom",   side:"no",  size:80,  price:49, ago:"4m" },
  { who:"Priya", side:"no",  size:120, price:36, ago:"7m" },
  { who:"Max",   side:"yes", size:50,  price:64, ago:"9m" }
];

const HOLDERS = {
  yes: [{ who:"Max", size:50 }],
  no:  [{ who:"Sara", size:150 }, { who:"Priya", size:120 }, { who:"Tom", size:80 }]
};

const COMMENTS = [
  { who:"Sara",  ago:"6m", text:"ten am thermo. we've all seen this film" },
  { who:"Tom",   ago:"5m", text:"taking No purely on the 10am slot tbf" },
  { who:"Max",   ago:"3m", text:"the disrespect is noted" }
];

const FOLLOW_THROUGH = [
  { name:"Sara",  rate:"81%", pnl:+240 },
  { name:"Priya", rate:"74%", pnl:+180 },
  { name:"Max",   rate:"52%", pnl:-60, self:true },
  { name:"Tom",   rate:"46%", pnl:-95 }
];

const SHARPEST = [
  { name:"Sara",  record:"12-4", pnl:+410 },
  { name:"Tom",   record:"9-6",  pnl:+120 },
  { name:"Priya", record:"7-8",  pnl:-40 },
  { name:"Max",   record:"3-9",  pnl:-210, self:true }
];

/* Interface chrome. Kept here so no string is hardcoded in app.js or index.html. */
const UI = {
  brand: "BACKED",
  searchPlaceholder: "Search markets",
  formLabel: "FORM",
  volSuffix: "VOL",
  holdersSuffix: "HOLDERS",
  bookLabel: "THE BOOK",
  run: "▶ RUN",
  reset: "RESET",
  ranges: ["1H", "6H", "1D", "ALL"],
  activeRange: "ALL",
  tradeTabs: ["Buy", "Sell"],
  yes: "Yes",
  no: "No",
  amountLabel: "Amount",
  quickAdd: ["+$1", "+$20", "+$100", "Max"],
  buyPrefix: "Buy",
  payoutPrefix: "To win",
  boughtVerb: "bought",

  depthTabs: ["Order Book", "Activity", "Top Holders", "Comments"],
  bidsHead: "BIDS",
  asksHead: "ASKS",
  colSize: "SIZE",
  colTotal: "TOTAL",
  yesHolders: "YES HOLDERS",
  noHolders: "NO HOLDERS",
  followThroughHead: "FOLLOW-THROUGH",
  sharpestHead: "SHARPEST",
  confidenceLabel: "CONFIDENCE",
  counterLabel: "THE BOOK REFUSES",
  askedLabel: "ASKED",
  counterOfferLabel: "COUNTER",
  acceptCounter: "ACCEPT THE COUNTER",
  minSuffix: "MIN",
  evidenceLabel: "EVIDENCE",
  uploadEvidence: "UPLOAD PHOTO",
  skipEvidence: "SKIP",
  resolvingLabel: "RESOLVING…",
  resolvedPrefix: "RESOLVED",

  hitGlyph: "✓",
  missGlyph: "✗"
};

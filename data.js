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
    revised: { topic: "thermodynamics", minutes: 30, hour: "10" },
    askedProbability: 12          // the punitive line if the learner insists
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

/* ── the rest of the board ──────────────────────────────────────
   HOOK: GET /markets — everything the category chips browse.
   The live market above is NOT repeated here: app.js folds it in
   from MARKET at render time, so its row always shows the price
   currently on screen. Chip membership is derived, never stored —
   `Today` is every open market, `My markets` is every market whose
   subject is USER.name, `Group` is everyone else's, `Resolved` is
   every settled one. Volume and holder count are derived from
   `positions` for the same reason: one source of truth per number.
   ────────────────────────────────────────────────────────────── */
const MARKETS = [
  {
    id: "mkt_fluids_02", subject: "Priya", initial: "P",
    question: "Priya submits the fluids lab report",
    minutes: 60, hour: "14", openingPrice: 66, price: 71,
    form: [1,0,1,1,0,1,1], status: "open",
    book: "Opening Priya at 66. Eleven of her last fourteen hour-blocks landed, and two in the afternoon is her strongest slot.",
    positions: [
      { who:"Sara",  side:"yes", size:90, price:68, ago:"3m" },
      { who:"Tom",   side:"no",  size:40, price:33, ago:"8m" },
      { who:"Priya", side:"yes", size:50, price:66, ago:"21m" }
    ],
    comments: [
      { who:"Tom", ago:"6m", text:"71 is rich for a lab report the night before" }
    ]
  },
  {
    id: "mkt_5k_03", subject: "Tom", initial: "T",
    question: "Tom runs 5k before 08:00",
    minutes: 45, hour: "08", openingPrice: 51, price: 44,
    form: [1,0,0,1,0,0,1], status: "open",
    book: "Fifty-one, and only because you managed it twice this month. The pattern says the alarm wins.",
    positions: [
      { who:"Priya", side:"no",  size:60, price:52, ago:"5m" },
      { who:"Tom",   side:"yes", size:50, price:51, ago:"18m" }
    ],
    comments: [
      { who:"Sara", ago:"4m", text:"he's told us about this 5k for three weeks" },
      { who:"Tom",  ago:"2m", text:"the market is wrong and i will prove it" }
    ]
  },
  {
    id: "mkt_compiler_04", subject: "Sara", initial: "S",
    question: "Sara finishes the compiler assignment",
    minutes: 90, hour: "19", openingPrice: 79, price: 83,
    form: [1,1,1,0,1,1,1], status: "open",
    book: "Seventy-nine. Six of your last seven, and the evening blocks are where you do your actual work.",
    positions: [
      { who:"Sara",  side:"yes", size:50,  price:79, ago:"26m" },
      { who:"Max",   side:"yes", size:100, price:81, ago:"11m" },
      { who:"Priya", side:"yes", size:75,  price:82, ago:"6m" }
    ],
    comments: [
      { who:"Max", ago:"9m", text:"free money, she always ships this stuff" }
    ]
  },
  {
    id: "mkt_lecture_05", subject: "Max", initial: "M",
    question: "Max attends the 09:00 lecture",
    minutes: 50, hour: "09", openingPrice: 58, price: 52,
    form: [1,0,1,0,0,1,0], status: "open",
    book: "Fifty-eight. Nine in the morning is not your hour, but a lecture only asks you to be in a room.",
    positions: [
      { who:"Max",  side:"yes", size:50, price:58, ago:"33m" },
      { who:"Sara", side:"no",  size:70, price:44, ago:"14m" }
    ],
    comments: [
      { who:"Sara", ago:"12m", text:"i have seen your 9ams. no." }
    ]
  },
  {
    id: "mkt_linalg_06", subject: "Max", initial: "M",
    question: "Max finishes the linear algebra sheet",
    minutes: 45, hour: "21", openingPrice: 47, price: 29,
    form: [0,1,0,0,1,0,0], status: "resolved",
    verdict: "NO", confidence: 94,
    resolutionText: "No submission before resolution. Two problems photographed at the deadline, both unfinished — the commitment was for the sheet. Resolved NO.",
    book: "Forty-seven at nine in the evening. You've started this sheet twice and finished it neither time.",
    positions: [
      { who:"Priya", side:"no",  size:110, price:53, ago:"1h" },
      { who:"Tom",   side:"no",  size:65,  price:64, ago:"1h" },
      { who:"Max",   side:"yes", size:50,  price:47, ago:"2h" }
    ],
    comments: [
      { who:"Priya", ago:"1h", text:"9pm linear algebra is a genre of fiction" }
    ]
  },
  {
    id: "mkt_reading_07", subject: "Sara", initial: "S",
    question: "Sara clears her reading list",
    minutes: 120, hour: "11", openingPrice: 62, price: 88,
    form: [1,1,0,1,1,1,1], status: "resolved",
    verdict: "YES", confidence: 91,
    resolutionText: "Photograph shows four annotated chapters with margin notes in the same hand and pen, consistent with a two-hour reading block. Resolved YES.",
    book: "Sixty-two for two hours, which is a long block for anyone. Your record is what's holding this line up.",
    positions: [
      { who:"Sara", side:"yes", size:50,  price:62, ago:"4h" },
      { who:"Max",  side:"no",  size:80,  price:31, ago:"3h" },
      { who:"Tom",  side:"yes", size:120, price:74, ago:"3h" }
    ],
    comments: [
      { who:"Max", ago:"2h", text:"took the No and got what i deserved" }
    ]
  }
];

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
  /* live mode — the full loop on real input */
  newMarket: "＋ NEW",
  commitLabel: "NEW COMMITMENT",
  commitAssignment: "Assignment",
  commitAssignmentPh: "e.g. Thermodynamics problem set 3",
  commitMinutes: "Minutes",
  commitHour: "Start hour",
  getLine: "GET MY LINE",
  scanning: "THE BOOK IS READING YOUR FORM…",
  pricedCaption: "The book has priced you — lock it in",
  publish: "PUBLISH MARKET",
  openCaption: "Market open · positions move the price",
  startSession: "START SESSION",
  sessionLeftSuffix: "min left",
  noSubmission: "NO SUBMISSION",
  noEvidenceText: "No submission before resolution. The commitment was not evidenced. Resolved NO.",
  settledYesCaption: "Settled · Yes holders paid",
  settledNoCaption: "Settled · No holders paid",
  settlementHead: "SETTLEMENT",
  stakeAt: "@",
  finishesVerb: "finishes",
  resolvesPrefix: "RESOLVES",
  sessionRunning: "Session running",
  sessionOver: "Time · submit your evidence or resolve NO",
  bettorLabel: "Trading as",
  bettors: ["Sara", "Priya", "Tom", "Max"],
  mandatoryStake: 50,

  counterLabel: "THE BOOK REFUSES",
  askedLabel: "ASKED",
  counterOfferLabel: "COUNTER",
  acceptCounter: "ACCEPT THE COUNTER",
  openAnyway: "OPEN IT ANYWAY",
  minSuffix: "MIN",
  evidenceLabel: "EVIDENCE",
  uploadEvidence: "UPLOAD PHOTO",
  skipEvidence: "SKIP",
  resolvingLabel: "RESOLVING…",
  resolvedPrefix: "RESOLVED",

  /* category chips — one heading per chip, keyed by the chip's own label */
  back: "← BACK",
  listHeads: {
    "Today":      "RESOLVING TODAY",
    "My markets": "MARKETS ON ME",
    "Group":      "YOUR GROUP",
    "Resolved":   "SETTLED"
  },
  listSubs: {
    "Today":      "Every open market on the board",
    "My markets": "What the group has priced about you",
    "Group":      "Markets you can take a position in",
    "Resolved":   "Judged, paid, and on the record"
  },
  listEmpty: "Nothing here yet.",
  countSuffix: "MARKETS",
  countSuffix1: "MARKET",
  settledAtPrefix: "at",

  hitGlyph: "✓",
  missGlyph: "✗"
};

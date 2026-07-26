/* ============================================================
   BACKED — rendering, state, demo sequence
   Phases 1 & 2. All strings come from data.js.
   ============================================================ */

'use strict';

/* ── helpers ───────────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* $64.5161… → "64.51". Truncates, never rounds up: the payout shown must
   never exceed the payout owed. */
function trunc2(n){
  return (Math.floor(n * 100) / 100).toFixed(2);
}

function money(n){
  return '$' + n.toLocaleString('en-US');
}

/* cubic-bezier(0.22, 1, 0.36, 1) — the one easing curve in the app */
function bez(x1, y1, x2, y2){
  const cx = t => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const cy = t => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  return function(x){
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++){
      const v = cx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return cy(t);
  };
}
const EASE = bez(0.22, 1, 0.36, 1);

/* ── state ─────────────────────────────────────────────────── */

/* One string drives every visual state. Do not add booleans. */
let state = 'idle';          // idle | trading | session | margin | resolved | settled

function setState(s){
  state = s;
  document.documentElement.dataset.state = s;   // one hook for CSS and debugging
}
let price = 31;              // current market probability, 0–100
let openPrice = MARKET.openingPrice;   // what the delta is measured against
let series = [];             // chart history, oldest first
let side = 'yes';            // trade panel selection
let amount = 20;

let runId = 0;               // invalidates in-flight sequences
let pending = [];            // { timer, rej } for every awaited step in flight
let raf = null;

/* ── chart ─────────────────────────────────────────────────── */

const CHART = { W: 640, H: 130, MIN: 12, MAX: 76 };

function yOf(p){
  const t = (p - CHART.MIN) / (CHART.MAX - CHART.MIN);
  return CHART.H - Math.max(0, Math.min(1, t)) * CHART.H;
}

/* The scripted market lives in a fixed 12–76 window so its drift always reads
   at the same slope. A browsed market picks its own window: an 88¢ line would
   otherwise flatten against the ceiling. setRange(null) restores the default. */
function setRange(pts){
  if (!pts){ CHART.MIN = 12; CHART.MAX = 76; return; }
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const pad = Math.max(7, (hi - lo) * 0.4);
  CHART.MIN = Math.max(0, Math.round(lo - pad));
  CHART.MAX = Math.min(100, Math.round(hi + pad));
}

/* Safety net, not a feature: live prices can walk anywhere between 3 and 97,
   and a clipped line reads as a flat one. Only ever widens. */
function fitRange(pts){
  const lo = Math.min(...pts), hi = Math.max(...pts);
  if (lo < CHART.MIN + 4) CHART.MIN = Math.max(0, Math.round(lo) - 8);
  if (hi > CHART.MAX - 4) CHART.MAX = Math.min(100, Math.round(hi) + 8);
}

function drawChart(pts){
  fitRange(pts);
  const n = pts.length;
  const step = CHART.W / (n - 1);
  let poly = '';
  for (let i = 0; i < n; i++){
    poly += (i ? ' ' : '') + (i * step).toFixed(1) + ',' + yOf(pts[i]).toFixed(1);
  }
  $('line').setAttribute('points', poly);
  $('area').setAttribute('d',
    'M0,' + yOf(pts[0]).toFixed(1) + ' L' + poly.replace(/ /g, ' L') +
    ' L' + CHART.W + ',' + CHART.H + ' L0,' + CHART.H + ' Z');

  const last = pts[n - 1];
  const rising = last >= pts[0];
  $('plot').style.color = rising ? 'var(--yes)' : 'var(--no)';

  const top = (yOf(last) / CHART.H * 100).toFixed(2) + '%';
  $('dot').style.top = top;
  $('tag').style.top = top;
  $('tag').textContent = Math.round(last) + '¢';
}

/* Builds a descending/ascending run of points between two prices, with a
   touch of texture so the line doesn't read as a ruler. */
function segment(from, to, steps){
  const out = [];
  for (let i = 1; i <= steps; i++){
    const t = i / steps;
    const jitter = i === steps ? 0 : (i % 2 ? 0.7 : -0.7);
    out.push(from + (to - from) * t + jitter);
  }
  return out;
}

const SEG = 8;   // points appended per position

/* ── static render ─────────────────────────────────────────── */

function renderChrome(){
  $('brand').textContent = UI.brand;
  $('search').placeholder = UI.searchPlaceholder;
  $('balance').textContent = money(USER.balance);
  $('navAvatar').textContent = USER.initial;
  $('navAvatar').setAttribute('aria-label', USER.name);

  renderChips();

  $('runBtn').textContent = UI.run;
  $('backBtn').textContent = UI.back;
  $('resetBtn').textContent = UI.reset;
  $('bookLabel').textContent = UI.bookLabel;
  $('amountLabel').textContent = UI.amountLabel;
  $('yesName').textContent = UI.yes;
  $('noName').textContent = UI.no;

  $('ranges').innerHTML = UI.ranges.map(r =>
    `<button type="button" class="range${r === UI.activeRange ? ' is-active' : ''}">${r}</button>`).join('');

  $('tradeTabs').innerHTML = UI.tradeTabs.map((t, i) =>
    `<button type="button" class="trade-tab${i === 0 ? ' is-active' : ''}"${i ? ' disabled' : ''}>${t}</button>`).join('');

  $('quick').innerHTML = UI.quickAdd.map(q =>
    `<button type="button" data-q="${q}">${q}</button>`).join('');

  $('depthTabs').innerHTML = UI.depthTabs.map((t, i) =>
    `<button type="button" class="depth-tab" role="tab" data-tab="${i}"
       aria-controls="panel-${i}" aria-selected="false">${t}</button>`).join('');

  $('ftHead').textContent = UI.followThroughHead;
  $('shHead').textContent = UI.sharpestHead;

  $('mcLabel').textContent = DEMO.marginCall.label;
  $('mcText').textContent = DEMO.marginCall.text;
  $('resStamp').textContent = DEMO.resolution.verdict;
  $('resConf').textContent = UI.confidenceLabel + ' ' + DEMO.resolution.confidence + '%';
  $('resText').textContent = DEMO.resolution.text;

  $('coLabel').textContent = UI.counterLabel;
  $('coAccept').textContent = UI.acceptCounter;
  $('eviLabel').textContent = UI.evidenceLabel;
  $('eviBtn').textContent = UI.uploadEvidence;
  $('eviSkip').textContent = UI.skipEvidence;

  $('newBtn').textContent = UI.newMarket;
  $('cLabel').textContent = UI.commitLabel;
  $('cTitleLabel').textContent = UI.commitAssignment;
  $('cTitle').placeholder = UI.commitAssignmentPh;
  $('cMinLabel').textContent = UI.commitMinutes;
  $('cHourLabel').textContent = UI.commitHour;
  $('cGo').textContent = UI.getLine;
  $('bettorLabel').textContent = UI.bettorLabel;
  $('bettor').innerHTML = UI.bettors.map(b => `<option value="${b}">${b}</option>`).join('');
}

/* ── live engine beats (BackedAPI, falls back to data.js mocks) ─ */

function commitmentLine(prefix, c){
  return `${prefix} · ${c.topic} · ${c.minutes} ${UI.minSuffix} · ${c.hour}:00`;
}

/* The refusal modal — advisory, not binding. Resolves with 'accept' or
   'insist'; RESET aborts it. `asked` is the commitment being refused —
   DEMO.doomed for the scripted demo, the typed one in live mode. The
   insist path only exists in live mode; the scripted run stays on rails. */
function showCounter(co, asked = DEMO.doomed, allowInsist = false){
  $('coReason').textContent = co.reason;
  $('coAsked').textContent = commitmentLine(UI.askedLabel, asked);
  $('coRevised').textContent = commitmentLine(UI.counterOfferLabel, co.revised);
  $('coInsist').hidden = !allowInsist;
  $('coInsist').textContent = UI.openAnyway;
  reveal($('counter'));
  return step((entry, done) => {
    $('coAccept').onclick = () => { conceal($('counter')); done('accept'); };
    $('coInsist').onclick = () => { conceal($('counter')); done('insist'); };
  });
}

/* The evidence bar. Resolves with a File, or null on skip; RESET aborts. */
function awaitEvidence(){
  $('eviFile').value = '';
  $('eviLabel').textContent = UI.evidenceLabel;
  $('eviSkip').textContent = UI.skipEvidence;   // live mode relabels it
  reveal($('evi'));
  return step((entry, done) => {
    $('eviBtn').onclick = () => $('eviFile').click();
    $('eviSkip').onclick = () => done(null);
    $('eviFile').onchange = e => done(e.target.files[0] || null);
  });
}

function fileToB64(file){
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);   // strip data: prefix
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });
}

function setResolution(r){
  $('resStamp').textContent = UI.resolvedPrefix + ' ' + r.resolution;
  $('resStamp').classList.toggle('is-no', r.resolution === 'NO');
  $('resConf').textContent = UI.confidenceLabel + ' ' + r.confidence + '%';
  $('resText').textContent = r.text;
}

/* ── 11. session / margin call / resolution / settlement ───── */

function reveal(el){
  clearTimeout(el._t);
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-on'));
}

function conceal(el){
  clearTimeout(el._t);
  el.classList.remove('is-on');
  el._t = setTimeout(() => { el.hidden = true; }, REDUCED ? 0 : 200);
}

function hideNow(el){
  clearTimeout(el._t);
  el.classList.remove('is-on');
  el.hidden = true;
}

/* Drift: one point per DEMO.driftMs until the margin call triggers. */
async function drift(to){
  while (Math.round(price) > to){
    await sleep(DEMO.driftMs);
    setPrice(Math.round(price) - 1);
    series.push(price);
    drawChart(series);
  }
}

/* The payoff moment: one row per position — side, stake, and the win or
   loss it settled to. Winners net stake × (100 − price) / price; losers
   forfeit the stake. Same arithmetic as the leaderboard deltas. */
function renderSettlement(positions, yes){
  $('payLabel').textContent = UI.settlementHead;
  $('payRows').innerHTML = positions.map(p => {
    const won = (p.side === 'yes') === yes;
    const d = won ? Math.round(p.size * (100 - p.price) / p.price) : -p.size;
    const sideLabel = p.side === 'yes' ? UI.yes : UI.no;
    return `<div class="pay-row">
       <span class="av">${p.who[0]}</span>
       <span class="pay-who">${p.who}</span>
       <span class="pay-pos mono"><span class="feed-side ${p.side}">${sideLabel}</span> ${p.size} ${UI.stakeAt} ${p.price}¢</span>
       <span class="pay-delta mono ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}$${Math.abs(d)}</span>
     </div>`;
  }).join('');
  reveal($('pay'));
}

/* Settlement: the newest form square becomes a hit and the boards restate.
   The rows animate to their new positions, but note that with DATA.md's
   figures nobody actually changes rank — only Max's own numbers move, so
   what reads on screen is the figures restating, not rows swapping. */
function settle(){
  liveResult = { verdict: 'YES', confidence: DEMO.resolution.confidence };
  renderForm(MARKET.form.slice(0, -1).concat(1), true);
  flipBoard('ftRows', DEMO.settled.followThrough, 'rate');
  flipBoard('shRows', DEMO.settled.sharpest, 'record');
  renderSettlement(ACTIVITY, true);        // the scripted market resolves YES
  setCaption(DEMO.settledCaption, false);
}

function flipBoard(box, rows, stat){
  const was = new Map();
  [...$(box).children].forEach(r => was.set(r.dataset.name, r.getBoundingClientRect().top));

  renderBoard(box, rows, stat);
  if (REDUCED) return;

  [...$(box).children].forEach(r => {
    const before = was.get(r.dataset.name);
    if (before === undefined) return;
    const dy = before - r.getBoundingClientRect().top;
    if (!dy) return;
    r.style.transform = `translateY(${dy}px)`;
    requestAnimationFrame(() => {
      r.classList.add('settling');
      r.style.transform = '';
    });
  });
}

/* Everything Phase 4 adds to the page, cleared so a re-run starts clean. */
function resetPhase4(){
  liveResult = null;
  hideNow($('mc'));
  hideNow($('res'));
  hideNow($('pay'));
  hideNow($('counter'));
  hideNow($('commit'));
  hideNow($('evi'));
  $('resStamp').classList.remove('is-no');
  renderForm(MARKET.form, false);
  renderBoards();
}

/* ── 8. tabbed section ─────────────────────────────────────── */

const TAB_BOOK = 0, TAB_ACTIVITY = 1;

function openTab(i){
  [...$('depthTabs').children].forEach((t, n) => {
    t.classList.toggle('is-active', n === i);
    t.setAttribute('aria-selected', String(n === i));
  });
  UI.depthTabs.forEach((_, n) => $('panel-' + n).classList.toggle('is-open', n === i));
}

/* ORDER_BOOK is mock depth quoted around 31¢, so it's read as offsets from
   that price and re-anchored for whatever market is on screen — a market at
   71 must not show the scripted market's ladder. Offsets are squeezed, not
   clamped, when the anchor sits too near 0 or 100 to fit them: clamping
   stacks two levels on the same price. At anchor 31 this reproduces
   ORDER_BOOK exactly, digit for digit. */
const LADDER_ANCHOR = 31;

function ladder(anchor){
  const legs = (rows, up) => {
    const span = Math.max(...rows.map(r => Math.abs(r.price - LADDER_ANCHOR)));
    const room = up ? 99 - anchor : anchor - 1;
    const k = span ? Math.min(1, room / span) : 1;
    let total = 0;
    return rows.map(r => {
      total += r.size;
      return { price: anchor + Math.round((r.price - LADDER_ANCHOR) * k),
               size: r.size, total };
    });
  };
  return { bids: legs(ORDER_BOOK.bids, false), asks: legs(ORDER_BOOK.asks, true) };
}

function renderOrderBook(anchor = LADDER_ANCHOR){
  const book = ladder(Math.round(anchor));
  // widest bar is scaled to the deepest level on either side
  const peak = Math.max(...book.bids.concat(book.asks).map(r => r.size));

  const col = (rows, kind, head) =>
    `<div class="ob-head ${kind}s">
       <span class="side-label">${head}</span>
       <span class="ob-size">${UI.colSize}</span>
       <span class="ob-total">${UI.colTotal}</span>
     </div>` +
    rows.map(r =>
      `<div class="ob-row ${kind}">
         <span class="ob-bar" style="width:${(r.size / peak * 100).toFixed(1)}%"></span>
         <span class="ob-price">${r.price}¢</span>
         <span class="ob-size">${r.size}</span>
         <span class="ob-total">${r.total}</span>
       </div>`).join('');

  $('obBids').innerHTML = col(book.bids, 'bid', UI.bidsHead);
  $('obAsks').innerHTML = col(book.asks, 'ask', UI.asksHead);
}

function renderHolders(h = HOLDERS){
  const col = (rows, kind, head) =>
    `<div class="hold-head ${kind}">${head}</div>` +
    rows.map(x =>
      `<div class="hold-row">
         <span class="av">${x.who[0]}</span>
         <span class="hold-name">${x.who}</span>
         <span class="hold-size">${x.size}</span>
       </div>`).join('');

  $('holdYes').innerHTML = col(h.yes, 'yes', UI.yesHolders);
  $('holdNo').innerHTML = col(h.no, 'no', UI.noHolders);
}

function renderComments(list = COMMENTS){
  if (!list.length){
    $('comments').innerHTML = `<div class="list-empty">${UI.listEmpty}</div>`;
    return;
  }
  $('comments').innerHTML = list.map(c =>
    `<div class="cmt">
       <span class="av">${c.who[0]}</span>
       <div>
         <div class="cmt-head">
           <span class="cmt-who">${c.who}</span>
           <span class="cmt-ago">${c.ago}</span>
         </div>
         <div class="cmt-body">${c.text}</div>
       </div>
     </div>`).join('');
}

/* ── 10. leaderboards ──────────────────────────────────────── */

function pnl(n){
  return `<span class="board-pnl ${n >= 0 ? 'up' : 'down'}">${n >= 0 ? '+' : '-'}$${Math.abs(n)}</span>`;
}

function renderBoard(box, rows, stat){
  $(box).innerHTML = rows.map((r, i) =>
    `<div class="board-row${r.self ? ' is-self' : ''}" data-name="${r.name}">
       <span class="board-rank">${i + 1}</span>
       <span class="board-name">${r.name}</span>
       <span class="board-stat">${r[stat]}</span>
       ${pnl(r.pnl)}
     </div>`).join('');
}

function renderBoards(){
  renderBoard('ftRows', FOLLOW_THROUGH, 'rate');
  renderBoard('shRows', SHARPEST, 'record');
}

function renderMarket(){
  $('thumb').textContent = MARKET.initial;
  $('question').textContent = MARKET.question;

  const d = '<span class="dot"></span>';
  $('meta').innerHTML = [
    MARKET.duration,
    MARKET.resolves,
    money(MARKET.volume) + ' ' + UI.volSuffix,
    MARKET.holders + ' ' + UI.holdersSuffix
  ].join(d);

  renderForm(MARKET.form, false);
}

/* flipNewest animates only the rightmost square — the one animation the form
   line is allowed, and only on settlement */
function formSquares(form, flipNewest){
  const last = form.length - 1;
  return form.map((f, i) => {
    const cls = (f ? 'hit' : 'miss') + (flipNewest && i === last ? ' flip' : '');
    return `<span class="form-sq ${cls}">${f ? UI.hitGlyph : UI.missGlyph}</span>`;
  }).join('');
}

function renderForm(form, flipNewest){
  $('form').innerHTML =
    `<span class="form-label">${UI.formLabel}</span>` + formSquares(form, flipNewest);
}

/* ── price / trade panel ───────────────────────────────────── */

/* "▲ +7" / "▼ -12" / "— 0" — one direction vocabulary for the price block and
   the list rows */
function deltaClass(diff){
  return diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
}

function deltaText(diff){
  return diff > 0 ? '▲ +' + diff : diff < 0 ? '▼ ' + diff : '— 0';
}

function setPrice(v){
  price = Math.max(0, Math.min(100, v));   // a probability, never outside 0–100
  const shown = Math.round(price);

  $('priceNum').textContent = shown;

  const diff = shown - openPrice;
  const delta = $('delta');
  delta.className = 'delta mono ' + deltaClass(diff);
  delta.textContent = deltaText(diff);

  $('yesPrice').textContent = shown + '¢';
  $('noPrice').textContent = (100 - shown) + '¢';
  renderPayout();
}

function setCaption(text, hero){
  const c = $('caption');
  c.textContent = text;
  c.className = 'caption' + (hero ? ' is-hero' : '');
}

function setBook(text){
  const b = $('bookBody');
  if (REDUCED){ b.textContent = text; return; }
  b.classList.add('fading');
  setTimeout(() => {
    b.textContent = text;
    b.classList.remove('fading');
  }, 200);
}

function renderPayout(){
  const cents = side === 'yes' ? Math.round(price) : 100 - Math.round(price);
  const win = cents > 0 ? amount / (cents / 100) : 0;
  $('payout').textContent = UI.payoutPrefix + ' $' + trunc2(win);
  $('action').textContent = UI.buyPrefix + ' ' + (side === 'yes' ? UI.yes : UI.no);
  $('action').className = 'action' + (side === 'no' ? ' is-no' : '');
  $('pickYes').setAttribute('aria-pressed', String(side === 'yes'));
  $('pickNo').setAttribute('aria-pressed', String(side === 'no'));
}

/* ── activity feed ─────────────────────────────────────────── */

function feedRow(p, landing){
  const row = document.createElement('div');
  row.className = 'feed-row' + (landing ? ' landing' : '');
  const label = p.side === 'yes' ? UI.yes : UI.no;
  row.innerHTML =
    `<span class="av">${p.who[0]}</span>` +
    `<span class="feed-txt"><span class="feed-who">${p.who}</span> ${UI.boughtVerb} ` +
    `<span class="feed-side ${p.side}">${label}</span> ` +
    `<span class="feed-num">${p.size}</span> @ <span class="feed-num">${p.price}¢</span></span>` +
    `<span class="feed-ago">${p.ago || ''}</span>`;
  return row;
}

function renderFeed(rows){
  const box = $('feedRows');
  box.innerHTML = '';
  rows.forEach(r => box.appendChild(feedRow(r, false)));
}

function pushFeed(p){
  const box = $('feedRows');
  box.insertBefore(feedRow(p, true), box.firstChild);
}

/* ── the two page states built in Phase 1 & 2 ──────────────── */

/* Page load: the market has already traded down to 31. */
function renderTraded(){
  setState('idle');
  resetPhase4();
  setRange(null);
  openPrice = MARKET.openingPrice;
  series = SERIES_BASE.slice();
  let from = MARKET.openingPrice;
  DEMO.positions.forEach(p => {
    series = series.concat(segment(from, p.to, SEG));
    from = p.to;
  });
  setPrice(DEMO.positions[DEMO.positions.length - 1].to);
  drawChart(series);
  setCaption(DEMO.atNumber, true);
  $('bookBody').textContent = DEMO.afterAll;
  renderFeed(ACTIVITY);
  openTab(TAB_BOOK);
}

/* t = 0.0s of the sequence — and what RESET returns to. */
function renderOpening(){
  setState('idle');
  resetPhase4();
  setRange(null);
  openPrice = MARKET.openingPrice;
  series = SERIES_BASE.slice();
  setPrice(MARKET.openingPrice);
  drawChart(series);
  setCaption(DEMO.opening, false);
  $('bookBody').textContent = MARKET.openingComment;
  // The subject's own opening position — the market is never empty.
  renderFeed(ACTIVITY.filter(a => a.who === MARKET.subject));
  /* Activity, not the book: the ladder is static mock depth quoted around 31,
     which would contradict the 64 opening line if it were on screen here.
     §8's "Order Book open by default" governs page load — see renderTraded. */
  openTab(TAB_ACTIVITY);
}

/* ── sequence plumbing ─────────────────────────────────────── */

const ABORT = Symbol('abort');

/* Every awaited step must be rejected, not just cancelled: clearing a timer
   alone orphans its promise and leaves runDemo suspended forever with its
   finally block unrun. */
function clearTimeline(){
  runId++;
  const dropped = pending;
  pending = [];
  dropped.forEach(p => { if (p.timer) clearTimeout(p.timer); p.rej(ABORT); });
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}

function step(fn){
  const id = runId;
  return new Promise((res, rej) => {
    const entry = { timer: null, rej };
    pending.push(entry);
    const done = v => { pending = pending.filter(p => p !== entry); id === runId ? res(v) : rej(ABORT); };
    fn(entry, done, () => id !== runId);
  });
}

function sleep(ms){
  return step((entry, done) => {
    entry.timer = setTimeout(done, REDUCED ? Math.min(ms, 120) : ms);
  });
}

function countTo(to, dur){
  const from = price;
  const base = series.slice();

  const land = () => {
    series = base.concat(segment(from, to, SEG));
    setPrice(to);
    drawChart(series);
  };

  if (REDUCED){ land(); return Promise.resolve(); }

  return step((entry, done, aborted) => {
    /* Progress is read from performance.now() inside the frame, never from
       the rAF timestamp: that argument is the frame's start time and can be
       *earlier* than a t0 captured mid-frame, which drives progress negative
       and runs the price backwards. Clamped so it can never overshoot. */
    const t0 = performance.now();
    raf = requestAnimationFrame(function frame(){
      if (aborted()) return;                 // clearTimeline already rejected
      const p = Math.max(0, Math.min(1, (performance.now() - t0) / dur));
      const e = EASE(p);
      const v = from + (to - from) * e;
      setPrice(v);
      drawChart(base.concat(segment(from, v, Math.max(1, Math.round(e * SEG)))));

      if (p < 1){
        raf = requestAnimationFrame(frame);
      } else {
        raf = null;
        land();
        done();
      }
    });
  });
}

/* ── LIVE MODE — the full loop on the presenter's real input ──
   NEW → type the assignment → Gemma prices (or refuses) it →
   publish (the subject's mandatory Yes lands) → bets move the
   price → session with drift + live margin call → submission
   portal → Gemma judges the upload → the right side gets paid.
   The scripted ▶ RUN sequence is untouched as the fallback. */

let LIVE = null;   // { commitment:{title,minutes,hour}, positions:[], stage, done }

function setStage(label){
  const b = $('stageBtn');
  b.hidden = !label;
  if (label) b.textContent = label;
}

function liveQuestion(c){
  return `${MARKET.subject} ${UI.finishesVerb} ${c.title}`;
}

function liveMeta(){
  const c = LIVE.commitment;
  const vol = LIVE.positions.reduce((s, p) => s + p.size, 0);
  const n = new Set(LIVE.positions.map(p => p.who)).size;
  const d = '<span class="dot"></span>';
  $('meta').innerHTML = [
    c.minutes + ' ' + UI.minSuffix,
    UI.resolvesPrefix + ' ' + String(c.hour).padStart(2, '0') + ':00',
    money(vol) + ' ' + UI.volSuffix,
    n + ' ' + UI.holdersSuffix
  ].join(d);
}

/* Positions → the two holder columns, biggest first. One position per row is
   what the feed shows; this is the same data added up per person. */
function holdersFrom(positions){
  const agg = s => {
    const m = new Map();
    positions.filter(p => p.side === s)
      .forEach(p => m.set(p.who, (m.get(p.who) || 0) + p.size));
    return [...m].map(([who, size]) => ({ who, size })).sort((a, b) => b.size - a.size);
  };
  return { yes: agg('yes'), no: agg('no') };
}

function liveHolders(){
  return holdersFrom(LIVE.positions);
}

function openCommit(){
  clearTimeline();
  $('runBtn').disabled = false;
  $('cGo').disabled = false;
  $('cGo').textContent = UI.getLine;
  reveal($('commit'));
}

async function priceCommitment(){
  const title = $('cTitle').value.trim();
  const minutes = Math.max(5, Number($('cMin').value) || 30);
  const hour = String(Number($('cHour').value) || 10).padStart(2, '0');
  if (!title) return;

  clearTimeline();
  const id = runId;
  $('cGo').disabled = true;
  $('cGo').textContent = UI.scanning;

  let asked = { topic: title, minutes, hour };
  let co = await BackedAPI.openingLine({ topic: title, minutes, start_hour: hour });
  if (id !== runId) return;
  conceal($('commit'));

  if (co.action === 'counter_offer'){
    let choice;
    try { choice = await showCounter(co, asked, true); }
    catch (e){ if (e === ABORT) return; throw e; }
    if (choice === 'insist'){
      /* The user defines the market. The book opens it — at the punitive
         line their record earns. The refusal becomes the rationale. */
      co = { action: 'open_market',
             probability: co.asked_probability || DEMO.doomed.askedProbability,
             rationale: co.reason };
    } else {
      asked = { topic: co.revised.topic, minutes: Number(co.revised.minutes),
                hour: String(co.revised.hour).padStart(2, '0') };
      co = await BackedAPI.openingLine({ topic: asked.topic, minutes: asked.minutes, start_hour: asked.hour });
      if (id !== runId) return;
    }
  }

  LIVE = { commitment: { title: asked.topic, minutes: asked.minutes, hour: asked.hour },
           positions: [], stage: 'priced', done: false };
  setState('idle');
  resetPhase4();
  $('question').textContent = liveQuestion(LIVE.commitment);
  series = SERIES_BASE.map((_, i) => co.probability + (i % 2 ? 0.7 : -0.7));
  openPrice = co.probability;
  /* Gemma can open anywhere from 5 to 95, so the window is built around the
     line rather than inherited: the extremes are where the session's drift and
     the bets can plausibly take it, so the chart doesn't rescale mid-beat. */
  setRange(series.concat([co.probability - 20, co.probability + 12]));
  setPrice(co.probability);
  drawChart(series);
  setBook(co.rationale);
  setCaption(UI.pricedCaption, false);
  renderFeed([]);
  renderHolders({ yes: [], no: [] });
  renderOrderBook(co.probability);
  renderComments([]);
  liveMeta();
  openTab(TAB_ACTIVITY);
  setStage(UI.publish);
}

function publishLive(){
  LIVE.stage = 'open';
  setState('trading');
  setCaption(UI.openCaption, false);
  setStage(UI.startSession);
  placeBet(MARKET.subject, 'yes', UI.mandatoryStake);   // the subject always backs themselves
}

async function placeBet(who, betSide, stake){
  if (!LIVE || LIVE.stage !== 'open' || !(stake > 0)) return;
  const p = Math.round(price);
  const exec = betSide === 'yes' ? p : 100 - p;
  LIVE.positions.push({ who, side: betSide, size: stake, price: exec });
  pushFeed({ who, side: betSide, size: stake, price: exec, ago: 'now' });
  liveMeta();
  renderHolders(liveHolders());
  const delta = Math.max(1, Math.round(stake / 20)) * (betSide === 'yes' ? 1 : -1);
  try { await countTo(Math.max(3, Math.min(97, p + delta)), 500); }
  catch (e){ if (e !== ABORT) throw e; }
  renderOrderBook(price);          // the ladder follows the line it quotes
}

async function startSessionLive(){
  LIVE.stage = 'session';
  setStage(null);
  clearTimeline();
  const id = runId;
  setState('session');

  /* the submission portal stays open for the whole session */
  $('eviFile').value = '';
  $('eviLabel').textContent = UI.evidenceLabel;
  $('eviSkip').textContent = UI.noSubmission;
  reveal($('evi'));
  $('eviBtn').onclick = () => $('eviFile').click();
  $('eviFile').onchange = e => { const f = e.target.files[0]; if (f) submitLive(f); };
  $('eviSkip').onclick = () =>
    resolveLive({ resolution: 'NO', confidence: 100, text: UI.noEvidenceText });

  try {
    let left = LIVE.commitment.minutes;              // compressed: 1 min ≈ 700ms
    const target = Math.max(5, Math.round(price) - 7);
    const mcPromise = BackedAPI.marginCall({
      price_now: target, minutes_left: Math.max(1, Math.round(left * 0.6)) });
    let called = false;

    while (left > 0){
      setCaption(`${UI.sessionRunning} · ${left} ${UI.sessionLeftSuffix}`, false);
      await sleep(700);
      left--;
      const idlePhase = left < LIVE.commitment.minutes - 3;
      if (idlePhase && Math.round(price) > target){
        setPrice(Math.round(price) - 1);             // idle drift, in public
        series.push(price);
        drawChart(series);
      }
      if (idlePhase && !called && Math.round(price) <= target){
        called = true;
        setState('margin');
        const mc = await mcPromise;
        if (id !== runId) return;
        $('mcText').textContent = mc.text;
        reveal($('mc'));
        await sleep(3000);
        conceal($('mc'));
        setState('session');
      }
    }
    setCaption(UI.sessionOver, false);
  } catch (e){
    if (e !== ABORT) throw e;
  }
}

async function submitLive(file){
  if (!LIVE || LIVE.done) return;
  const id = runId;
  $('eviLabel').textContent = UI.resolvingLabel;
  const b64 = await fileToB64(file);
  const r = await BackedAPI.resolve(b64, null, {
    market_id: 'live_' + Date.now(),
    commitment: liveQuestion(LIVE.commitment),
    topic: LIVE.commitment.title,
    minutes: LIVE.commitment.minutes
  });
  if (id !== runId || !LIVE || LIVE.done) return;
  resolveLive(r);
}

function resolveLive(r){
  if (!LIVE || LIVE.done) return;
  LIVE.done = true;
  clearTimeline();                                   // stops the session timer
  conceal($('evi'));
  hideNow($('mc'));
  setResolution(r);
  setState('resolved');
  reveal($('res'));
  settleLive(r.resolution === 'YES');
}

/* Payouts are arithmetic, never the model: winners collect stake × (100 − price) / price,
   losers forfeit their stake. */
function settleLive(yes){
  setState('settled');
  liveResult = { verdict: yes ? 'YES' : 'NO' };
  const deltas = new Map();
  LIVE.positions.forEach(p => {
    const won = (p.side === 'yes') === yes;
    const d = won ? Math.round(p.size * (100 - p.price) / p.price) : -p.size;
    deltas.set(p.who, (deltas.get(p.who) || 0) + d);
  });
  const adjust = rows => rows.map(r => ({ ...r, pnl: r.pnl + (deltas.get(r.name) || 0) }));
  flipBoard('ftRows', adjust(FOLLOW_THROUGH), 'rate');
  flipBoard('shRows', adjust(SHARPEST), 'record');
  renderForm(MARKET.form.slice(1).concat(yes ? 1 : 0), true);
  renderSettlement(LIVE.positions, yes);
  setCaption(yes ? UI.settledYesCaption : UI.settledNoCaption, false);
}

/* ── §9 the demo sequence ──────────────────────────────────── */

async function runDemo(){
  clearTimeline();
  const id = runId;
  $('runBtn').disabled = true;
  let live = false;                        // engine reachable this run?

  try {
    /* Beat 0 — the refusal. The doomed commitment goes to the live book;
       Gemma counters, the learner accepts, and THEN the market opens.
       Canned refusal if the engine is down — the beat always plays. */
    const co = await BackedAPI.doomedCommitment();
    if (id !== runId) throw ABORT;
    live = !co.fallback;
    if (co.action === 'counter_offer') await showCounter(co);

    renderOpening();                       // 0.0s
    await sleep(700);

    setCaption(DEMO.open, false);          // 0.7s
    await sleep(800);

    setState('trading');
    const ago = ['7m', '4m', '2m'];
    for (let i = 0; i < DEMO.positions.length; i++){
      const p = DEMO.positions[i];
      pushFeed({ who: p.who, side: p.side, size: p.size, price: p.price, ago: ago[i] });
      setBook(p.book);
      await countTo(p.to, 700);            // 1.5s / 2.6s / 3.7s
      if (i < DEMO.positions.length - 1) await sleep(400);
    }

    setCaption(DEMO.atNumber, true);       // 4.4s — hold here
    setBook(DEMO.afterAll);

    await sleep(2100);                     // 6.5s — the session starts
    setState('session');
    setCaption(DEMO.sessionCaption, false);
    /* prefetch the live nudge during the drift; cached → instant */
    const mcPromise = BackedAPI.marginCall();
    await drift(DEMO.marginCall.triggersAt);

    setState('margin');                    // price hit 24, drift stops
    const mc = await mcPromise;
    if (id !== runId) throw ABORT;
    $('mcText').textContent = mc.text;
    reveal($('mc'));
    await sleep(3000);

    setState('session');                   // work happened
    conceal($('mc'));
    await countTo(DEMO.recoversTo, 1200);
    await sleep(800);

    setState('resolved');
    /* Live: pause for the evidence photograph and let Gemma judge it.
       Engine down (or SKIP): the canned verdict, no pause. */
    if (live){
      const file = await awaitEvidence();
      if (file){
        $('eviLabel').textContent = UI.resolvingLabel;
        const b64 = await fileToB64(file);
        const r = await BackedAPI.resolve(b64);
        if (id !== runId) throw ABORT;
        setResolution(r);
      }
      conceal($('evi'));
    }
    reveal($('res'));
    await sleep(1000);

    setState('settled');
    settle();
  } catch (e){
    if (e !== ABORT) throw e;
  } finally {
    if (id === runId) $('runBtn').disabled = false;
  }
}

/* ── THE CATEGORY CHIPS ───────────────────────────────────────
   Live is the market card and everything the demo does to it. Every
   other chip is a list, and a row in that list opens a read-only
   view of that market — same card, same tabs, no ▶ RUN, no trading,
   because you can't drive a sequence on a market you're only reading.
   Membership is derived from the data (see MARKETS in data.js), so
   adding a market to the mock puts it in the right lists for free.
   ────────────────────────────────────────────────────────────── */

const LIVE_CHIP = CHIPS[0];

const CHIP_FILTER = {
  'Today':      m => m.status === 'open',
  'My markets': m => m.subject === USER.name,
  'Group':      m => m.subject !== USER.name,
  'Resolved':   m => m.status === 'resolved'
};

let chip = LIVE_CHIP;        // active chip
let viewing = null;          // the browsed market, or null on the live one
let liveResult = null;       // the live market's verdict once it has settled

function setView(v){
  document.documentElement.dataset.view = v;   // 'market' | 'list'
  $('list').hidden = v !== 'list';             // the card the CSS can't reach
}

/* The live market as a list row. Every field is read at call time — from LIVE
   in live mode, from MARKET otherwise — so the row can never disagree with
   the card it opens. */
function liveEntry(){
  const c = LIVE && LIVE.commitment;
  return {
    id: MARKET.id,
    live: true,
    subject: MARKET.subject,
    initial: MARKET.initial,
    question: c ? liveQuestion(c) : MARKET.question,
    minutes: c ? Number(c.minutes) : parseInt(MARKET.duration, 10),
    hour: c ? c.hour : MARKET.resolves.match(/\d+/)[0],
    openingPrice: openPrice,
    price: Math.round(price),
    form: MARKET.form,
    volume: c ? undefined : MARKET.volume,        // undefined → derived below
    holders: c ? undefined : MARKET.holders,
    positions: c ? LIVE.positions : ACTIVITY,
    status: liveResult ? 'resolved' : 'open',
    verdict: liveResult && liveResult.verdict
  };
}

function marketsFor(name){
  const f = CHIP_FILTER[name];
  return f ? [liveEntry()].concat(MARKETS).filter(f) : [];
}

function renderChips(){
  $('chips').innerHTML = CHIPS.map(name => {
    const on = name === chip;
    // the live market isn't a count, it's the market you're on
    const n = CHIP_FILTER[name] ? `<span class="chip-n">${marketsFor(name).length}</span>` : '';
    return `<button type="button" class="chip${on ? ' is-active' : ''}"
              data-chip="${name}" aria-pressed="${on}">${name}${n}</button>`;
  }).join('');
}

/* Volume and holders are derived from the positions, so a market can't quote a
   number its own activity feed contradicts. The live market passes its own
   figures through — DATA.md authored those to match its card. */
function marketMeta(m){
  const vol = m.volume !== undefined ? m.volume
            : m.positions.reduce((s, p) => s + p.size, 0);
  const held = m.holders !== undefined ? m.holders
             : new Set(m.positions.map(p => p.who)).size;
  return [
    m.minutes + ' ' + UI.minSuffix,
    UI.resolvesPrefix + ' ' + String(m.hour).padStart(2, '0') + ':00',
    money(vol) + ' ' + UI.volSuffix,
    held + ' ' + UI.holdersSuffix
  ].join('<span class="dot"></span>');
}

function marketRow(m){
  const diff = m.price - m.openingPrice;
  const num = m.status === 'resolved'
    ? `<span class="mkt-row-stamp mono${m.verdict === 'NO' ? ' is-no' : ''}">${m.verdict}</span>`
    : `<span class="mkt-row-price mono">${m.price}%</span>
       <span class="mkt-row-delta mono ${deltaClass(diff)}">${deltaText(diff)}</span>`;

  return `<button type="button" class="mkt-row" data-id="${m.id}">
      <span class="thumb mono">${m.initial}</span>
      <span class="mkt-row-id">
        <span class="mkt-row-q">${m.question}</span>
        <span class="meta mono">${marketMeta(m)}</span>
      </span>
      <span class="mkt-row-form" aria-hidden="true">${formSquares(m.form, false)}</span>
      <span class="mkt-row-num">${num}</span>
    </button>`;
}

/* A plausible line for a market nobody watched trade: the pre-market texture
   re-anchored to its opening price, then one leg per position taken, landing
   on the price it's at now. */
function seriesFor(m){
  const anchor = SERIES_BASE[SERIES_BASE.length - 1];
  let s = SERIES_BASE.map(v => m.openingPrice + (v - anchor));
  let from = m.openingPrice;
  m.positions.forEach((p, i) => {
    const to = m.openingPrice + (m.price - m.openingPrice) * ((i + 1) / m.positions.length);
    s = s.concat(segment(from, to, SEG));
    from = to;
  });
  return s;
}

/* Which buttons the market card is allowed. The demo controls belong to the
   live market only: RESET on a browsed market would reset a market that isn't
   on screen. */
function marketButtons(live){
  $('runBtn').hidden = !live;
  $('resetBtn').hidden = !live;
  $('newBtn').hidden = !live;
  $('backBtn').hidden = live;
  if (live) $('runBtn').disabled = false;
  $('action').disabled = !live;
  if (!live) setStage(null);
}

function openMarket(m){
  if (m.live){ showLive(); return; }

  clearTimeline();
  LIVE = null;
  viewing = m;
  setView('market');
  marketButtons(false);
  setState(m.status === 'resolved' ? 'settled' : 'idle');
  resetPhase4();

  $('thumb').textContent = m.initial;
  $('question').textContent = m.question;
  $('meta').innerHTML = marketMeta(m);
  renderForm(m.form, false);

  openPrice = m.openingPrice;
  series = seriesFor(m);
  setRange(series);
  setPrice(m.price);
  drawChart(series);

  $('bookBody').textContent = m.book;
  renderFeed(m.positions);
  renderHolders(holdersFrom(m.positions));
  renderOrderBook(m.price);
  renderComments(m.comments || []);

  if (m.status === 'resolved'){
    setCaption((m.verdict === 'YES' ? UI.settledYesCaption : UI.settledNoCaption) +
               ' ' + UI.settledAtPrefix + ' ' + m.price + '¢', false);
    setResolution({ resolution: m.verdict, confidence: m.confidence, text: m.resolutionText });
    reveal($('res'));
    openTab(TAB_ACTIVITY);          // a settled market's ladder is history
  } else {
    setCaption(UI.openCaption, false);
    openTab(TAB_BOOK);
  }

  window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
}

/* Leaving the live market abandons whatever the demo was doing: a suspended
   sequence would go on mutating a card nobody can see. So it is put back to
   its page-load state the moment you leave, not when you return — that way
   the row in the list and the card it opens can never disagree. */
function resetLiveMarket(){
  clearTimeline();
  LIVE = null;
  setStage(null);
  renderMarket();
  renderOrderBook(DEMO.positions[DEMO.positions.length - 1].to);
  renderHolders(HOLDERS);
  renderComments(COMMENTS);
  renderTraded();
}

/* Clicking Live while already on it does nothing, which is what a presenter
   mid-run expects. */
function showLive(){
  const here = chip === LIVE_CHIP && !viewing;
  chip = LIVE_CHIP;
  viewing = null;
  renderChips();
  setView('market');
  marketButtons(true);
  if (!here) resetLiveMarket();
}

function showList(name){
  resetLiveMarket();
  chip = name;
  viewing = null;
  renderChips();          // after the reset: the live row reads the live card
  setView('list');

  const rows = marketsFor(name);
  $('listHead').textContent = UI.listHeads[name] || name;
  $('listSub').textContent = UI.listSubs[name] || '';
  $('listCount').textContent =
    rows.length + ' ' + (rows.length === 1 ? UI.countSuffix1 : UI.countSuffix);
  $('listRows').innerHTML = rows.length
    ? rows.map(marketRow).join('')
    : `<div class="list-empty">${UI.listEmpty}</div>`;
}

function selectChip(name){
  if (name === LIVE_CHIP) showLive();
  else if (CHIP_FILTER[name]) showList(name);
}

/* ── events ────────────────────────────────────────────────── */

function bind(){
  $('runBtn').addEventListener('click', runDemo);

  $('resetBtn').addEventListener('click', () => {
    clearTimeline();
    LIVE = null;
    setStage(null);
    $('runBtn').disabled = false;
    renderMarket();          // restore the scripted market's question + meta
    renderOpening();
  });

  $('newBtn').addEventListener('click', openCommit);
  $('cGo').addEventListener('click', priceCommitment);
  $('cTitle').addEventListener('keydown', e => { if (e.key === 'Enter') priceCommitment(); });

  $('stageBtn').addEventListener('click', () => {
    if (!LIVE) return;
    if (LIVE.stage === 'priced') publishLive();
    else if (LIVE.stage === 'open') startSessionLive();
  });

  $('action').addEventListener('click', () => {
    if (LIVE && LIVE.stage === 'open') placeBet($('bettor').value, side, amount);
  });

  $('pickYes').addEventListener('click', () => { side = 'yes'; renderPayout(); });
  $('pickNo').addEventListener('click', () => { side = 'no'; renderPayout(); });

  const input = $('amount');
  input.addEventListener('input', () => {
    const clean = input.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (clean !== input.value) input.value = clean;
    amount = Number(clean || 0);
    renderPayout();
  });

  $('quick').addEventListener('click', e => {
    const q = e.target.dataset.q;
    if (!q) return;
    amount = q === UI.quickAdd[3] ? USER.balance : amount + Number(q.replace(/\D/g, ''));
    input.value = String(amount);
    renderPayout();
  });

  $('chips').addEventListener('click', e => {
    const c = e.target.closest('.chip');       // the count span is inside the button
    if (c) selectChip(c.dataset.chip);
  });

  $('listRows').addEventListener('click', e => {
    const row = e.target.closest('.mkt-row');
    if (!row) return;
    const m = [liveEntry()].concat(MARKETS).find(x => x.id === row.dataset.id);
    if (m) openMarket(m);
  });

  /* back to the list you came from — chip still holds it */
  $('backBtn').addEventListener('click', () => showList(chip));

  $('ranges').addEventListener('click', e => {
    if (!e.target.classList.contains('range')) return;
    [...$('ranges').children].forEach(r => r.classList.toggle('is-active', r === e.target));
  });

  $('depthTabs').addEventListener('click', e => {
    const i = e.target.dataset.tab;
    if (i !== undefined) openTab(Number(i));
  });
}

/* ── boot ──────────────────────────────────────────────────── */

setView('market');
renderChrome();
renderMarket();
renderOrderBook();
renderHolders();
renderComments();
renderBoards();
renderTraded();
bind();

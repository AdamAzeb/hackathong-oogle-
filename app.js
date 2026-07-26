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

function drawChart(pts){
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

  $('chips').innerHTML = CHIPS.map((c, i) =>
    `<button type="button" class="chip${i === 0 ? ' is-active' : ''}">${c}</button>`).join('');

  $('runBtn').textContent = UI.run;
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
}

/* ── live engine beats (BackedAPI, falls back to data.js mocks) ─ */

function commitmentLine(prefix, c){
  return `${prefix} · ${c.topic} · ${c.minutes} ${UI.minSuffix} · ${c.hour}:00`;
}

/* The refusal modal. Resolves when Accept is clicked; RESET aborts it. */
function showCounter(co){
  $('coReason').textContent = co.reason;
  $('coAsked').textContent = commitmentLine(UI.askedLabel, DEMO.doomed);
  $('coRevised').textContent = commitmentLine(UI.counterOfferLabel, co.revised);
  reveal($('counter'));
  return step((entry, done) => {
    $('coAccept').onclick = () => { conceal($('counter')); done(); };
  });
}

/* The evidence bar. Resolves with a File, or null on skip; RESET aborts. */
function awaitEvidence(){
  $('eviFile').value = '';
  $('eviLabel').textContent = UI.evidenceLabel;
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

/* Settlement: the newest form square becomes a hit and the boards restate.
   The rows animate to their new positions, but note that with DATA.md's
   figures nobody actually changes rank — only Max's own numbers move, so
   what reads on screen is the figures restating, not rows swapping. */
function settle(){
  renderForm(MARKET.form.slice(0, -1).concat(1), true);
  flipBoard('ftRows', DEMO.settled.followThrough, 'rate');
  flipBoard('shRows', DEMO.settled.sharpest, 'record');
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
  hideNow($('mc'));
  hideNow($('res'));
  hideNow($('counter'));
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

function renderOrderBook(){
  // widest bar is scaled to the deepest level on either side
  const peak = Math.max(...ORDER_BOOK.bids.concat(ORDER_BOOK.asks).map(r => r.size));

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

  $('obBids').innerHTML = col(ORDER_BOOK.bids, 'bid', UI.bidsHead);
  $('obAsks').innerHTML = col(ORDER_BOOK.asks, 'ask', UI.asksHead);
}

function renderHolders(){
  const col = (rows, kind, head) =>
    `<div class="hold-head ${kind}">${head}</div>` +
    rows.map(h =>
      `<div class="hold-row">
         <span class="av">${h.who[0]}</span>
         <span class="hold-name">${h.who}</span>
         <span class="hold-size">${h.size}</span>
       </div>`).join('');

  $('holdYes').innerHTML = col(HOLDERS.yes, 'yes', UI.yesHolders);
  $('holdNo').innerHTML = col(HOLDERS.no, 'no', UI.noHolders);
}

function renderComments(){
  $('comments').innerHTML = COMMENTS.map(c =>
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
function renderForm(form, flipNewest){
  const last = form.length - 1;
  $('form').innerHTML =
    `<span class="form-label">${UI.formLabel}</span>` +
    form.map((f, i) => {
      const cls = (f ? 'hit' : 'miss') + (flipNewest && i === last ? ' flip' : '');
      return `<span class="form-sq ${cls}">${f ? UI.hitGlyph : UI.missGlyph}</span>`;
    }).join('');
}

/* ── price / trade panel ───────────────────────────────────── */

function setPrice(v){
  price = Math.max(0, Math.min(100, v));   // a probability, never outside 0–100
  const shown = Math.round(price);

  $('priceNum').textContent = shown;

  const diff = shown - MARKET.openingPrice;
  const delta = $('delta');
  delta.className = 'delta mono ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat');
  delta.textContent = diff > 0 ? '▲ +' + diff : diff < 0 ? '▼ ' + diff : '— 0';

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

/* ── events ────────────────────────────────────────────────── */

function bind(){
  $('runBtn').addEventListener('click', runDemo);

  $('resetBtn').addEventListener('click', () => {
    clearTimeline();
    $('runBtn').disabled = false;
    renderOpening();
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
    if (!e.target.classList.contains('chip')) return;
    [...$('chips').children].forEach(c => c.classList.toggle('is-active', c === e.target));
  });

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

renderChrome();
renderMarket();
renderOrderBook();
renderHolders();
renderComments();
renderBoards();
renderTraded();
bind();

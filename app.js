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
  $('feedHead').textContent = UI.activityHead;
  $('amountLabel').textContent = UI.amountLabel;
  $('yesName').textContent = UI.yes;
  $('noName').textContent = UI.no;

  $('ranges').innerHTML = UI.ranges.map(r =>
    `<button type="button" class="range${r === UI.activeRange ? ' is-active' : ''}">${r}</button>`).join('');

  $('tradeTabs').innerHTML = UI.tradeTabs.map((t, i) =>
    `<button type="button" class="trade-tab${i === 0 ? ' is-active' : ''}"${i ? ' disabled' : ''}>${t}</button>`).join('');

  $('quick').innerHTML = UI.quickAdd.map(q =>
    `<button type="button" data-q="${q}">${q}</button>`).join('');
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

  $('form').innerHTML =
    `<span class="form-label">${UI.formLabel}</span>` +
    MARKET.form.map(f => f
      ? `<span class="form-sq hit">${UI.hitGlyph}</span>`
      : `<span class="form-sq miss">${UI.missGlyph}</span>`).join('');
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
  state = 'idle';
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
}

/* t = 0.0s of the sequence — and what RESET returns to. */
function renderOpening(){
  state = 'idle';
  series = SERIES_BASE.slice();
  setPrice(MARKET.openingPrice);
  drawChart(series);
  setCaption(DEMO.opening, false);
  $('bookBody').textContent = MARKET.openingComment;
  // The subject's own opening position — the market is never empty.
  renderFeed(ACTIVITY.filter(a => a.who === MARKET.subject));
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

  try {
    renderOpening();                       // 0.0s
    await sleep(700);

    setCaption(DEMO.open, false);          // 0.7s
    await sleep(800);

    state = 'trading';
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
    state = 'idle';
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
}

/* ── boot ──────────────────────────────────────────────────── */

renderChrome();
renderMarket();
renderTraded();
bind();

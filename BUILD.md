# BUILD.md — BACKED frontend

**Read this first. Then `DESIGN-SYSTEM.md`, then `COMPONENTS.md`, then `DATA.md`.**

---

## What you are building

A single-page trading interface for **BACKED** — a prediction market where your friends bet on whether you'll actually do the studying you committed to. You state a study goal, a market opens on you, your group buys Yes or No, and the price is their honest read on whether you'll follow through.

This is for a hackathon demo at 17:00 today. It will be shown on a projector to judges. **It must look like a real trading venue people use, not a hackathon prototype.**

## The visual target

**Polymarket's event page. Copy it closely.** Dense, dark, information-rich, app-like. Not a landing page. Not editorial. Not minimal.

If someone glanced at a screenshot for one second, they should think "that's a prediction market" before they read a word.

## Stack — no build step

```
index.html      — structure
styles.css      — all styling
data.js         — mock data + hook points for the backend
app.js          — rendering, state, the demo sequence
```

Vanilla JS. No frameworks, no npm, no bundler, **no external CDN requests of any kind** — this runs on conference wifi that may fail. System font stacks only. Inline SVG for the chart and any icons; no icon library, no emoji.

## Build order — ship in phases

Work in this order and commit after each phase. If time runs out, an incomplete Phase 4 is fine; an incomplete Phase 1 is fatal.

### Phase 1 — the venue *(do first, ~20 min)*
Top nav, category chip row, market header with form line, price block, chart, sticky trade panel.
**Acceptance:** screenshot reads as a trading interface with zero interactivity.

### Phase 2 — the demo sequence *(~15 min, THE PRIORITY)*
The orchestrated run described in `COMPONENTS.md §9`. This is the single moment the whole product exists for.
**Acceptance:** one button plays the full sequence, price animates 64 → 31, positions land one at a time, chart extends live, interface holds on "The market has you at 31%".

### Phase 3 — depth *(~15 min)*
Order book tab, activity tab, holders tab, both leaderboards.
**Acceptance:** the tabbed section makes the page feel populated rather than a mockup.

### Phase 4 — the session *(~10 min)*
Live drift state, margin-call banner, resolution and settlement states.
**Acceptance:** drift animates the price down and the margin-call banner appears over it.

## Non-negotiables

1. **Every number uses tabular monospace figures.** The price animates during the demo — proportional digits will jitter and it will look broken.
2. **No placeholder content anywhere.** No lorem, no "Card title", no `#`. Every string comes from `data.js`. Empty tabs are what make a demo look fake.
3. **Responsive to 380px.** Judges may look on a phone.
4. **Visible keyboard focus** and `prefers-reduced-motion` respected.
5. **Hook points marked `// HOOK:`** wherever mock data will be replaced by an API response.

## Do not

- Do not add a hero section, a marketing headline, or a landing page.
- Do not centre the layout. Trading UIs are asymmetric and dense.
- Do not add features not in `COMPONENTS.md`. There is no time.
- Do not restructure the file layout above.

## Definition of done

- Opens from `file://` with no server and no network.
- Demo sequence runs start to finish without error, twice in a row.
- Nothing on screen is a placeholder.
- Console is clean.

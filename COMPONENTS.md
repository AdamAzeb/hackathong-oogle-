# COMPONENTS.md — BACKED

Build in the order of `BUILD.md` phases. Every string comes from `data.js`.

---

## Page skeleton

```
┌───────────────────────────────────────────────────────────┐
│ NAV  BACKED   [search]              $1,240 · [avatar]     │
├───────────────────────────────────────────────────────────┤
│ CHIPS  Live · Today · My markets · Group · Resolved       │
├──────────────────────────────────┬────────────────────────┤
│ MARKET HEADER                    │  TRADE PANEL           │
│  [av] Max finishes the thermo…   │   ┌──────────────────┐ │
│  30 MIN · RESOLVES 10:00 · 350   │   │ Buy │ Sell       │ │
│  FORM ✗✓✗✗✓✗✗                    │   ├──────────────────┤ │
│                                  │   │ [Yes 31¢][No 69¢]│ │
│  31%  ▼ -33                      │   │ Amount  [ 20 ]   │ │
│  ┌────────────────────────────┐  │   │ +1 +20 +100 Max  │ │
│  │ chart          1H 6H 1D ALL│  │   │ ┌──────────────┐ │ │
│  └────────────────────────────┘  │   │ │  Buy Yes     │ │ │
│                                  │   │ └──────────────┘ │ │
│  ── THE BOOK ──────────────────  │   │ To win $64.51    │ │
│  "Three of three took No…"       │   └──────────────────┘ │
│                                  │   FOLLOW-THROUGH       │
│  [Order Book][Activity][Holders] │   1 Sara   81%  +240   │
│  ┌────────────────────────────┐  │   …                    │
│  │ bid/ask ladder             │  │   SHARPEST             │
│  └────────────────────────────┘  │   …                    │
└──────────────────────────────────┴────────────────────────┘
```

Grid: `1fr 340px`, gap 16px, max-width 1160px. Sidebar `position: sticky; top: 72px`.
Below 900px: single column, trade panel moves under the chart, leaderboards last.

---

## 1. Top nav

Height 56px, `--bg` at 88% opacity with `backdrop-filter: blur(12px)`, sticky, 1px bottom border.

- **Left:** `BACKED` — 15px mono, 600, `0.12em` tracking. Full stop after it in `--chalk`.
- **Centre:** search input, 260px, `--surface-2`, `--r-md`, 12px placeholder "Search markets". Inline SVG magnifier 14px at left, `--text-3`. Non-functional.
- **Right:** balance `$1,240` in mono 13px, then a 28px `--r-sm` avatar square with the user's initial in `--chalk`.

## 2. Category chips

Horizontal row under the nav, 12px vertical padding, scrolls horizontally on mobile.
Chips: 12px sans, 6px 12px padding, `--r-sm`, `--surface-2`, `--text-2`.
Active chip: `--surface-3`, `--text`, 1px `--border-lit`.
From `data.js` → `CHIPS`. First is active.

## 3. Market header

Card, 20px padding, 1px border, `--r-lg`.

- **Thumbnail:** 48px square, `--r-md`, subtle diagonal gradient `#2b3745 → #16202b`, 1px border, subject's initial centred in mono 18px `--chalk`.
- **Question:** 19px, 600, `-0.015em`.
- **Metadata row:** mono 11px `--text-2`, `0.05em` tracking, items separated by a 3px dot in `--text-3`. Content: duration · resolution time · volume · number of holders.
- **Form line:** see `DESIGN-SYSTEM.md` — the distinctive element. 11px gap above the metadata row.

## 4. Price block

24px padding, no top border (continuous with the header card).

- **Price:** 56px mono 700, tabular. `%` sign at `0.4em` and `--text-2`.
- **Delta:** 13px mono beside it, baseline-aligned. `▼ -33` in `--no`, `▲ +n` in `--yes`.
- **Caption:** 12px `--text-2` beneath. Text changes through the demo sequence — see §9.

## 5. Chart

Inline SVG, `viewBox="0 0 640 130"`, `preserveAspectRatio="none"`, full width.

- Polyline, 2px, `stroke-linejoin: round`. Colour = `--no` if the last point is below the first, else `--yes`.
- Area fill beneath: linear gradient, same colour, `0.16` → `0` opacity.
- 3.5px dot at the final point.
- Right-edge price label: small `--surface-3` pill with 1px border, mono 11px, vertically tracking the last point.
- Two horizontal hairlines at 25% and 75% height, `--border`, `0.5` opacity.
- **Time toggles** top-right of the chart: `1H · 6H · 1D · ALL`, mono 11px, active is `--text` on `--surface-3`. Non-functional, `ALL` active.

## 6. Trade panel — the most Polymarket element

Sticky. `--surface`, 1px border, `--r-lg`, the one permitted shadow.

- **Buy/Sell tabs:** two-up, full width, 11px mono uppercase. Active has a 2px `--text` bottom border. Sell is inert.
- **Outcome selector:** two buttons side by side, 12px padding, `--r-md`, `--surface-2`.
  Left: `Yes` + price in cents, mono, `--yes`. Right: `No` + cents, `--no`.
  Selected gets a 1px `--yes-line` / `--no-line` border and the tinted `-bg` fill. Yes selected by default.
- **Amount:** `--surface-2` field, `$` prefix in `--text-3`, value right-aligned mono 18px.
- **Quick-add row:** `+$1 · +$20 · +$100 · Max`, four equal chips, 11px mono, `--surface-2`, `--r-sm`.
- **Action button:** full width, 14px padding, `--r-md`, 14px 600. Fill `--yes` with `#0f1720` text when Yes is selected; `--no` when No is.
- **Payout line:** beneath, 11px `--text-2`, mono figure: `To win $64.51`. Recomputes from amount ÷ price.

## 7. The book — Gemma's voice

Directly under the price block. `--chalk-bg`, 1px `--chalk-line`, `--r-lg`, 15px 17px padding.

- Label `THE BOOK`, mono 10px, `0.18em`, `--chalk`.
- Body 13.5px, `#e9ddc0`, line-height 1.55.
- **This is the only gold element on the page.** When its text changes during the demo, cross-fade 200ms — do not slide or bounce.

## 8. Tabbed section

Tabs: `Order Book · Activity · Top Holders · Comments`. 12px sans, 10px 14px padding, active has 2px `--text` bottom border and `--text` colour; inactive `--text-2`. **Order Book open by default** — an empty Comments tab on load is what makes a demo look unfinished.

**Order Book:** two columns, Bids (green) left, Asks (red) right. Each row: price (mono, coloured), size (mono, `--text-2`), total (mono, `--text-3`). Behind each row, a horizontal bar in `--yes-bg`/`--no-bg` at width proportional to size — this is the detail that sells it as a real book. 8px row padding.

**Activity:** rows of `[avatar] Name bought No 120 @ 42¢` with a right-aligned relative timestamp in `--text-3`. Side word coloured.

**Top Holders:** two columns, Yes holders and No holders, each with name and position size.

**Comments:** three seeded messages with names and timestamps. Short, human, in-world.

## 9. The demo sequence ⭐

**This is the priority of the whole build.** One button, top-right of the market card: `▶ RUN`, 11px mono, `--chalk` text, 1px `--chalk-line`.

Sequence, driven from `DEMO` in `data.js`:

| t | Event |
|---|---|
| 0.0s | Reset to opening state: price 64, empty positions, caption "Opening line set by the book" |
| 0.7s | Caption → "Market open to your group" |
| 1.5s | Position 1 lands in Activity → price animates **64 → 51**, chart extends, book text updates |
| 2.6s | Position 2 → **51 → 42** |
| 3.7s | Position 3 → **42 → 31** |
| 4.4s | Caption → **"The market has you at 31%"**, 13px, `--text`. Hold. Book: "Three of three took No. The market is telling you something you already know." |
| 6.5s | Session state: caption → "Session running · 22 min left". Price begins drifting down 1 point every 900ms. |
| ~9s | At 24: **margin-call banner** appears over the price block — `--chalk-line` border, `--chalk-bg`, mono 11px label `MARGIN CALL`, then the nudge text. Drift stops. |
| 12s | Price recovers 24 → 38 over 1.2s (work happened). Banner fades. |
| 14s | **Resolution card** appears below the book: `RESOLVED YES` stamp in `--yes-bg`, confidence figure, one-line rationale. |
| 15s | Settlement: form line's newest square flips to a hit, leaderboard rows reorder with a 300ms transition, caption → "Settled · No holders paid at 31¢" |

**Requirements:**
- Price counts smoothly, digit-stable, chart redrawing each frame.
- Positions land staggered, never all at once.
- `RUN` disabled during the sequence; `RESET` returns to the opening state cleanly.
- The whole thing must be re-runnable without a page refresh.
- Nothing else on the page animates while it plays.

## 10. Leaderboards

Two stacked panels in the sidebar under the trade panel.

**Follow-through** — rank, name, completion rate, P&L.
**Sharpest** — rank, name, win-loss record, P&L.

Rows: `18px 1fr auto auto` grid, 8px 16px padding, 13px. Rank and figures in mono. P&L green if positive, red if negative. The current user's row gets `--chalk-bg` and a `--chalk` name.

## 11. States to handle

- **Idle** — opening line, no positions, `RUN` available.
- **Trading** — positions landing, price moving.
- **Session** — drift active, timer in the caption.
- **Margin call** — banner over the price block.
- **Resolved** — verdict card visible.
- **Settled** — form updated, leaderboards reordered.

Drive these off a single `state` string in `app.js`. Do not scatter booleans.

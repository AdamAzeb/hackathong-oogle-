# DESIGN-SYSTEM.md — BACKED

Every colour, size and radius in the build comes from this file. Do not invent values.

---

## Palette

Polymarket's dark theme is **deep navy-slate, not black**. This matters — pure black with a bright accent is the single most common AI-generated dark theme and it reads as generic instantly. The blue undertone is what makes it look like a product.

```css
:root{
  /* surfaces — navy-slate, each step subtle */
  --bg:          #0f1720;   /* page */
  --surface:     #16202b;   /* cards */
  --surface-2:   #1c2734;   /* raised: inputs, buttons, hover */
  --surface-3:   #22303f;   /* active tab, selected */
  --border:      #253141;   /* hairline, 1px, everywhere */
  --border-lit:  #35465a;   /* hover borders */

  /* text */
  --text:        #eef2f6;
  --text-2:      #9aa8b8;   /* labels, metadata */
  --text-3:      #64748b;   /* timestamps, disabled */

  /* semantic — ONLY for outcome/direction. Never decorative. */
  --yes:         #2fc26b;
  --yes-bg:      #2fc26b1a;
  --yes-line:    #2fc26b40;
  --no:          #f4436c;
  --no-bg:       #f4436c1a;
  --no-line:     #f4436c40;

  /* the house — Gemma's voice only, nothing else */
  --chalk:       #f0c14b;
  --chalk-bg:    #f0c14b12;
  --chalk-line:  #f0c14b33;
}
```

**Colour discipline:** green and red mean Yes and No. Gold means Gemma is speaking. Nothing else is coloured. A trading interface is grey with two meaningful colours — that restraint is what makes it look professional.

## Type

```css
--sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
--mono: ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono",
        Menlo, Consolas, monospace;
```

No web fonts. No CDN. The system grotesque is close enough to Polymarket's and loads instantly.

| Role | Size | Weight | Family | Notes |
|---|---|---|---|---|
| Price (hero) | 56px | 700 | mono | `-0.04em`, tabular |
| Market question | 19px | 600 | sans | `-0.015em` |
| Section heads | 11px | 600 | mono | `0.14em` tracking, uppercase, `--text-2` |
| Body / rows | 13px | 400–500 | sans | |
| All data & numbers | 12–13px | 500 | mono | **tabular** |
| Metadata | 11px | 500 | mono | `0.05em`, `--text-2` |

**Mandatory on every numeric element:**
```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```

## Geometry

Trading UIs are tight and hard-edged. This is where "poppy" comes from restraint, not decoration.

```css
--r-sm: 4px;    /* chips, badges, tags */
--r-md: 6px;    /* buttons, inputs */
--r-lg: 8px;    /* cards, panels */
```

- **Nothing above 8px radius.** Big rounding is the fastest way to look like a template.
- **Borders do the work, not shadows.** 1px `--border`. One shadow allowed in the whole app: the sticky trade panel gets `0 2px 16px #00000040`.
- **No gradients** except the chart's area fill under the price line.
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24. Vertical rhythm inside data rows is tight — 8–10px padding, not 16.

## Motion

**One orchestrated sequence, nothing else.** Scattered hover effects and entrance animations everywhere is a tell.

- Price counter: 700ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Position rows landing: 320ms translateY(-8px) + fade, staggered
- Chart line extending: redraw per frame during the count
- Hover states: 140ms on background and border only. No transforms, no scale, no lift.
- Wrap everything in `@media (prefers-reduced-motion: reduce)` and kill it.

## Anti-patterns — these make it look AI-generated

Explicitly avoid all of these:

| Don't | Do |
|---|---|
| Purple/indigo/violet anywhere | Navy-slate + green/red only |
| Big soft shadows, glassmorphism, blur cards | 1px hairline borders |
| Uniform 12–16px radius on everything | 4/6/8px, hard edges |
| Emoji as icons | Inline SVG, 14–16px, `--text-2` |
| Centred single column with generous whitespace | Asymmetric, dense, sticky sidebar |
| Gradient text or gradient buttons | Flat fills |
| Everything at 16px | 11–13px for data, one 56px hero number |
| Icon + title + description card triads | Data rows and tables |
| "Powered by AI" badges, sparkle icons | Nothing |
| Symmetrical balanced grids | 1fr + fixed 340px sidebar |
| Generous 24px padding everywhere | 8–10px in data rows, 16–20px in card headers |

## The one distinctive element

Everything above is Polymarket. **This is the part that's ours.**

Polymarket trades events. BACKED trades a *person*. So the market header carries a **form line** — a bookmaker's record of the subject's last seven commitments, most recent on the right:

```
FORM  ✗ ✓ ✗ ✗ ✓ ✗ ✗
```

Rendered as seven 16px squares, 3px gap, `--r-sm`, hit = `--yes-bg`/`--yes`, miss = `--no-bg`/`--no`. 10px mono glyphs. Sits directly under the metadata row.

It is small, dense, and reads as data. Do not enlarge it, do not add labels to each square, do not animate it except on settlement, when the newest square flips in. It is the one thing on the page that isn't Polymarket and it should look like it was always there.

# Adaptive Layout for Tablet+ Resolutions

**Status:** Design approved, ready for implementation plan.
**Date:** 2026-05-17

## Problem

The current FibGrid UI has three usability problems on tablet and desktop viewports:

1. **Canvas is fixed at ~676px square** regardless of viewport. On a 1440-wide desktop this wastes the majority of horizontal space and the canvas — the centerpiece of the tool — looks tiny.
2. **Sidebar overflows the viewport.** The root uses `min-h-screen` and the sidebar declares `overflow-y-auto`, but the page itself can still scroll. Stats and the Clear-All button end up below the fold and feel "cut off".
3. **Module catalogue shows text labels only** (`91×91 mm · 13u×13u`). Users can't see what shape they're picking, which is the most important affordance in a module-placement tool.

Mobile (<1024px) is explicitly out of scope.

## Goals

- Canvas grows to claim the available viewport, snapping to integer pixel-per-unit values to preserve the pixel-art aesthetic.
- App always fits the viewport — no page scroll, ever.
- All 13 modules visible in the catalogue at once without scrolling, drawn as scaled shapes inside uniform tiles with equal inset padding.
- Toolbar absorbs export and clear-all controls so the sidebar can be palette-only.
- Below 1024px viewport width: show a notice instead of attempting to render.

## Non-goals

- Mobile / phone layouts.
- Touch-specific gestures.
- Dark/light theming changes.
- Changes to the underlying grid model, placement logic, or persistence.

## Layout shell

Root container changes from `flex … min-h-screen` to a viewport-locked two-column grid:

```
┌──────────────────────────────────────────┬─────────────┐
│ TOOLBAR                                  │             │
├──────────────────────────────────────────┤   SIDEBAR   │
│                                          │             │
│            CANVAS  (fills)               │  catalogue  │
│                                          │  + selected │
│                                          │             │
└──────────────────────────────────────────┴─────────────┘
              flex-1                          260px
```

- Root: `h-screen overflow-hidden`, CSS grid `grid-cols-[1fr_260px]`.
- Canvas column: `flex flex-col`, toolbar on top (auto-height), canvas region fills the rest.
- Sidebar column: `260px` wide, fills viewport height, `overflow-y-auto` as a fallback for tight viewport heights (rare; see Sidebar section).

### Minimum-width gate

When `window.innerWidth < 1024`, the entire app body is replaced with a centered notice:

> **This tool is designed for tablet and desktop.**
> Please open it on a screen at least 1024 pixels wide.

Implemented as a single conditional render at the top of `FibGrid/index.tsx`, watching window resize. Chosen because:
- iPad Pro 11" landscape (1194), iPad Pro 13" portrait (1032), iPad Pro 13" landscape (1366), and all standard laptops are ≥1024.
- iPad Air / standard iPad portrait (≤820) is excluded by design.

## Toolbar

A single horizontal strip across the top of the canvas column. Left → right:

| Slot | Content |
|------|---------|
| Title block | "φ Storage Grid" / `238 × 238 mm` / `34u × 34u · u = 7mm` (unchanged) |
| Gap slider | Existing range input |
| Wall slider | Existing range input |
| % filled | Large amber number (unchanged) |
| `?` button | Opens info popover (shortcuts + valid row combos) |
| `⋯` button | Opens export menu (JSON / PNG / CSV) |
| `✕ Clear` | Existing clear-all action |

### `?` info popover

A click-to-toggle popover anchored to the `?` button. Contains the content currently inlined in the toolbar:

- **Shortcuts:** "● Left-click: place · ● Right-click: remove · ● R: rotate · ● Ctrl+Z: undo"
- **Valid row combos:** the six combo chips currently shown in the toolbar's bottom strip.

Popover closes on outside click or `Esc`.

### `⋯` export menu

A click-to-toggle popover anchored to the `⋯` button. Three items: JSON, PNG, CSV. Each item triggers the existing export handler then closes the menu. Closes on outside click or `Esc`.

### Removed from inline toolbar

- The shortcut-hints row.
- The "Valid row combos (sum = 34u)" section.

Both move into the `?` popover.

## Canvas

The Canvas component owns its rendered scale. It receives the size of its container and computes `U` (pixels per grid unit) dynamically.

### Sizing algorithm

```
available = min(containerWidth, containerHeight) - 2 * PAD - 2 * wallPx
U = floor(available / GRID)        // largest integer pixels-per-unit that fits
U = max(U, U_MIN)                  // floor so canvas remains usable
cw = ch = GRID * U + 2 * wallPx + 2 * PAD
```

- `U_MIN = 12` (canvas stays legible at minimum supported width).
- `U` snaps to integers — preserves the pixel-art / crisp-edges aesthetic with `imageRendering: pixelated`.
- Recompute and redraw on container resize via `ResizeObserver` on the canvas wrapper element.
- The hover-coordinate label, hit-testing (`toGrid`), and all draw calls already accept `U` as a parameter — they need to read the current value rather than the constant.

### Code shape

- `U` exits `constants.ts` as a hard constant. The file keeps it as `U_DEFAULT = 15` (initial seed) and exports `U_MIN = 12`.
- `Canvas.tsx` adds local state `const [u, setU] = useState(U_DEFAULT)`, a `wrapperRef`, and a `ResizeObserver` effect that updates `u` whenever the wrapper resizes.
- All existing references to `U` inside Canvas and its draw helpers receive the current `u` value (already parameterized — the `canvas-draw` functions take `U` as an argument, so no change there).

### Hit-testing

`toGrid(clientX, clientY, canvas, U, originPx)` already takes `U` as a parameter. Pass the live value.

## Sidebar — Module Catalogue

Replaces the current text-button list with a uniform-tile grid of scaled module shapes.

### Structure

Three category sections in order: **Narrow**, **Medium**, **Large**. Each section has a small uppercase label, then a CSS grid of square tiles:

| Category | Cols | Rows | Count |
|----------|------|------|-------|
| Narrow   | 3    | 2    | 6     |
| Medium   | 3    | 1    | 3     |
| Large    | 2    | 2    | 4     |

Total: 13 tiles. With `260px` sidebar width minus ~20px horizontal padding minus inter-tile gaps, narrow/medium tiles land around 70–75px square; large tiles around 110px square. The catalogue alone fits at any supported viewport height. When the selected-module card is also visible (~180px), the sidebar can run tight at 768px viewport height; the sidebar gets `overflow-y: auto` as a fallback so it stays usable in that edge case.

### Tile rendering

Each tile is `aspect-ratio: 1`, with a 1px border in the existing palette (`#1a1c24` idle, `#e8a23c44` active). Inside the tile:

- An **inner box** with equal padding on all four sides (e.g. `padding: 6px`). This guarantees consistent breathing room around every shape.
- Inside the inner box, a centered rectangle whose dimensions are `(m.w / 34) × (m.d / 34)` of the inner box. This means a `34×34` module exactly fills the inner box; a `3×13` module is a thin sliver positioned dead center.
- The rectangle has its own border (`#2e3040`) and a subtle fill (`#1e2030`), matching the visual language already in use.
- No text label inside the tile. Hovering or active state can show a tooltip with the mm size, but the primary visual is the shape itself.

### Tile interaction

- Click selects the module (existing `onSelect`).
- Active tile: amber-tinted background and border (`#e8a23c44`/`#e8a23c`), matching the current selection style.
- Hover (non-active): subtle background lift (`#181a22`).

### Selected-module card

Below the catalogue, the existing "selected module" card stays mostly unchanged:
- Shows `91×147 mm` etc. label + W×D detail.
- Larger centered preview (same as today, using the tile-shape rendering logic).
- Rotate button + Cancel button.

If no module is selected, this card is absent and the catalogue takes the full sidebar height naturally.

## Removed components

- `StatsPanel.tsx` is **deleted**. The four stat tiles (Modules / Filled / Empty / Fill %) are redundant with the toolbar's `%` indicator; the export and clear-all actions move to the toolbar.

## Files affected

| File | Change |
|------|--------|
| `src/FibGrid/index.tsx` | Root layout → `h-screen` grid; conditional <1024 notice; no longer imports StatsPanel; passes export/clear handlers to Toolbar instead. |
| `src/FibGrid/components/Toolbar.tsx` | Add `?` info popover (shortcuts + combos), `⋯` export menu (JSON/PNG/CSV), `✕ Clear` button; remove inline shortcut row and combos strip. Accepts new props for export/clear handlers. |
| `src/FibGrid/components/Canvas.tsx` | Add `wrapperRef` + `ResizeObserver`; local `u` state; compute and use dynamic `U` everywhere. |
| `src/FibGrid/components/ModulePalette.tsx` | Replace text-button list with category-bucketed uniform-tile grid; tile renders scaled shape with equal padding. |
| `src/FibGrid/components/StatsPanel.tsx` | **Delete file.** |
| `src/FibGrid/lib/constants.ts` | Add `U_MIN = 12`. Keep `U = 15` as the initial seed (it's still referenced by `ModulePalette`'s selected-card preview for its `maxS / (dw * U)` calc, which can stay on the seed value). |

## Testing

- Existing unit tests in `grid-utils.test.ts`, `canvas-draw.test.ts`, `export.test.ts`, `usePersistence.test.ts` must still pass without modification — none of them depend on layout dimensions.
- Add lightweight tests for the new sizing math in Canvas:
  - `computeU(containerW, containerH, wallPx)` returns the expected integer for representative viewport sizes (1024, 1280, 1440, 1920).
  - Result is always `≥ U_MIN`.
- Manual verification at:
  - 1024 × 768 (minimum supported)
  - 1280 × 800
  - 1440 × 900
  - 1920 × 1080
  - 1023 × 800 → notice shown
  - Resize live (drag window edge) → canvas redraws cleanly with no flicker beyond the redraw itself.

## Risks / Open questions

- **Popover positioning** — the `?` and `⋯` popovers should not need any external library; a small `useEffect`-based outside-click handler is sufficient. If multiple popovers exist, only one open at a time.
- **ResizeObserver flicker** — observed-resize → state update → redraw could feel jumpy if `U` changes rapidly during drag. If this is an issue, debounce the state update to the next animation frame (already done for draw, just need to make sure `setU` doesn't fire faster than that).
- **`U_MIN = 12` justification** — at 1024px viewport, canvas column is ~764px wide (1024 − 260), minus padding ~720px. `floor(720 / 34) = 21`. So at minimum width we still get `U = 21`, well above the floor. The floor only kicks in if a user shrinks the window further before the 1024 gate hides the app.

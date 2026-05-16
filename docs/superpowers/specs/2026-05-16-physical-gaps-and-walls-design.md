# Physical Gaps & Outer Walls — Design Spec

**Date:** 2026-05-16
**Scope:** Extend the Fib Storage Simulator to model physical-product constraints — inter-module gap (tolerance) and outer wall thickness — so that exported layouts correspond to printable parts on a 256×256 mm printer bed.

---

## 1. Motivation

The simulator currently treats modules as edge-to-edge nominal Fibonacci footprints. For prototyping physical parts (FDM/SLA printed), every joint needs tolerance clearance and the assembly needs an outer frame. Without modeling gaps, the on-screen layout will not match the printed result: parts will not fit, or will not fit together. This change adds two tunable physical parameters that affect rendering and export, while keeping the existing grid math intact.

---

## 2. Parameters & Constraints

| Param      | Range            | Default | Meaning                                                      |
|------------|------------------|---------|--------------------------------------------------------------|
| `GAP_MM`   | 0.0 – 1.0 mm     | 0.3 mm  | Clearance applied as inset on all 4 sides of every module    |
| `OUTER_MM` | 238 – 256 mm     | 238 mm  | Outer footprint of the printed assembly                      |

Derived: `WALL_MM = (OUTER_MM − 238) / 2`.

**Invariants (unchanged from the existing simulator):**

- Grid is `34u × 34u` at `MM = 7` mm/unit → inner envelope is always 238 × 238 mm
- All 13 modules retain their nominal Fibonacci sizes (`3, 5, 8, 13, 21, 34` units) in the data model
- Printer bed maximum is 256 × 256 mm, enforced by `OUTER_MM ≤ 256`
- Slider step for `GAP_MM` is 0.1 mm; step for `OUTER_MM` is 1 mm

---

## 3. Geometric Model

For a module of nominal size `w × d` (in units) placed at grid `(x, y)`:

```
nominal_mm   = (w·MM)        × (d·MM)
built_mm     = (w·MM − GAP)  × (d·MM − GAP)
position_mm  = (x·MM + GAP/2,  y·MM + GAP/2)   // top-left, inside inner 238mm
```

The outer wall sits *outside* the 238 mm grid — walls are not inset. A module at the grid edge (e.g., `x = 0`) is inset by `GAP/2` from the wall, producing the same visible gap whether two modules meet each other or a module meets the wall.

**Grid logic is unchanged.** Occupancy, collision detection, hover-preview validity, undo/redo, and the COMBOS list operate entirely in unit-space. The two new parameters affect rendering and export only.

---

## 4. Rendering Changes

### 4.1 Module draw (`canvas-draw.ts`)

`drawPlacedModules` insets each module rect by `GAP_PX/2` where `GAP_PX = GAP_MM · (U / MM)`. The fill, diagonal hatch, border stroke, and centered label all shrink to fit inside the inset. The label-visibility threshold (currently `min(pw, ph) >= 22px`) is checked against the inset size, not the nominal size, so very small modules at large gap values may drop the label.

### 4.2 Hover preview

`drawHoverPreview` applies the same inset to the dashed preview rect. What the user sees during hover matches what gets drawn after placement.

### 4.3 Outer frame wall

New draw step `drawFrameWall(ctx, params)` renders a wall ring outside the 238 mm grid area when `OUTER_MM > 238`:

- Fill: `#1a1c24` (matches `--fib-grid`)
- Stroke: 1 px at `--fib-grid-fib` on the outer edge only (the inner edge coincides with the existing grid border drawn by `drawBorder` — no double stroke)
- Width on each side: `WALL_MM · (U / MM)` pixels
- Drawn before the grid lines so the grid sits on top visually

When `OUTER_MM = 238`, the frame draw is skipped (no wall).

### 4.4 Ruler ticks

Unchanged. Ticks still mark Fibonacci positions on the inner 238 mm grid.

### 4.5 Canvas size

```
inner_px = GRID · U                           // 34 · 15 = 510 px (unchanged)
wall_px  = WALL_MM · (U / MM)                 // 0 by default
canvas_w = canvas_h = 2·PAD + 2·wall_px + inner_px
```

`PAD` remains a pure visual margin around the entire drawing.

### 4.6 Performance

- The offscreen grid cache remains valid: grid lines depend only on `U` and `GRID`, neither of which changes
- Gap or wall slider changes trigger a full canvas redraw; expected — these are tweaked occasionally, not per-frame
- Hover-only updates still use the existing dirty-rect path

---

## 5. UI: Toolbar Controls

The toolbar gains a third right-aligned cluster between the existing dimensions block and the fill-percentage display:

```
φ Storage Grid                Gap   [─────●──]  0.3 mm        42%
238 × 238 mm                  Wall  [●────────]  0 mm           filled
34u × 34u · u = 7 mm                outer 238 mm
```

- Two native HTML `<input type="range">` sliders (no new dependency)
- Numeric value displayed adjacent to each slider, in monospace
- Beneath the Wall slider: derived label `outer = 238 + 2·wall = N mm`
- Labels use the existing toolbar typography: `text-[10px] uppercase tracking-[2px]`, muted color
- Both controls become part of the persisted state (see §7)

The controls live in `Toolbar.tsx`; values are sourced from and updated through the `useFibGrid` hook.

---

## 6. Data Model

`PlacedModule` is unchanged (still `{ pid, w, d, x, y, color }` in grid units — the gap/wall are global, not per-module).

New global state added to `useFibGrid`:

```ts
interface PhysicalConfig {
  gapMm: number;    // 0.0 – 1.0, step 0.1
  outerMm: number;  // 238 – 256, step 1
}
```

Actions added:

```ts
type Action =
  | ...
  | { type: "SET_GAP";   gapMm: number }
  | { type: "SET_OUTER"; outerMm: number };
```

Values are clamped to their declared ranges on dispatch.

---

## 7. Persistence Migration

`usePersistence` storage key remains `fib-grid-layout`. Schema bumps to version 2:

```ts
// v2
{
  version: 2,
  placed: PlacedModule[],
  physical: { gapMm: number, outerMm: number },
  timestamp: number,
}
```

Loader behavior:

- v2: direct read, no migration
- v1: wrap with `physical: { gapMm: 0, outerMm: 238 }` (preserves visual identity of existing saved layouts), then save back as v2
- Unknown / malformed: reject and show error toast (existing behavior)

Auto-save debounce (1 s) applies to physical config changes the same way it applies to placement changes.

---

## 8. Export

### 8.1 JSON

```ts
interface LayoutExport {
  version: 2;
  gridSize: 34;
  unitMm: 7;
  physical: {
    gapMm: number;
    outerMm: number;
    wallMm: number;     // derived: (outerMm - 238) / 2
  };
  modules: Array<{
    id: string;
    nominal_mm: { w: number; d: number };
    built_mm:   { w: number; d: number };   // nominal − gap, per side
    position_mm: { x: number; y: number };  // includes gap/2 offset
    x: number;          // grid units (unchanged)
    y: number;          // grid units (unchanged)
    color: string;
  }>;
  stats: { totalModules: number; filledUnits: number; fillPercentage: number };
}
```

### 8.2 CSV

Column order:

```
id, nominal_w_mm, nominal_d_mm, built_w_mm, built_d_mm, x, y, pos_x_mm, pos_y_mm, color
```

`built_*` columns reflect the current gap; `pos_*_mm` columns include the `GAP/2` offset.

### 8.3 PNG

Rendered as shown on screen, including the outer wall ring (if any) and the inset modules. Filename pattern unchanged: `fib-layout-YYYY-MM-DD.png`.

---

## 9. Testing

### 9.1 Unit tests (`bun test`)

- **`grid-utils.test.ts`** (existing): unchanged occupancy/collision tests still pass — verifies that gap/wall changes do not perturb grid logic
- **`canvas-draw.test.ts`** (new): with a mocked 2D context, assert that for `GAP_MM = 1`, `drawPlacedModule` calls `fillRect` with arguments inset by `0.5 · (U/MM)` px on each side
- **`export.test.ts`** (new): for a fixture layout, assert JSON contains `physical` block and per-module `built_mm`/`position_mm`; CSV has the new columns in the documented order
- **`usePersistence.test.ts`** (new): load a v1 fixture from localStorage → assert the loaded state has `physical: { gapMm: 0, outerMm: 238 }` and the next save writes v2

### 9.2 Integration check

- Manual: with the dev server running, place a few modules, drag gap slider 0 → 1 mm, observe inset rendering and verify export JSON reflects the live gap
- Manual: drag wall slider 0 → 9 mm, confirm canvas grows and outer wall appears without disturbing the inner grid

---

## 10. Out of Scope

The following are deliberately excluded from this change:

- Per-module gap overrides (e.g., tighter gaps on small modules) — single global value only
- Anisotropic gaps (vertical-only / horizontal-only) — gap is uniform on all four sides
- Drawer features, lids, snap-fits, chamfers — this stage models 2D footprint only
- STL/STEP/3MF export — JSON/CSV/PNG remain the only export formats
- A "validate printability" mode that warns on too-small built dimensions — designer judgment, per earlier decision

---

## 11. Migration Path (Implementation Order)

1. Add `GAP_MM_DEFAULT`, `OUTER_MM_DEFAULT`, `OUTER_MM_MAX`, `GAP_MM_MAX` to `lib/constants.ts`
2. Extend `useFibGrid` state with `PhysicalConfig` and the two new actions
3. Update `canvas-draw.ts`: inset math in `drawPlacedModules` and `drawHoverPreview`; new `drawFrameWall`
4. Update `Canvas.tsx`: pass gap/outer through to draw functions; compute new canvas size
5. Add the two slider controls to `Toolbar.tsx` with derived-outer label
6. Update `usePersistence.ts`: v1 → v2 migration; persist `physical` block
7. Update `export.ts`: JSON `physical` block and `built_mm`/`position_mm`; new CSV columns
8. Add new tests (`canvas-draw`, `export`, `usePersistence` v1 migration)
9. Manual verification via `bun dev`

---

## Approval

Design approved by user on 2026-05-16.

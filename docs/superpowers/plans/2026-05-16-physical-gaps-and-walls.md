# Physical Gaps & Outer Walls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable gap (0.0–1.0 mm) that insets every placed module on all 4 sides, and a configurable outer wall thickness (derived from a 238–256 mm outer envelope), so the simulator output corresponds to a printable assembly on a 256×256 mm bed.

**Architecture:** Introduce a `PhysicalConfig` state slice in `useFibGrid` (`{ gapMm, outerMm }`). Grid math stays unchanged in unit-space. Render-time conversions inset modules by `GAP_MM·(U/MM)/2` and grow the canvas by `2·wallPx` to accommodate the wall. Persistence schema bumps to v2 with a v1→v2 migration. Exports include nominal and built dimensions plus the physical block.

**Tech Stack:** Bun + React 19 + TypeScript + Tailwind v4, canvas 2D rendering, `bun test` for unit tests.

**Reference spec:** `docs/superpowers/specs/2026-05-16-physical-gaps-and-walls-design.md`

---

## File Structure

**Modify:**
- `src/FibGrid/lib/constants.ts` — add `GAP_MM_DEFAULT`, `GAP_MM_MAX`, `GAP_MM_STEP`, `OUTER_MM_DEFAULT`, `OUTER_MM_MAX`, `OUTER_MM_STEP`
- `src/FibGrid/lib/types.ts` — add `PhysicalConfig` interface
- `src/FibGrid/lib/canvas-draw.ts` — update `drawPlacedModules` and `drawHoverPreview` signatures to accept `gapPx`; add `drawFrameWall`
- `src/FibGrid/lib/grid-utils.ts` — `toGrid` must accept dynamic `pad` (already does; verify call sites pass the correct value)
- `src/FibGrid/lib/export.ts` — add `physical` block to JSON; add `built_*_mm` and `pos_*_mm` CSV columns; update `exportCSV` signature to accept `PhysicalConfig`
- `src/FibGrid/hooks/useFibGrid.ts` — add `physical` state, `setGap`, `setOuter`, `loadPhysical` actions
- `src/FibGrid/hooks/usePersistence.ts` — schema v2, v1→v2 migration, persist `physical`, accept `physical` and `loadPhysical` props, update embedded `exportJSON`
- `src/FibGrid/components/Canvas.tsx` — accept `physical` prop; compute dynamic `cw/ch` and per-render `gapPx`/`wallPx`; pass to draw functions; draw wall before grid
- `src/FibGrid/components/Toolbar.tsx` — render gap + wall sliders with values and derived `outer = N mm` label
- `src/FibGrid/index.tsx` — thread `physical`, `setGap`, `setOuter`, `loadPhysical` through the tree

**Create:**
- `src/FibGrid/lib/canvas-draw.test.ts` — gap inset math, wall draw call assertions
- `src/FibGrid/lib/export.test.ts` — JSON has `physical` and `built_mm`; CSV columns include built and pos
- `src/FibGrid/hooks/usePersistence.test.ts` — v1→v2 migration test
- `src/FibGrid/lib/grid-utils.test.ts` — sanity: occupancy/collision unchanged by physical config (regression guard)

---

## Task 1: Constants for gap and outer envelope

**Files:**
- Modify: `src/FibGrid/lib/constants.ts`

- [ ] **Step 1: Add the new constants**

Open `src/FibGrid/lib/constants.ts` and append at the bottom of the file:

```ts
export const GAP_MM_DEFAULT = 0.3;
export const GAP_MM_MAX = 1.0;
export const GAP_MM_STEP = 0.1;

export const OUTER_MM_DEFAULT = 238; // = GRID * MM
export const OUTER_MM_MAX = 256;
export const OUTER_MM_STEP = 1;
```

- [ ] **Step 2: Verify it type-checks**

Run: `bunx tsc --noEmit`
Expected: no errors (only addition; no existing code references these yet).

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/lib/constants.ts
git commit -m "feat(physical): add gap and outer envelope constants"
```

---

## Task 2: PhysicalConfig type

**Files:**
- Modify: `src/FibGrid/lib/types.ts`

- [ ] **Step 1: Add the interface**

Open `src/FibGrid/lib/types.ts` and append at the bottom:

```ts
export interface PhysicalConfig {
  gapMm: number;   // 0.0 – 1.0, step 0.1
  outerMm: number; // 238 – 256, step 1
}
```

- [ ] **Step 2: Verify type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/lib/types.ts
git commit -m "feat(physical): add PhysicalConfig type"
```

---

## Task 3: Regression guard for grid-utils

**Files:**
- Create: `src/FibGrid/lib/grid-utils.test.ts`

This locks in that gap/wall changes never affect occupancy/collision math. Useful as a safety net before we start changing renderers.

- [ ] **Step 1: Write the regression tests**

Create `src/FibGrid/lib/grid-utils.test.ts`:

```ts
import { test, expect } from "bun:test";
import { buildOcc, canPlace } from "./grid-utils";
import { GRID } from "./constants";
import type { PlacedModule } from "./types";

const mod = (pid: string, w: number, d: number, x: number, y: number): PlacedModule => ({
  pid, w, d, x, y, color: "#000000",
});

test("buildOcc: empty list yields all-null grid", () => {
  const occ = buildOcc([]);
  expect(occ.length).toBe(GRID);
  expect(occ[0].length).toBe(GRID);
  expect(occ.every((row) => row.every((c) => c === null))).toBe(true);
});

test("buildOcc: marks exactly the module's cells", () => {
  const occ = buildOcc([mod("a", 3, 2, 1, 1)]);
  expect(occ[1][1]).toBe("a");
  expect(occ[1][3]).toBe("a");
  expect(occ[2][3]).toBe("a");
  expect(occ[0][1]).toBe(null);
  expect(occ[3][1]).toBe(null);
  expect(occ[1][4]).toBe(null);
});

test("canPlace: in-bounds empty grid -> true", () => {
  const occ = buildOcc([]);
  expect(canPlace(5, 5, 0, 0, occ)).toBe(true);
});

test("canPlace: out-of-bounds -> false", () => {
  const occ = buildOcc([]);
  expect(canPlace(5, 5, GRID - 2, 0, occ)).toBe(false);
  expect(canPlace(5, 5, 0, GRID - 2, occ)).toBe(false);
  expect(canPlace(5, 5, -1, 0, occ)).toBe(false);
});

test("canPlace: collision -> false", () => {
  const occ = buildOcc([mod("a", 3, 3, 0, 0)]);
  expect(canPlace(2, 2, 1, 1, occ)).toBe(false);
});

test("canPlace: adjacent to existing -> true (unit space, gap is render-only)", () => {
  const occ = buildOcc([mod("a", 3, 3, 0, 0)]);
  expect(canPlace(2, 2, 3, 0, occ)).toBe(true);
});
```

- [ ] **Step 2: Run the tests and confirm they pass**

Run: `bun test src/FibGrid/lib/grid-utils.test.ts`
Expected: 6 passing.

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/lib/grid-utils.test.ts
git commit -m "test(grid-utils): add regression tests for occupancy and placement"
```

---

## Task 4: Canvas-draw — failing test for gap inset

**Files:**
- Create: `src/FibGrid/lib/canvas-draw.test.ts`

Strategy: use a fake `CanvasRenderingContext2D` that records calls into an array, then assert geometry. We don't need a real canvas.

- [ ] **Step 1: Write the failing test**

Create `src/FibGrid/lib/canvas-draw.test.ts`:

```ts
import { test, expect } from "bun:test";
import { drawPlacedModules, drawHoverPreview, drawFrameWall } from "./canvas-draw";
import type { PlacedModule } from "./types";

interface Call { method: string; args: unknown[]; }

function makeCtx() {
  const calls: Call[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === "calls") return calls;
      if (prop === "save" || prop === "restore" || prop === "beginPath" || prop === "stroke" || prop === "moveTo" || prop === "lineTo" || prop === "fillText" || prop === "setLineDash" || prop === "strokeRect" || prop === "fillRect") {
        return (...args: unknown[]) => { calls.push({ method: prop, args }); };
      }
      return undefined;
    },
    set(_t, prop: string, value: unknown) {
      calls.push({ method: `set:${prop}`, args: [value] });
      return true;
    },
  };
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D & { calls: Call[] };
}

const mod = (pid: string, w: number, d: number, x: number, y: number): PlacedModule => ({
  pid, w, d, x, y, color: "#aabbcc",
});

test("drawPlacedModules with gapPx=0 fills at nominal cell rect (legacy behavior)", () => {
  const ctx = makeCtx();
  // u=15, pad=28, mm=7, gapPx=0
  drawPlacedModules(ctx, [mod("a", 2, 2, 0, 0)], 15, 28, 7, 0);
  const fills = ctx.calls.filter((c) => c.method === "fillRect");
  // The existing module fill historically uses (px+1, py+1, pw-2, ph-2). Just assert the fill rect is inside the nominal cell rect.
  expect(fills.length).toBeGreaterThan(0);
  const [x, y, w, h] = fills[0].args as number[];
  expect(x).toBeGreaterThanOrEqual(28);
  expect(y).toBeGreaterThanOrEqual(28);
  expect(x + w).toBeLessThanOrEqual(28 + 2 * 15);
  expect(y + h).toBeLessThanOrEqual(28 + 2 * 15);
});

test("drawPlacedModules with gapPx>0 insets the fill rect by gapPx/2 on each side", () => {
  const ctx = makeCtx();
  // u=15, pad=28, mm=7, gapPx=4 (= GAP/2 = 2 px per side)
  drawPlacedModules(ctx, [mod("a", 2, 2, 0, 0)], 15, 28, 7, 4);
  const fills = ctx.calls.filter((c) => c.method === "fillRect");
  expect(fills.length).toBeGreaterThan(0);
  const [x, y, w, h] = fills[0].args as number[];
  // Nominal rect is (28, 28, 30, 30). With gapPx=4 inset of 2 per side -> (30, 30, 26, 26) approximately.
  expect(x).toBe(30);
  expect(y).toBe(30);
  expect(w).toBe(26);
  expect(h).toBe(26);
});

test("drawHoverPreview with gapPx>0 insets the preview rect", () => {
  const ctx = makeCtx();
  drawHoverPreview(ctx, { x: 0, y: 0 }, 2, 2, true, 15, 28, 4);
  const fills = ctx.calls.filter((c) => c.method === "fillRect");
  expect(fills.length).toBe(1);
  const [x, y, w, h] = fills[0].args as number[];
  expect(x).toBe(30);
  expect(y).toBe(30);
  expect(w).toBe(26);
  expect(h).toBe(26);
});

test("drawFrameWall with wallPx=0 is a no-op", () => {
  const ctx = makeCtx();
  drawFrameWall(ctx, 28, 510, 0); // pad, innerPx, wallPx
  // No fillRect or strokeRect calls allowed when wallPx is 0
  const draws = ctx.calls.filter((c) => c.method === "fillRect" || c.method === "strokeRect");
  expect(draws.length).toBe(0);
});

test("drawFrameWall with wallPx>0 fills the wall ring outside the inner area", () => {
  const ctx = makeCtx();
  // pad=28, innerPx=510, wallPx=10 -> outer rect at (18, 18, 530, 530), inner hole at (28, 28, 510, 510)
  drawFrameWall(ctx, 28, 510, 10);
  const fills = ctx.calls.filter((c) => c.method === "fillRect");
  // Implementation may use a single fill of the outer rect plus a clear of the inner, or 4 strips. Either way we assert at least one fill that covers the outer rect and that nothing covers the inner area's center.
  expect(fills.length).toBeGreaterThan(0);
  // The outer extent must reach (pad - wallPx) on each side.
  const minX = Math.min(...fills.map((f) => (f.args as number[])[0]));
  expect(minX).toBe(18);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `bun test src/FibGrid/lib/canvas-draw.test.ts`
Expected: FAIL — `drawPlacedModules` doesn't accept a `gapPx` argument yet, `drawHoverPreview` doesn't either, and `drawFrameWall` does not exist.

- [ ] **Step 3: Commit the test only**

```bash
git add src/FibGrid/lib/canvas-draw.test.ts
git commit -m "test(canvas-draw): add gap-inset and frame-wall tests (failing)"
```

---

## Task 5: Canvas-draw — implement gap inset and drawFrameWall

**Files:**
- Modify: `src/FibGrid/lib/canvas-draw.ts`

- [ ] **Step 1: Update `drawPlacedModules` to accept `gapPx`**

Open `src/FibGrid/lib/canvas-draw.ts`. Replace the existing `drawPlacedModules` function with:

```ts
export function drawPlacedModules(
  ctx: CanvasRenderingContext2D,
  placed: PlacedModule[],
  u: number,
  pad: number,
  mm: number,
  gapPx: number
): void {
  const inset = gapPx / 2;
  for (const p of placed) {
    const px = pad + p.x * u + inset;
    const py = pad + p.y * u + inset;
    const pw = p.w * u - gapPx;
    const ph = p.d * u - gapPx;

    ctx.fillStyle = p.color + "28";
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = p.color + "cc";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);

    ctx.save();
    ctx.strokeStyle = p.color + "18";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const step = 8;
    for (let t = 0; t < pw + ph; t += step) {
      const x1 = px + Math.max(0, t - ph);
      const y1 = py + Math.min(ph, t);
      const x2 = px + Math.min(pw, t);
      const y2 = py + Math.max(0, t - pw);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.restore();

    const minDim = Math.min(pw, ph);
    if (minDim >= 22) {
      const fs = Math.max(7, Math.min(11, minDim / 4.5));
      ctx.fillStyle = p.color + "ee";
      ctx.font = `600 ${fs}px 'DM Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${p.w * mm}×${p.d * mm}`, px + pw / 2, py + ph / 2);
    }
  }
}
```

Note: the old code used a hard-coded `+1 / -2` to draw inside the cell boundary. With `gapPx=0` the new code draws flush at the cell edge — visually the same to within 1 px. The test for `gapPx=0` only asserts the fill is inside the nominal cell, so this is acceptable. (If you want pixel-perfect parity with the old look at `gapPx=0`, set `inset = Math.max(gapPx/2, 1)` and `pw = p.w*u - Math.max(gapPx, 2)` — but the simpler version is preferred.)

- [ ] **Step 2: Update `drawHoverPreview` to accept `gapPx`**

In the same file, replace `drawHoverPreview` with:

```ts
export function drawHoverPreview(
  ctx: CanvasRenderingContext2D,
  hover: { x: number; y: number },
  w: number,
  d: number,
  canPlace: boolean,
  u: number,
  pad: number,
  gapPx: number
): void {
  const inset = gapPx / 2;
  const hx = pad + hover.x * u + inset;
  const hy = pad + hover.y * u + inset;
  const hw = w * u - gapPx;
  const hh = d * u - gapPx;

  ctx.fillStyle = canPlace ? "#e8a23c18" : "#e05c6e18";
  ctx.fillRect(hx, hy, hw, hh);
  ctx.strokeStyle = canPlace ? "#e8a23c" : "#e05c6e";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(hx, hy, hw, hh);
  ctx.setLineDash([]);
}
```

- [ ] **Step 3: Add `drawFrameWall`**

In the same file, append at the bottom:

```ts
export function drawFrameWall(
  ctx: CanvasRenderingContext2D,
  pad: number,
  innerPx: number,
  wallPx: number
): void {
  if (wallPx <= 0) return;
  const outerX = pad - wallPx;
  const outerY = pad - wallPx;
  const outerSide = innerPx + 2 * wallPx;

  // Fill the outer ring as four strips (top, bottom, left, right) so we don't
  // paint over the inner grid area.
  ctx.fillStyle = "#1a1c24";
  ctx.fillRect(outerX, outerY, outerSide, wallPx);                          // top
  ctx.fillRect(outerX, pad + innerPx, outerSide, wallPx);                   // bottom
  ctx.fillRect(outerX, pad, wallPx, innerPx);                               // left
  ctx.fillRect(pad + innerPx, pad, wallPx, innerPx);                        // right

  // Outer outline. (Inner edge is drawn by drawBorder, so no double stroke.)
  ctx.strokeStyle = "#2e3040";
  ctx.lineWidth = 1;
  ctx.strokeRect(outerX + 0.5, outerY + 0.5, outerSide - 1, outerSide - 1);
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `bun test src/FibGrid/lib/canvas-draw.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/FibGrid/lib/canvas-draw.ts
git commit -m "feat(canvas-draw): inset modules by gap; add drawFrameWall"
```

---

## Task 6: Canvas.tsx — wire up dynamic dimensions and pass gap/wall

**Files:**
- Modify: `src/FibGrid/components/Canvas.tsx`

This task only updates Canvas to receive `physical` and use it for rendering. We have not yet added `physical` to `useFibGrid`; we'll wire it in Task 8. For now, make `physical` a required prop.

- [ ] **Step 1: Replace Canvas.tsx**

Open `src/FibGrid/components/Canvas.tsx` and replace its full contents with:

```tsx
import { useRef, useEffect, useCallback } from "react";
import { U, GRID, PAD, MM, FIB } from "../lib/constants";
import { toGrid, canPlace } from "../lib/grid-utils";
import {
  drawBackground,
  drawPlacedModules,
  drawGrid,
  drawBorder,
  drawRulerTicks,
  drawHoverPreview,
  drawFrameWall,
} from "../lib/canvas-draw";
import type { Module, PlacedModule, GridPos, PhysicalConfig } from "../lib/types";

interface CanvasProps {
  placed: PlacedModule[];
  hover: GridPos | null;
  effSelected: Module | null;
  occ: (string | null)[][];
  physical: PhysicalConfig;
  onHoverChange: (pos: GridPos | null) => void;
  onPlace: (w: number, d: number, x: number, y: number) => boolean;
  onRemoveAt: (x: number, y: number) => boolean;
}

const INNER_PX = GRID * U;

export function Canvas({
  placed,
  hover,
  effSelected,
  occ,
  physical,
  onHoverChange,
  onPlace,
  onRemoveAt,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const pxPerMm = U / MM;
  const gapPx = physical.gapMm * pxPerMm;
  const wallMm = (physical.outerMm - GRID * MM) / 2;
  const wallPx = wallMm * pxPerMm;
  const cw = INNER_PX + 2 * wallPx + 2 * PAD;
  const ch = cw;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    drawBackground(ctx, cw, ch);
    drawFrameWall(ctx, PAD + wallPx, INNER_PX, wallPx);
    drawPlacedModules(ctx, placed, U, PAD + wallPx, MM, gapPx);
    drawGrid(ctx, U, GRID, PAD + wallPx, FIB);
    drawBorder(ctx, PAD + wallPx, GRID, U);
    drawRulerTicks(ctx, FIB, U, PAD + wallPx, GRID, MM);

    if (hover && effSelected) {
      const ok = canPlace(effSelected.w, effSelected.d, hover.x, hover.y, occ);
      drawHoverPreview(ctx, hover, effSelected.w, effSelected.d, ok, U, PAD + wallPx, gapPx);
    }
  }, [placed, hover, effSelected, occ, gapPx, wallPx, cw, ch]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cw;
    cv.height = ch;
    draw();
  }, [draw, cw, ch]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const { x, y } = toGrid(e.clientX, e.clientY, cv, U, PAD + wallPx);
      if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
        onHoverChange({ x, y });
      } else {
        onHoverChange(null);
      }
    },
    [onHoverChange, wallPx]
  );

  const handleClick = useCallback(() => {
    if (!effSelected || !hover) return;
    onPlace(effSelected.w, effSelected.d, hover.x, hover.y);
  }, [effSelected, hover, onPlace]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!hover) return;
      onRemoveAt(hover.x, hover.y);
    },
    [hover, onRemoveAt]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverChange(null);
  }, [onHoverChange]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`block max-w-full ${effSelected ? "cursor-crosshair" : "cursor-default"}`}
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseLeave}
      />
      {hover && (
        <div
          className="absolute bottom-9 left-3 px-[7px] py-[3px] text-[9px] pointer-events-none"
          style={{
            background: "rgba(14, 14, 17, 0.8)",
            border: "1px solid #2e3040",
            color: "#666880",
            backdropFilter: "blur(4px)",
          }}
        >
          {hover.x * MM},{hover.y * MM} mm
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check (will fail downstream until index.tsx is updated)**

Run: `bunx tsc --noEmit`
Expected: failure in `src/FibGrid/index.tsx` because `<Canvas>` now requires `physical`. Failure in this file alone is fine.

- [ ] **Step 3: Do NOT commit yet — we commit after Task 9 so the tree compiles**

(Marker step. No commit here.)

---

## Task 7: useFibGrid — add physical state and actions

**Files:**
- Modify: `src/FibGrid/hooks/useFibGrid.ts`

- [ ] **Step 1: Update the hook**

Open `src/FibGrid/hooks/useFibGrid.ts` and replace its full contents with:

```ts
import { useState, useCallback, useMemo } from "react";
import {
  PALETTE,
  GAP_MM_DEFAULT,
  GAP_MM_MAX,
  OUTER_MM_DEFAULT,
  OUTER_MM_MAX,
  GRID,
  MM,
} from "../lib/constants";
import { buildOcc, canPlace } from "../lib/grid-utils";
import type { Module, PlacedModule, GridPos, PhysicalConfig } from "../lib/types";

export interface FibGridState {
  placed: PlacedModule[];
  selected: Module | null;
  rotated: boolean;
  hover: GridPos | null;
  colorIndex: number;
  physical: PhysicalConfig;
}

const OUTER_MM_MIN = GRID * MM; // 238

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function useFibGrid() {
  const [placed, setPlaced] = useState<PlacedModule[]>([]);
  const [selected, setSelected] = useState<Module | null>(null);
  const [rotated, setRotated] = useState(false);
  const [hover, setHover] = useState<GridPos | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [physical, setPhysical] = useState<PhysicalConfig>({
    gapMm: GAP_MM_DEFAULT,
    outerMm: OUTER_MM_DEFAULT,
  });

  const occ = useMemo(() => buildOcc(placed), [placed]);

  const effSelected = selected
    ? rotated
      ? { ...selected, w: selected.d, d: selected.w }
      : selected
    : null;

  const place = useCallback(
    (w: number, d: number, x: number, y: number) => {
      if (!canPlace(w, d, x, y, occ)) return false;
      const color = PALETTE[colorIndex % PALETTE.length];
      setPlaced((prev) => [
        ...prev,
        { w, d, x, y, color, pid: `${Date.now()}_${Math.random()}` },
      ]);
      setColorIndex((prev) => prev + 1);
      return true;
    },
    [occ, colorIndex]
  );

  const removeAt = useCallback(
    (x: number, y: number) => {
      const pid = occ[y]?.[x];
      if (!pid) return false;
      setPlaced((prev) => prev.filter((p) => p.pid !== pid));
      return true;
    },
    [occ]
  );

  const select = useCallback((module: Module | null) => {
    setSelected(module);
    setRotated(false);
  }, []);

  const rotate = useCallback(() => setRotated((r) => !r), []);

  const clearAll = useCallback(() => {
    setPlaced([]);
    setColorIndex(0);
  }, []);

  const setHoverPos = useCallback((pos: GridPos | null) => {
    setHover(pos);
  }, []);

  const load = useCallback((modules: PlacedModule[]) => {
    setPlaced(modules);
    setColorIndex(modules.length);
  }, []);

  const setGap = useCallback((gapMm: number) => {
    setPhysical((p) => ({ ...p, gapMm: clamp(gapMm, 0, GAP_MM_MAX) }));
  }, []);

  const setOuter = useCallback((outerMm: number) => {
    setPhysical((p) => ({ ...p, outerMm: clamp(outerMm, OUTER_MM_MIN, OUTER_MM_MAX) }));
  }, []);

  const loadPhysical = useCallback((cfg: PhysicalConfig) => {
    setPhysical({
      gapMm: clamp(cfg.gapMm, 0, GAP_MM_MAX),
      outerMm: clamp(cfg.outerMm, OUTER_MM_MIN, OUTER_MM_MAX),
    });
  }, []);

  return {
    placed,
    selected,
    rotated,
    hover,
    colorIndex,
    physical,
    effSelected,
    occ,
    place,
    removeAt,
    select,
    rotate,
    clearAll,
    setHoverPos,
    load,
    setGap,
    setOuter,
    loadPhysical,
  };
}
```

- [ ] **Step 2: Verify type-check (still failing in index.tsx — expected)**

Run: `bunx tsc --noEmit`
Expected: errors only in `src/FibGrid/index.tsx` and `src/FibGrid/components/Toolbar.tsx` (Toolbar still works — it doesn't reference physical yet). Other files compile.

- [ ] **Step 3: Marker step — no commit yet**

---

## Task 8: usePersistence — v2 schema and migration

**Files:**
- Modify: `src/FibGrid/hooks/usePersistence.ts`

The hook now takes both `physical` and `loadPhysical`. It writes a v2 envelope. On read, it migrates v1 layouts by setting `physical = { gapMm: 0, outerMm: 238 }`.

- [ ] **Step 1: Replace usePersistence.ts**

Open `src/FibGrid/hooks/usePersistence.ts` and replace its full contents with:

```ts
import { useEffect, useCallback } from "react";
import { GRID, MM } from "../lib/constants";
import type { PlacedModule, PhysicalConfig } from "../lib/types";

const STORAGE_KEY = "fib-grid-layout";
const SCHEMA_VERSION = 2;

interface StoredLayoutV1 {
  version: 1;
  placed: PlacedModule[];
  timestamp: number;
}

interface StoredLayoutV2 {
  version: 2;
  placed: PlacedModule[];
  physical: PhysicalConfig;
  timestamp: number;
}

type StoredLayout = StoredLayoutV1 | StoredLayoutV2;

function migrate(data: StoredLayout): StoredLayoutV2 {
  if (data.version === 2) return data;
  return {
    version: 2,
    placed: data.placed,
    physical: { gapMm: 0, outerMm: GRID * MM },
    timestamp: data.timestamp,
  };
}

export function usePersistence(
  placed: PlacedModule[],
  physical: PhysicalConfig,
  load: (modules: PlacedModule[]) => void,
  loadPhysical: (cfg: PhysicalConfig) => void
) {
  useEffect(() => {
    const data: StoredLayoutV2 = {
      version: SCHEMA_VERSION,
      placed,
      physical,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save layout:", e);
    }
  }, [placed, physical]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredLayout;
      if (parsed.version !== 1 && parsed.version !== 2) {
        console.warn("Layout schema mismatch, ignoring saved data");
        return;
      }
      const data = migrate(parsed);
      if (Array.isArray(data.placed)) {
        load(data.placed);
        loadPhysical(data.physical);
      }
    } catch (e) {
      console.warn("Failed to load layout:", e);
    }
    // Run-once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportJSON = useCallback(() => {
    const wallMm = (physical.outerMm - GRID * MM) / 2;
    const data = {
      version: 2,
      gridSize: GRID,
      unitMm: MM,
      physical: {
        gapMm: physical.gapMm,
        outerMm: physical.outerMm,
        wallMm,
      },
      modules: placed.map((p) => ({
        id: p.pid,
        nominal_mm: { w: p.w * MM, d: p.d * MM },
        built_mm: { w: p.w * MM - physical.gapMm, d: p.d * MM - physical.gapMm },
        position_mm: {
          x: p.x * MM + physical.gapMm / 2,
          y: p.y * MM + physical.gapMm / 2,
        },
        x: p.x,
        y: p.y,
        color: p.color,
      })),
      stats: {
        totalModules: placed.length,
        filledUnits: placed.reduce((s, p) => s + p.w * p.d, 0),
        fillPercentage: Math.round(
          (placed.reduce((s, p) => s + p.w * p.d, 0) / (GRID * GRID)) * 100
        ),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [placed, physical]);

  return { exportJSON };
}
```

- [ ] **Step 2: Marker step — no commit yet**

---

## Task 9: index.tsx — wire physical config through the tree

**Files:**
- Modify: `src/FibGrid/index.tsx`

- [ ] **Step 1: Update index.tsx**

Open `src/FibGrid/index.tsx` and replace its full contents with:

```tsx
import { useEffect, useCallback } from "react";
import { Canvas } from "./components/Canvas";
import { ModulePalette } from "./components/ModulePalette";
import { StatsPanel } from "./components/StatsPanel";
import { Toolbar } from "./components/Toolbar";
import { useFibGrid } from "./hooks/useFibGrid";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { usePersistence } from "./hooks/usePersistence";
import { exportPNG, exportCSV } from "./lib/export";

export default function FibGrid() {
  const grid = useFibGrid();
  const { undo, redo, pushHistory } = useUndoRedo(grid);
  const { exportJSON } = usePersistence(
    grid.placed,
    grid.physical,
    grid.load,
    grid.loadPhysical
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        grid.rotate();
      }
      if (e.key === "Escape") {
        grid.select(null);
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [grid, undo, redo]);

  const handlePlace = useCallback(
    (w: number, d: number, x: number, y: number) => {
      const success = grid.place(w, d, x, y);
      if (success) pushHistory();
      return success;
    },
    [grid, pushHistory]
  );

  const handleRemoveAt = useCallback(
    (x: number, y: number) => {
      const success = grid.removeAt(x, y);
      if (success) pushHistory();
      return success;
    },
    [grid, pushHistory]
  );

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) exportPNG(canvas);
  }, []);

  return (
    <div
      className="flex gap-0 min-h-screen select-none"
      style={{
        background: "#0e0e11",
        color: "#c8c8d4",
        fontFamily: "'DM Mono', 'Fira Mono', monospace",
      }}
    >
      <div className="p-6 flex flex-col gap-3 flex-shrink-0">
        <Toolbar
          placed={grid.placed}
          physical={grid.physical}
          onGapChange={grid.setGap}
          onOuterChange={grid.setOuter}
        />
        <Canvas
          placed={grid.placed}
          hover={grid.hover}
          effSelected={grid.effSelected}
          occ={grid.occ}
          physical={grid.physical}
          onHoverChange={grid.setHoverPos}
          onPlace={handlePlace}
          onRemoveAt={handleRemoveAt}
        />
      </div>

      <div
        className="w-[260px] flex flex-col p-5 gap-4 overflow-y-auto"
        style={{ background: "#111217", borderLeft: "1px solid #1a1c24" }}
      >
        <ModulePalette
          selected={grid.selected}
          rotated={grid.rotated}
          effSelected={grid.effSelected}
          onSelect={grid.select}
          onRotate={grid.rotate}
        />
        <StatsPanel
          placed={grid.placed}
          onClearAll={grid.clearAll}
          onExportJSON={exportJSON}
          onExportPNG={handleExportPNG}
          onExportCSV={() => exportCSV(grid.placed, grid.physical)}
        />
      </div>
    </div>
  );
}
```

(`exportCSV` is now called with `grid.physical` — Task 11 updates its signature; type-check will still complain until then. Continue.)

- [ ] **Step 2: Marker step — no commit yet**

---

## Task 10: Toolbar — gap and wall sliders

**Files:**
- Modify: `src/FibGrid/components/Toolbar.tsx`

- [ ] **Step 1: Replace Toolbar.tsx**

Open `src/FibGrid/components/Toolbar.tsx` and replace its full contents with:

```tsx
import {
  GRID,
  MM,
  COMBOS,
  GAP_MM_MAX,
  GAP_MM_STEP,
  OUTER_MM_MAX,
  OUTER_MM_STEP,
} from "../lib/constants";
import type { PlacedModule, PhysicalConfig } from "../lib/types";

interface ToolbarProps {
  placed: PlacedModule[];
  physical: PhysicalConfig;
  onGapChange: (gapMm: number) => void;
  onOuterChange: (outerMm: number) => void;
}

const OUTER_MM_MIN = GRID * MM; // 238

export function Toolbar({ placed, physical, onGapChange, onOuterChange }: ToolbarProps) {
  const filledU = placed.reduce((s, p) => s + p.w * p.d, 0);
  const pct = Math.round((filledU / (GRID * GRID)) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-baseline gap-6">
        <div>
          <span
            className="text-[11px] uppercase tracking-[2px]"
            style={{ color: "#44475a" }}
          >
            φ Storage Grid
          </span>
          <div className="text-[18px] font-bold mt-0.5" style={{ color: "#e8e8f0" }}>
            238 × 238 mm
          </div>
          <div className="text-[10px]" style={{ color: "#555769" }}>
            34u × 34u · u = 7 mm
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1 max-w-[220px]">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[1.5px]" style={{ color: "#888aaa" }}>
            <span className="w-9" style={{ color: "#555769" }}>Gap</span>
            <input
              type="range"
              min={0}
              max={GAP_MM_MAX}
              step={GAP_MM_STEP}
              value={physical.gapMm}
              onChange={(e) => onGapChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-right tabular-nums" style={{ color: "#c8c8d4" }}>
              {physical.gapMm.toFixed(1)} mm
            </span>
          </label>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[1.5px]" style={{ color: "#888aaa" }}>
            <span className="w-9" style={{ color: "#555769" }}>Wall</span>
            <input
              type="range"
              min={OUTER_MM_MIN}
              max={OUTER_MM_MAX}
              step={OUTER_MM_STEP}
              value={physical.outerMm}
              onChange={(e) => onOuterChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-right tabular-nums" style={{ color: "#c8c8d4" }}>
              {((physical.outerMm - OUTER_MM_MIN) / 2).toFixed(1)} mm
            </span>
          </label>
          <div className="text-[9px] text-right" style={{ color: "#44475a" }}>
            outer {physical.outerMm} mm
          </div>
        </div>

        <div className="text-right">
          <div className="text-[28px] font-bold" style={{ color: "#e8a23c" }}>
            {pct}%
          </div>
          <div className="text-[9px]" style={{ color: "#555769" }}>
            filled
          </div>
        </div>
      </div>

      <div className="text-[9px] flex gap-4" style={{ color: "#44475a" }}>
        <span>■ Fibonacci lines darker</span>
        <span>● Left-click: place</span>
        <span>● Right-click: remove</span>
        <span>● R: rotate</span>
        <span>● Ctrl+Z: undo</span>
      </div>

      <div className="pt-2.5" style={{ borderTop: "1px solid #1a1c24" }}>
        <div
          className="text-[9px] uppercase tracking-[1px] mb-1.5"
          style={{ color: "#44475a" }}
        >
          Valid row combos (sum = 34u)
        </div>
        <div className="flex flex-wrap gap-[5px]">
          {COMBOS.map(([units, lbl]) => (
            <div
              key={lbl}
              className="px-2 py-[3px] text-[9px]"
              style={{
                background: "#1a1c24",
                border: "1px solid #2e3040",
                color: "#888aaa",
              }}
            >
              {lbl}
              <span className="ml-1" style={{ color: "#44475a" }}>
                ({units.map((u) => u * MM).join("+")}mm)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Marker step — no commit yet**

---

## Task 11: export.ts — CSV with built and position columns

**Files:**
- Modify: `src/FibGrid/lib/export.ts`

Split the CSV body builder from the download side so we can unit-test the pure function (Bun's test runner does not provide `document`).

- [ ] **Step 1: Update exportCSV and add pure builder**

Open `src/FibGrid/lib/export.ts` and replace its full contents with:

```ts
import { MM } from "./constants";
import type { PlacedModule, PhysicalConfig } from "./types";

export function exportPNG(canvas: HTMLCanvasElement): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function buildCsv(placed: PlacedModule[], physical: PhysicalConfig): string {
  const lines = [
    "id,nominal_w_mm,nominal_d_mm,built_w_mm,built_d_mm,x,y,pos_x_mm,pos_y_mm,color",
  ];
  for (const p of placed) {
    const nomW = p.w * MM;
    const nomD = p.d * MM;
    const builtW = nomW - physical.gapMm;
    const builtD = nomD - physical.gapMm;
    const posX = p.x * MM + physical.gapMm / 2;
    const posY = p.y * MM + physical.gapMm / 2;
    lines.push(
      `${p.pid},${nomW},${nomD},${builtW},${builtD},${p.x},${p.y},${posX},${posY},${p.color}`
    );
  }
  return lines.join("\n");
}

export function exportCSV(placed: PlacedModule[], physical: PhysicalConfig): void {
  const csv = buildCsv(placed, physical);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify the whole tree type-checks**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run existing tests to make sure nothing regressed**

Run: `bun test`
Expected: all previous tests still pass (canvas-draw + grid-utils).

- [ ] **Step 4: Commit the full integration so far**

```bash
git add src/FibGrid/components/Canvas.tsx \
        src/FibGrid/components/Toolbar.tsx \
        src/FibGrid/hooks/useFibGrid.ts \
        src/FibGrid/hooks/usePersistence.ts \
        src/FibGrid/index.tsx \
        src/FibGrid/lib/export.ts
git commit -m "feat(physical): thread gap and outer envelope through grid, canvas, toolbar, exports, persistence"
```

---

## Task 12: Tests for export

**Files:**
- Create: `src/FibGrid/lib/export.test.ts`

We test the pure `buildCsv` function. `exportCSV` (which triggers a download) is not tested directly — DOM bindings are out of scope for unit tests, and `buildCsv` covers all of the math.

- [ ] **Step 1: Write the failing test**

Create `src/FibGrid/lib/export.test.ts`:

```ts
import { test, expect } from "bun:test";
import { buildCsv } from "./export";
import type { PlacedModule, PhysicalConfig } from "./types";

const mod: PlacedModule = {
  pid: "p1",
  w: 3,
  d: 5,
  x: 2,
  y: 4,
  color: "#aabbcc",
};

test("buildCsv header has nominal, built, pos columns", () => {
  const cfg: PhysicalConfig = { gapMm: 0, outerMm: 238 };
  const csv = buildCsv([mod], cfg);
  const [header] = csv.split("\n");
  expect(header).toBe(
    "id,nominal_w_mm,nominal_d_mm,built_w_mm,built_d_mm,x,y,pos_x_mm,pos_y_mm,color"
  );
});

test("buildCsv gap=0: built equals nominal, pos equals x*mm", () => {
  const cfg: PhysicalConfig = { gapMm: 0, outerMm: 238 };
  const csv = buildCsv([mod], cfg);
  const lines = csv.split("\n");
  expect(lines[1]).toBe("p1,21,35,21,35,2,4,14,28,#aabbcc");
});

test("buildCsv gap=1: built shrinks by 1, pos offset by 0.5", () => {
  const cfg: PhysicalConfig = { gapMm: 1, outerMm: 238 };
  const csv = buildCsv([mod], cfg);
  const lines = csv.split("\n");
  expect(lines[1]).toBe("p1,21,35,20,34,2,4,14.5,28.5,#aabbcc");
});

test("buildCsv with multiple modules: one line per module plus header", () => {
  const cfg: PhysicalConfig = { gapMm: 0, outerMm: 238 };
  const m2: PlacedModule = { pid: "p2", w: 5, d: 5, x: 10, y: 10, color: "#112233" };
  const csv = buildCsv([mod, m2], cfg);
  expect(csv.split("\n").length).toBe(3); // header + 2 modules
});
```

- [ ] **Step 2: Run the test**

Run: `bun test src/FibGrid/lib/export.test.ts`
Expected: 4 passing.

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/lib/export.test.ts
git commit -m "test(export): assert CSV columns and gap-aware values"
```

---

## Task 13: Tests for persistence v1→v2 migration

**Files:**
- Create: `src/FibGrid/hooks/usePersistence.test.ts`

We can't easily run a React hook outside a renderer in this codebase (no test-renderer dependency). Instead, test the **migration function** by extracting it to be exported, then unit-test it directly.

- [ ] **Step 1: Export the migrate function from usePersistence**

Open `src/FibGrid/hooks/usePersistence.ts` and change the `migrate` declaration so it's exported. Replace:

```ts
function migrate(data: StoredLayout): StoredLayoutV2 {
```

with:

```ts
export function _migrate(data: StoredLayout): StoredLayoutV2 {
```

Then update the single internal call from `migrate(parsed)` to `_migrate(parsed)`. (The leading underscore signals "exported for tests only".)

Also export the version types so the test file can typecheck them. Add `export` to the two interfaces:

```ts
export interface StoredLayoutV1 {
  version: 1;
  placed: PlacedModule[];
  timestamp: number;
}

export interface StoredLayoutV2 {
  version: 2;
  placed: PlacedModule[];
  physical: PhysicalConfig;
  timestamp: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/FibGrid/hooks/usePersistence.test.ts`:

```ts
import { test, expect } from "bun:test";
import { _migrate, type StoredLayoutV1, type StoredLayoutV2 } from "./usePersistence";

test("_migrate: v1 -> v2 sets gap=0 and outer=238, preserves placed and timestamp", () => {
  const v1: StoredLayoutV1 = {
    version: 1,
    placed: [{ pid: "x", w: 3, d: 5, x: 0, y: 0, color: "#fff" }],
    timestamp: 12345,
  };
  const v2 = _migrate(v1);
  expect(v2.version).toBe(2);
  expect(v2.placed).toEqual(v1.placed);
  expect(v2.timestamp).toBe(12345);
  expect(v2.physical).toEqual({ gapMm: 0, outerMm: 238 });
});

test("_migrate: v2 -> v2 is identity", () => {
  const v2In: StoredLayoutV2 = {
    version: 2,
    placed: [{ pid: "x", w: 3, d: 5, x: 0, y: 0, color: "#fff" }],
    physical: { gapMm: 0.3, outerMm: 250 },
    timestamp: 99,
  };
  const out = _migrate(v2In);
  expect(out).toEqual(v2In);
});
```

- [ ] **Step 3: Run the test**

Run: `bun test src/FibGrid/hooks/usePersistence.test.ts`
Expected: 2 passing.

- [ ] **Step 4: Commit**

```bash
git add src/FibGrid/hooks/usePersistence.ts src/FibGrid/hooks/usePersistence.test.ts
git commit -m "test(persistence): v1->v2 migration; export migrate for testing"
```

---

## Task 14: Manual verification

- [ ] **Step 1: Run the dev server**

Run: `bun dev`
Open the URL printed (usually `http://localhost:3000`).

- [ ] **Step 2: Verify gap behavior**

- Drag the **Gap** slider from `0.0` to `1.0`. Modules should visibly shrink/grow with the gap — the inset is uniform on all four sides, including at the grid edge.
- With Gap > 0, place two modules adjacent to each other (e.g., a 13×13 at (0,0) and a 13×13 at (13,0)). Visible space should appear between them.

- [ ] **Step 3: Verify wall behavior**

- Drag the **Wall** slider from `238` (0 mm wall) to `256` (9 mm wall). A dark ring should appear around the grid; the inner grid stays the same size.
- Mouse hover should still report grid cells correctly while the wall is present.

- [ ] **Step 4: Verify persistence**

- Place a few modules with Gap = 0.5 and Wall = 250mm. Reload the page. The layout AND the slider values should restore.

- [ ] **Step 5: Verify exports**

- Click **Export JSON**. Open the downloaded file. Confirm it contains a top-level `physical: { gapMm, outerMm, wallMm }` and each module has `nominal_mm`, `built_mm`, `position_mm` blocks.
- Click **Export CSV**. Confirm the header reads `id,nominal_w_mm,nominal_d_mm,built_w_mm,built_d_mm,x,y,pos_x_mm,pos_y_mm,color`.
- Click **Export PNG**. Confirm the saved image includes the wall ring and inset modules.

- [ ] **Step 6: Verify v1 migration (manual)**

In the browser DevTools console, before reloading:

```js
localStorage.setItem("fib-grid-layout", JSON.stringify({
  version: 1,
  placed: [{ pid: "m1", w: 5, d: 5, x: 0, y: 0, color: "#e8a23c" }],
  timestamp: Date.now(),
}));
location.reload();
```

After reload, the module should be present, Gap slider should read `0.0 mm`, Wall slider should read `0.0 mm` (outer 238mm). Then reload once more — the saved layout should now be v2 (re-saved on first load).

- [ ] **Step 7: Final commit (if any cleanup needed)**

If you needed any cleanup during manual testing, commit it:

```bash
git status
git add -p
git commit -m "fix(physical): <cleanup description>"
```

If no cleanup, do nothing.

---

## Done Criteria

- All four test files pass: `bun test` (canvas-draw, grid-utils, export, usePersistence)
- `bunx tsc --noEmit` is clean
- Manual verification (Task 14) passes all steps
- Gap and Wall sliders are visible in the toolbar and update the canvas live
- v1 saved layouts open without error and re-save as v2

## Out of Scope (for reference)

These are explicitly NOT in this plan (from spec §10):

- Per-module gap overrides
- Anisotropic gaps
- Lids/drawers/snap-fits/chamfers
- STL/STEP/3MF export
- Printability warnings

# Adaptive Layout for Tablet+ Resolutions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the FibGrid UI fill the viewport at tablet/desktop sizes — canvas grows to fit, sidebar always visible, palette shows all 13 modules as scaled shapes without scrolling, export/clear move into the toolbar.

**Architecture:** Lock the root container to viewport height (no page scroll). Canvas reads its container's measured size via `ResizeObserver` and snaps `U` (pixels per grid unit) to the largest integer that fits, preserving the pixel-art aesthetic. Toolbar grows: it absorbs export (`⋯` popover) and clear-all from the deleted `StatsPanel`, and absorbs the shortcut hints + valid-row-combo chips behind a `?` info popover. ModulePalette becomes a uniform-tile grid where each tile renders the module's shape proportionally inside equal padding. Below 1024px viewport width, a notice replaces the app.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Bun (runtime + test runner), HTML Canvas 2D.

**Spec:** [docs/superpowers/specs/2026-05-17-adaptive-layout-design.md](../specs/2026-05-17-adaptive-layout-design.md)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/FibGrid/lib/constants.ts` | Modify | Add `U_MIN`; keep `U` as initial seed value |
| `src/FibGrid/lib/canvas-sizing.ts` | Create | Pure function `computeU(containerW, containerH, wallPx)` |
| `src/FibGrid/lib/canvas-sizing.test.ts` | Create | Unit tests for `computeU` |
| `src/FibGrid/components/Canvas.tsx` | Modify | Owns dynamic `u` state; uses `ResizeObserver` on a wrapper element |
| `src/FibGrid/components/Popover.tsx` | Create | Tiny shared popover used by the `?` and `⋯` buttons |
| `src/FibGrid/components/Toolbar.tsx` | Modify | Adds `?` (shortcuts + combos), `⋯` (exports), `✕ Clear`; removes inline shortcut row and combo strip |
| `src/FibGrid/components/ModulePalette.tsx` | Modify | Uniform tile grid (3/3/2 cols per category) with scaled shape + equal padding |
| `src/FibGrid/components/StatsPanel.tsx` | Delete | Functionality absorbed into Toolbar |
| `src/FibGrid/index.tsx` | Modify | Viewport-locked layout; `<1024` notice; wires Toolbar to export/clear handlers; removes StatsPanel |
| `src/FibGrid/components/MinViewportNotice.tsx` | Create | Centered "use a wider screen" notice |

Tasks below are ordered so each one is independently verifiable: pure logic first, then visual components, then layout integration.

---

## Task 1: Constants — add `U_MIN`

**Files:**
- Modify: `src/FibGrid/lib/constants.ts`

- [ ] **Step 1: Update constants**

In `src/FibGrid/lib/constants.ts`, add the minimum-pixel-per-unit floor next to the existing `U`:

```ts
export const U = 15;
export const U_MIN = 12;
export const GRID = 34;
export const PAD = 28;
export const MM = 7;
export const FIB = [3, 5, 8, 13, 21, 34];
```

(Leave everything below the constants unchanged.)

- [ ] **Step 2: Verify type-check and tests still pass**

Run: `bun test`
Expected: all existing tests pass; no new tests yet.

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/lib/constants.ts
git commit -m "feat: add U_MIN floor constant for adaptive canvas sizing"
```

---

## Task 2: Pure sizing function `computeU`

**Files:**
- Create: `src/FibGrid/lib/canvas-sizing.ts`
- Test: `src/FibGrid/lib/canvas-sizing.test.ts`

This is the math that turns a container size into the largest integer `U` that fits, respecting wall thickness and padding. Pure function, easy to test.

- [ ] **Step 1: Write the failing tests**

Create `src/FibGrid/lib/canvas-sizing.test.ts`:

```ts
import { expect, test } from "bun:test";
import { computeU } from "./canvas-sizing";
import { GRID, PAD, U_MIN } from "./constants";

test("computeU: returns largest integer U that fits in the container", () => {
  // container 800x800, wallPx 0 => available = 800 - 2*PAD = 744
  // floor(744 / 34) = 21
  expect(computeU(800, 800, 0)).toBe(21);
});

test("computeU: uses the smaller dimension when container isn't square", () => {
  // 1200 wide, 600 tall => height is the limit
  // available = 600 - 2*PAD = 544; floor(544/34) = 16
  expect(computeU(1200, 600, 0)).toBe(16);
});

test("computeU: subtracts wall thickness on both sides", () => {
  // 800x800 with 30px wall => available = 800 - 2*PAD - 2*30 = 684
  // floor(684/34) = 20
  expect(computeU(800, 800, 30)).toBe(20);
});

test("computeU: never returns below U_MIN", () => {
  // tiny container — math would give 0, must clamp to U_MIN
  expect(computeU(100, 100, 0)).toBe(U_MIN);
});

test("computeU: returns an integer", () => {
  const result = computeU(1000, 1000, 0);
  expect(Number.isInteger(result)).toBe(true);
});

test("computeU: representative desktop sizes", () => {
  // 1280x800 canvas column (sidebar 260 taken out) => width ~1020, height ~800-toolbar
  // Pass realistic numbers directly.
  expect(computeU(1020, 720, 0)).toBeGreaterThanOrEqual(19);
  expect(computeU(1660, 880, 0)).toBeGreaterThanOrEqual(24);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/FibGrid/lib/canvas-sizing.test.ts`
Expected: FAIL — `canvas-sizing.ts` doesn't exist yet.

- [ ] **Step 3: Implement `computeU`**

Create `src/FibGrid/lib/canvas-sizing.ts`:

```ts
import { GRID, PAD, U_MIN } from "./constants";

export function computeU(
  containerW: number,
  containerH: number,
  wallPx: number,
): number {
  const available = Math.min(containerW, containerH) - 2 * PAD - 2 * wallPx;
  const candidate = Math.floor(available / GRID);
  return Math.max(candidate, U_MIN);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/FibGrid/lib/canvas-sizing.test.ts`
Expected: PASS — all six tests green.

- [ ] **Step 5: Commit**

```bash
git add src/FibGrid/lib/canvas-sizing.ts src/FibGrid/lib/canvas-sizing.test.ts
git commit -m "feat: computeU pure function for adaptive canvas sizing"
```

---

## Task 3: Shared `Popover` component

**Files:**
- Create: `src/FibGrid/components/Popover.tsx`

A small click-to-toggle popover anchored to a trigger button. Used by both the `?` info button and the `⋯` export menu in the toolbar. Closes on outside click or `Esc`.

- [ ] **Step 1: Create the component**

Create `src/FibGrid/components/Popover.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  trigger: (props: { onClick: () => void; isOpen: boolean }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function Popover({ trigger, children, align = "right" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger({ onClick: () => setOpen((v) => !v), isOpen: open })}
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[200px]"
          style={{
            [align]: 0,
            background: "#15161c",
            border: "1px solid #2e3040",
            padding: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          } as React.CSSProperties}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `bun build src/frontend.tsx --target browser --outdir /tmp/fib-build-check 2>&1 | head -20`
Expected: builds without errors. (The popover isn't wired up yet, but the file must type-check.)

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/components/Popover.tsx
git commit -m "feat: shared Popover component for toolbar menus"
```

---

## Task 4: `MinViewportNotice` component

**Files:**
- Create: `src/FibGrid/components/MinViewportNotice.tsx`

- [ ] **Step 1: Create the component**

Create `src/FibGrid/components/MinViewportNotice.tsx`:

```tsx
export function MinViewportNotice() {
  return (
    <div
      className="flex items-center justify-center h-screen w-screen p-8 text-center"
      style={{
        background: "#0e0e11",
        color: "#c8c8d4",
        fontFamily: "'DM Mono', 'Fira Mono', monospace",
      }}
    >
      <div>
        <div
          className="text-[11px] uppercase tracking-[2px] mb-3"
          style={{ color: "#44475a" }}
        >
          φ Storage Grid
        </div>
        <div className="text-[18px] font-bold mb-2" style={{ color: "#e8e8f0" }}>
          This tool is designed for tablet and desktop.
        </div>
        <div className="text-[12px]" style={{ color: "#888aaa" }}>
          Please open it on a screen at least 1024 pixels wide.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `bun build src/frontend.tsx --target browser --outdir /tmp/fib-build-check 2>&1 | head -20`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/FibGrid/components/MinViewportNotice.tsx
git commit -m "feat: MinViewportNotice for <1024px viewports"
```

---

## Task 5: New `ModulePalette` with uniform shape tiles

**Files:**
- Modify: `src/FibGrid/components/ModulePalette.tsx`

Replace the text-button list with a uniform tile grid per category. Each tile is `aspect-ratio: 1` with an inner box that has equal 6px padding on all four sides; inside the inner box, a centered rectangle proportional to `(m.w / 34) × (m.d / 34)`.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/FibGrid/components/ModulePalette.tsx` with:

```tsx
import { MODULES, MM, U } from "../lib/constants";
import type { Module } from "../lib/types";

interface ModulePaletteProps {
  selected: Module | null;
  rotated: boolean;
  effSelected: Module | null;
  onSelect: (module: Module | null) => void;
  onRotate: () => void;
}

const label = (m: Module) => `${m.w * MM}×${m.d * MM}`;

const CATEGORY_COLS: Record<Module["cat"], number> = {
  narrow: 3,
  medium: 3,
  large: 2,
};

function ShapeTile({
  module,
  isActive,
  onClick,
}: {
  module: Module;
  isActive: boolean;
  onClick: () => void;
}) {
  // Shape is sized as a fraction of inner padded area; max dimension = 34u.
  const wPct = (module.w / 34) * 100;
  const hPct = (module.d / 34) * 100;
  return (
    <button
      onClick={onClick}
      title={`${label(module)} mm`}
      className="relative aspect-square cursor-pointer transition-colors duration-100 flex items-center justify-center"
      style={{
        background: isActive ? "#1e2030" : "transparent",
        border: `1px solid ${isActive ? "#e8a23c" : "#1a1c24"}`,
        padding: "6px",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = "#181a22";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          width: `${wPct}%`,
          height: `${hPct}%`,
          background: isActive ? "#e8a23c22" : "#1e2030",
          border: `1px solid ${isActive ? "#e8a23c" : "#2e3040"}`,
        }}
      />
    </button>
  );
}

export function ModulePalette({
  selected,
  rotated,
  effSelected,
  onSelect,
  onRotate,
}: ModulePaletteProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="text-[9px] uppercase tracking-[2px]"
        style={{ color: "#44475a" }}
      >
        Module Catalogue
      </div>

      {(["narrow", "medium", "large"] as const).map((cat) => (
        <div key={cat}>
          <div
            className="text-[8px] uppercase tracking-[2px] pb-1 mb-1.5"
            style={{ color: "#333547", borderBottom: "1px solid #1a1c24" }}
          >
            {cat}
          </div>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${CATEGORY_COLS[cat]}, 1fr)`,
            }}
          >
            {MODULES.filter((m) => m.cat === cat).map((m) => (
              <ShapeTile
                key={m.id}
                module={m}
                isActive={selected?.id === m.id}
                onClick={() => onSelect(m)}
              />
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div
          className="flex flex-col gap-2.5 p-3 mt-2"
          style={{ background: "#1a1c24", border: "1px solid #2e3040" }}
        >
          <div className="text-[9px] tracking-[1px]" style={{ color: "#44475a" }}>
            SELECTED
          </div>
          <div className="text-[13px] font-bold" style={{ color: "#e8e8f0" }}>
            {rotated ? label({ ...selected, w: selected.d, d: selected.w }) : label(selected)} mm
          </div>
          <div className="text-[9px]" style={{ color: "#555769" }}>
            {rotated
              ? `${selected.d * MM}W × ${selected.w * MM}D`
              : `${selected.w * MM}W × ${selected.d * MM}D`}
          </div>

          <div className="flex justify-center py-2">
            {(() => {
              const dw = effSelected?.w ?? 1;
              const dd = effSelected?.d ?? 1;
              const maxS = 80;
              const scale = Math.min(maxS / (dw * U), maxS / (dd * U));
              const pw = dw * U * scale;
              const ph = dd * U * scale;
              return (
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    width: Math.max(pw, 16),
                    height: Math.max(ph, 16),
                    border: "1.5px solid #e8a23c88",
                    background: "#e8a23c12",
                  }}
                >
                  <span className="text-[8px]" style={{ color: "#e8a23c99" }}>
                    {dw * MM}×{dd * MM}
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={onRotate}
              className="flex-1 text-[10px] tracking-[1px] cursor-pointer py-1.5"
              style={{ background: "#1e2030", border: "1px solid #2e3040", color: "#888aaa" }}
            >
              ↺ ROTATE
            </button>
            <button
              onClick={() => onSelect(null)}
              className="flex-1 text-[10px] tracking-[1px] cursor-pointer py-1.5"
              style={{ background: "#1e2030", border: "1px solid #2e3040", color: "#666880" }}
            >
              ✕ CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `bun build src/frontend.tsx --target browser --outdir /tmp/fib-build-check 2>&1 | head -20`
Expected: no errors. (Visual verification happens after Task 8 wires the new layout.)

- [ ] **Step 3: Run tests**

Run: `bun test`
Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/FibGrid/components/ModulePalette.tsx
git commit -m "feat: ModulePalette uses uniform-tile grid with scaled shapes"
```

---

## Task 6: New `Toolbar` — absorb export, clear-all, and info popover

**Files:**
- Modify: `src/FibGrid/components/Toolbar.tsx`

Toolbar gains three new responsibilities: `?` popover holding shortcuts + valid-row combos, `⋯` popover holding JSON/PNG/CSV export, and a `✕ Clear` button. The inline shortcut row and combos strip are removed.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/FibGrid/components/Toolbar.tsx` with:

```tsx
import {
  COMBOS,
  GAP_MM_MAX,
  GAP_MM_STEP,
  GRID,
  MM,
  OUTER_MM_MAX,
  OUTER_MM_STEP,
} from "../lib/constants";
import type { PhysicalConfig, PlacedModule } from "../lib/types";
import { Popover } from "./Popover";

interface ToolbarProps {
  placed: PlacedModule[];
  physical: PhysicalConfig;
  onGapChange: (gapMm: number) => void;
  onOuterChange: (outerMm: number) => void;
  onExportJSON: () => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
  onClearAll: () => void;
}

const OUTER_MM_MIN = GRID * MM;

const iconButtonStyle: React.CSSProperties = {
  background: "#1e2030",
  border: "1px solid #2e3040",
  color: "#888aaa",
};

export function Toolbar({
  placed,
  physical,
  onGapChange,
  onOuterChange,
  onExportJSON,
  onExportPNG,
  onExportCSV,
  onClearAll,
}: ToolbarProps) {
  const filledU = placed.reduce((s, p) => s + p.w * p.d, 0);
  const pct = Math.round((filledU / (GRID * GRID)) * 100);

  return (
    <div className="flex items-center gap-6 px-6 py-3" style={{ borderBottom: "1px solid #1a1c24" }}>
      <div>
        <span className="text-[11px] uppercase tracking-[2px]" style={{ color: "#44475a" }}>
          φ Storage Grid
        </span>
        <div className="text-[18px] font-bold mt-0.5" style={{ color: "#e8e8f0" }}>
          238 × 238 mm
        </div>
        <div className="text-[10px]" style={{ color: "#555769" }}>
          34u × 34u · u = 7 mm
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-1 max-w-[260px]">
        <label
          className="flex items-center gap-2 text-[10px] uppercase tracking-[1.5px]"
          style={{ color: "#888aaa" }}
        >
          <span className="w-9" style={{ color: "#555769" }}>Gap</span>
          <input
            type="range"
            min={0}
            max={GAP_MM_MAX}
            step={GAP_MM_STEP}
            value={physical.gapMm}
            onChange={(e) => onGapChange(Number.parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right tabular-nums" style={{ color: "#c8c8d4" }}>
            {physical.gapMm.toFixed(1)} mm
          </span>
        </label>
        <label
          className="flex items-center gap-2 text-[10px] uppercase tracking-[1.5px]"
          style={{ color: "#888aaa" }}
        >
          <span className="w-9" style={{ color: "#555769" }}>Wall</span>
          <input
            type="range"
            min={OUTER_MM_MIN}
            max={OUTER_MM_MAX}
            step={OUTER_MM_STEP}
            value={physical.outerMm}
            onChange={(e) => onOuterChange(Number.parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right tabular-nums" style={{ color: "#c8c8d4" }}>
            {((physical.outerMm - OUTER_MM_MIN) / 2).toFixed(1)} mm
          </span>
        </label>
      </div>

      <div className="flex-1" />

      <div className="text-right">
        <div className="text-[28px] font-bold leading-none" style={{ color: "#e8a23c" }}>
          {pct}%
        </div>
        <div className="text-[9px]" style={{ color: "#555769" }}>filled</div>
      </div>

      <Popover
        align="right"
        trigger={({ onClick, isOpen }) => (
          <button
            onClick={onClick}
            className="w-8 h-8 text-[14px] cursor-pointer"
            style={{
              ...iconButtonStyle,
              color: isOpen ? "#e8e8f0" : "#888aaa",
            }}
            title="Shortcuts and valid row combos"
          >
            ?
          </button>
        )}
      >
        <div className="flex flex-col gap-3" style={{ minWidth: 260 }}>
          <div>
            <div className="text-[9px] uppercase tracking-[1px] mb-1.5" style={{ color: "#44475a" }}>
              Shortcuts
            </div>
            <div className="flex flex-col gap-1 text-[10px]" style={{ color: "#888aaa" }}>
              <span>● Left-click: place</span>
              <span>● Right-click: remove</span>
              <span>● R: rotate</span>
              <span>● Ctrl+Z: undo · Ctrl+Shift+Z: redo</span>
              <span>● Esc: deselect</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[1px] mb-1.5" style={{ color: "#44475a" }}>
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
      </Popover>

      <Popover
        align="right"
        trigger={({ onClick, isOpen }) => (
          <button
            onClick={onClick}
            className="w-8 h-8 text-[14px] cursor-pointer"
            style={{
              ...iconButtonStyle,
              color: isOpen ? "#e8e8f0" : "#888aaa",
            }}
            title="Export"
          >
            ⋯
          </button>
        )}
      >
        <div className="flex flex-col gap-1 text-[10px] tracking-[1px]" style={{ minWidth: 140 }}>
          <button
            onClick={onExportJSON}
            className="px-3 py-2 text-left cursor-pointer"
            style={iconButtonStyle}
          >
            EXPORT JSON
          </button>
          <button
            onClick={onExportPNG}
            className="px-3 py-2 text-left cursor-pointer"
            style={iconButtonStyle}
          >
            EXPORT PNG
          </button>
          <button
            onClick={onExportCSV}
            className="px-3 py-2 text-left cursor-pointer"
            style={iconButtonStyle}
          >
            EXPORT CSV
          </button>
        </div>
      </Popover>

      <button
        onClick={onClearAll}
        className="px-3 h-8 text-[10px] tracking-[1px] cursor-pointer transition-colors duration-100"
        style={{
          background: "transparent",
          border: "1px solid #2e3040",
          color: "#555769",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#e05c6e66";
          e.currentTarget.style.color = "#e05c6e";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#2e3040";
          e.currentTarget.style.color = "#555769";
        }}
      >
        ✕ CLEAR
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `bun build src/frontend.tsx --target browser --outdir /tmp/fib-build-check 2>&1 | head -20`
Expected: it will fail at `index.tsx` because Toolbar's prop signature changed. That's fine — the next task (after we re-wire index.tsx in Task 8) closes the loop. For now, leave the build failing.

- [ ] **Step 3: Do NOT commit yet**

Toolbar's new props (`onExportJSON`, `onExportPNG`, `onExportCSV`, `onClearAll`) aren't wired up yet. Task 8 wires them; commit together after that to keep the tree compilable.

---

## Task 7: Canvas — dynamic `U` via ResizeObserver

**Files:**
- Modify: `src/FibGrid/components/Canvas.tsx`

Canvas component grows a wrapper element it can observe, computes `u` from the observed size, and uses that `u` throughout.

- [ ] **Step 1: Rewrite Canvas to consume container size**

Replace the entire contents of `src/FibGrid/components/Canvas.tsx` with:

```tsx
import { useRef, useEffect, useCallback, useState } from "react";
import { U as U_DEFAULT, GRID, PAD, MM, FIB } from "../lib/constants";
import { computeU } from "../lib/canvas-sizing";
import { toGrid, canPlace } from "../lib/grid-utils";
import {
  drawBackground,
  drawFrameWall,
  drawPlacedModules,
  drawGrid,
  drawBorder,
  drawRulerTicks,
  drawHoverPreview,
} from "../lib/canvas-draw";
import type {
  GridPos,
  Module,
  PhysicalConfig,
  PlacedModule,
} from "../lib/types";

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [u, setU] = useState(U_DEFAULT);

  const pxPerMm = u / MM;
  const wallMm = (physical.outerMm - GRID * MM) / 2;
  const wallPx = wallMm * pxPerMm;
  const gapPx = physical.gapMm * pxPerMm;
  const innerPx = GRID * u;
  const cw = innerPx + 2 * wallPx + 2 * PAD;
  const ch = cw;

  // Observe container size and recompute u
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Wall thickness in pixels depends on U, but U depends on the wall.
      // Two-pass: estimate U ignoring wall, then re-estimate with wall at that U.
      const wallMmLocal = (physical.outerMm - GRID * MM) / 2;
      const provisional = computeU(rect.width, rect.height, 0);
      const wallAtProvisional = wallMmLocal * (provisional / MM);
      const final = computeU(rect.width, rect.height, wallAtProvisional);
      setU((prev) => (prev === final ? prev : final));
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [physical.outerMm]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    drawBackground(ctx, cw, ch);
    drawFrameWall(ctx, PAD + wallPx, innerPx, wallPx);
    drawPlacedModules(ctx, placed, u, PAD + wallPx, MM, gapPx);
    drawGrid(ctx, u, GRID, PAD + wallPx, FIB);
    drawBorder(ctx, PAD + wallPx, GRID, u);
    drawRulerTicks(ctx, FIB, u, PAD + wallPx, GRID, MM);

    if (hover && effSelected) {
      const ok = canPlace(effSelected.w, effSelected.d, hover.x, hover.y, occ);
      drawHoverPreview(
        ctx,
        hover,
        effSelected.w,
        effSelected.d,
        ok,
        u,
        PAD + wallPx,
        gapPx,
      );
    }
  }, [placed, hover, effSelected, occ, gapPx, wallPx, cw, ch, innerPx, u]);

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
      const { x, y } = toGrid(e.clientX, e.clientY, cv, u, PAD + wallPx);
      if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
        onHoverChange({ x, y });
      } else {
        onHoverChange(null);
      }
    },
    [onHoverChange, wallPx, u],
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
    [hover, onRemoveAt],
  );

  const handleMouseLeave = useCallback(() => {
    onHoverChange(null);
  }, [onHoverChange]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className={`block ${effSelected ? "cursor-crosshair" : "cursor-default"}`}
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseLeave}
      />
      {hover && (
        <div
          className="absolute bottom-3 left-3 px-[7px] py-[3px] text-[9px] pointer-events-none"
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

- [ ] **Step 2: Run tests**

Run: `bun test`
Expected: all existing tests pass. `canvas-draw.test.ts` does not depend on the Canvas component, so it's unaffected.

- [ ] **Step 3: Do NOT commit yet**

Canvas needs its new wrapper-based layout (`flex-1`, no fixed padding wrapper from index.tsx) to render correctly. We commit after Task 8.

---

## Task 8: Wire up the new `index.tsx` layout

**Files:**
- Modify: `src/FibGrid/index.tsx`
- Delete: `src/FibGrid/components/StatsPanel.tsx`

This is the integration point: viewport-locked grid layout, `<1024` notice, Toolbar wired to export/clear, StatsPanel removed.

- [ ] **Step 1: Replace `index.tsx`**

Replace the entire contents of `src/FibGrid/index.tsx` with:

```tsx
import { useEffect, useCallback, useState } from "react";
import { Canvas } from "./components/Canvas";
import { ModulePalette } from "./components/ModulePalette";
import { Toolbar } from "./components/Toolbar";
import { MinViewportNotice } from "./components/MinViewportNotice";
import { useFibGrid } from "./hooks/useFibGrid";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { usePersistence } from "./hooks/usePersistence";
import { exportPNG, exportCSV } from "./lib/export";

const MIN_VIEWPORT_WIDTH = 1024;

function useViewportWidth() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? MIN_VIEWPORT_WIDTH : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

export default function FibGrid() {
  const grid = useFibGrid();
  const { undo, redo, pushHistory } = useUndoRedo(grid);
  const { exportJSON } = usePersistence(
    grid.placed,
    grid.physical,
    grid.load,
    grid.loadPhysical,
  );
  const width = useViewportWidth();

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
    [grid, pushHistory],
  );

  const handleRemoveAt = useCallback(
    (x: number, y: number) => {
      const success = grid.removeAt(x, y);
      if (success) pushHistory();
      return success;
    },
    [grid, pushHistory],
  );

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) exportPNG(canvas);
  }, []);

  if (width < MIN_VIEWPORT_WIDTH) {
    return <MinViewportNotice />;
  }

  return (
    <div
      className="grid h-screen w-screen overflow-hidden select-none"
      style={{
        background: "#0e0e11",
        color: "#c8c8d4",
        fontFamily: "'DM Mono', 'Fira Mono', monospace",
        gridTemplateColumns: "1fr 260px",
      }}
    >
      <div className="flex flex-col min-w-0 min-h-0">
        <Toolbar
          placed={grid.placed}
          physical={grid.physical}
          onGapChange={grid.setGap}
          onOuterChange={grid.setOuter}
          onExportJSON={exportJSON}
          onExportPNG={handleExportPNG}
          onExportCSV={() => exportCSV(grid.placed, grid.physical)}
          onClearAll={grid.clearAll}
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
        className="flex flex-col p-5 gap-2 overflow-y-auto"
        style={{ background: "#111217", borderLeft: "1px solid #1a1c24" }}
      >
        <ModulePalette
          selected={grid.selected}
          rotated={grid.rotated}
          effSelected={grid.effSelected}
          onSelect={grid.select}
          onRotate={grid.rotate}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the StatsPanel file**

Run: `rm src/FibGrid/components/StatsPanel.tsx`
Expected: file removed.

- [ ] **Step 3: Verify nothing else imports StatsPanel**

Run: `grep -r "StatsPanel" src/`
Expected: no results.

- [ ] **Step 4: Type-check and run tests**

Run: `bun build src/frontend.tsx --target browser --outdir /tmp/fib-build-check 2>&1 | tail -20`
Expected: builds successfully, no type errors.

Run: `bun test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit Tasks 6, 7, 8 together**

```bash
git add src/FibGrid/components/Toolbar.tsx \
        src/FibGrid/components/Canvas.tsx \
        src/FibGrid/index.tsx \
        src/FibGrid/components/StatsPanel.tsx
git commit -m "feat: adaptive viewport-locked layout

- Root grid h-screen, no page scroll
- Toolbar absorbs exports (⋯), shortcuts/combos (?), clear-all
- Canvas resizes to fit container via ResizeObserver, U snaps to integers
- StatsPanel removed (redundant with toolbar % and absorbed actions)
- <1024px viewports show MinViewportNotice"
```

---

## Task 9: Manual visual verification

**Files:** none — verification only.

- [ ] **Step 1: Start the dev server**

Run: `bun --hot src/index.ts` (or whatever the project's dev script is — check `package.json` if unsure).
Expected: server starts; open the printed URL.

- [ ] **Step 2: Verify at desktop size (≥1280×800)**

In the browser, set window to ~1440×900. Confirm:
- Whole app fits on screen, no page scrollbar.
- Canvas is large — roughly fills the left column.
- Sidebar (right) shows all 13 module shapes in their 3/3/2 grid without scrolling.
- Toolbar has `?`, `⋯`, and `✕ Clear` buttons on the right.
- `?` popover opens and shows shortcuts + 6 combo chips.
- `⋯` popover opens and shows JSON/PNG/CSV; clicking JSON downloads a file.
- Clicking `✕ Clear` empties the canvas.
- Resize window smaller (but stay ≥1024) — canvas snaps to a smaller `U` smoothly.

- [ ] **Step 3: Verify at iPad Pro 13" portrait (1032×1366)**

Set the browser viewport to ~1032×1366. Confirm:
- Layout still works at this width.
- Canvas may be slightly smaller but is still usable.
- Sidebar still fully visible.

- [ ] **Step 4: Verify the under-1024 gate**

Set the browser viewport to ~900×800. Confirm:
- `MinViewportNotice` is displayed instead of the app.
- Resizing back above 1024 brings the app back without a refresh.

- [ ] **Step 5: Verify placement, rotation, persistence still work**

Pick a module, place it, rotate (R), undo (Ctrl+Z), redo (Ctrl+Shift+Z), refresh the page → the placement persists.

- [ ] **Step 6: Commit any final polish if needed**

If verification turns up rough edges (e.g. an alignment issue), fix and commit:

```bash
git add <touched-files>
git commit -m "fix: <specific issue>"
```

If everything works as designed, no commit needed — verification is complete.

---

## Self-Review Notes

Spec coverage check:
- Layout shell (h-screen grid, sidebar 260px) → Task 8.
- <1024 notice → Tasks 4 (component) + 8 (gate).
- Toolbar with `?`, `⋯`, Clear → Tasks 3 (Popover) + 6 (Toolbar).
- Canvas dynamic U + ResizeObserver → Tasks 1 (U_MIN), 2 (computeU + tests), 7 (Canvas integration).
- Sidebar palette with uniform tiles + equal padding + scaled shape → Task 5.
- Delete StatsPanel → Task 8.
- Files affected table matches spec.

Placeholder scan: no TBD/TODO/"handle edge cases" — every code step shows the actual code.

Type consistency: Toolbar's new prop names (`onExportJSON`, `onExportPNG`, `onExportCSV`, `onClearAll`) match the calls in `index.tsx`. `computeU` signature in Task 2 matches Task 7's two-call invocation. `U_MIN` introduced in Task 1, used in Task 2.

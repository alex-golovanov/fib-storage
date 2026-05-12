# Fib Storage Simulator — Design Spec

**Date:** 2026-05-12  
**Scope:** Full integration of FibGrid canvas-based layout tool into existing Bun+React+Tailwind project with Tailwind conversion, persistence, undo/redo, touch support, export, and canvas performance optimizations.

---

## 1. Overview

A 238×238 mm (34×34 unit) Fibonacci-based storage grid simulator where users place modular storage units of Fibonacci dimensions. The tool provides visual placement with collision detection, row combination hints, fill statistics, and advanced features like persistence, undo/redo, and export.

**Key Constraints:**
- Integrate into existing `bun-react-template` (Bun + React 19 + Tailwind CSS v4)
- Convert all inline styles to Tailwind utility classes
- Maintain canvas-based rendering for grid and modules
- Support both desktop (mouse) and mobile (touch) input

---

## 2. Architecture

### 2.1 File Structure

```
src/
├── App.tsx                          # Mounts FibGrid, no logic
├── index.html                       # Updated title + DM Mono font
├── index.css                        # Tailwind imports + Fib CSS custom properties
├── FibGrid/
│   ├── index.tsx                    # Main orchestrator component
│   ├── hooks/
│   │   ├── useFibGrid.ts            # Core state: placed[], selected, rotated, hover
│   │   ├── useUndoRedo.ts           # History stack + keyboard shortcuts
│   │   └── usePersistence.ts        # localStorage auto-save/load
│   ├── components/
│   │   ├── Canvas.tsx               # Canvas element + mouse/touch handlers
│   │   ├── ModulePalette.tsx        # Right sidebar: module selection buttons
│   │   ├── StatsPanel.tsx           # Bottom: stats grid + clear + export buttons
│   │   └── Toolbar.tsx              # Top: title, dimensions, fill percentage, combos
│   └── lib/
│       ├── constants.ts             # U, GRID, PAD, FIB, MODULES, PALETTE
│       ├── types.ts                 # TypeScript interfaces
│       ├── canvas-draw.ts           # All canvas draw operations (pure functions)
│       ├── grid-utils.ts            # Occupancy map, collision detection, coordinate mapping
│       └── export.ts                # JSON export, PNG export, CSV export
```

### 2.2 Component Hierarchy

```
App
└── FibGrid (index.tsx)
    ├── Toolbar
    ├── Canvas
    ├── ModulePalette
    └── StatsPanel
```

**State flow:** `useFibGrid` → prop-drilled to sub-components. Hooks compose: `useUndoRedo` wraps `useFibGrid`, `usePersistence` wraps `useUndoRedo`.

---

## 3. State Management

### 3.1 Core State (`useFibGrid`)

```typescript
interface PlacedModule {
  pid: string;           // Unique ID (timestamp + random)
  w: number;             // Width in units
  d: number;             // Depth in units
  x: number;             // Grid X position
  y: number;             // Grid Y position
  color: string;         // Hex color from PALETTE
}

interface Module {
  id: string;
  w: number;
  d: number;
  cat: "narrow" | "medium" | "large";
}

interface FibGridState {
  placed: PlacedModule[];
  selected: Module | null;
  rotated: boolean;
  hover: { x: number; y: number } | null;
  colorIndex: number;
}

// Actions:
type Action =
  | { type: "PLACE"; w: number; d: number; x: number; y: number }
  | { type: "REMOVE_AT"; x: number; y: number }
  | { type: "SELECT"; module: Module }
  | { type: "CLEAR_SELECTION" }
  | { type: "ROTATE" }
  | { type: "CLEAR_ALL" }
  | { type: "SET_HOVER"; hover: { x: number; y: number } | null }
  | { type: "LOAD"; placed: PlacedModule[] };
```

**Placement rules:**
- Check bounds: `0 <= x < GRID`, `0 <= y < GRID`, `x+w <= GRID`, `y+d <= GRID`
- Check collisions via occupancy map (2D array of `string | null`)
- Assign color from `PALETTE[colorIndex % PALETTE.length]`
- Increment `colorIndex` after each placement

### 3.2 Undo/Redo (`useUndoRedo`)

- Stack of `PlacedModule[][]` snapshots (max 50)
- Push debounced 300ms after last action (prevents spam on rapid placements)
- Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Shift+Z` / `Ctrl+Y` (redo)
- History cleared on `CLEAR_ALL`

```typescript
interface UndoRedoState {
  past: PlacedModule[][];
  present: PlacedModule[];
  future: PlacedModule[][];
}
```

### 3.3 Persistence (`usePersistence`)

- localStorage key: `fib-grid-layout`
- Schema: `{ version: 1, placed: PlacedModule[], timestamp: number }`
- Auto-save on every `placed` change (with 1s debounce)
- Load on mount: validate schema version, migrate if needed
- Toast notification on load success/failure
- Graceful handling of quota exceeded (catch + offer export)

---

## 4. Canvas Rendering

### 4.1 Draw Pipeline (`canvas-draw.ts`)

All canvas operations are pure functions accepting `(ctx, params)`:

```typescript
function drawBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number): void
function drawGrid(ctx: CanvasRenderingContext2D, u: number, grid: number, pad: number, fib: number[]): void
function drawPlacedModules(ctx: CanvasRenderingContext2D, placed: PlacedModule[], u: number, pad: number, mm: number): void
function drawHoverPreview(ctx: CanvasRenderingContext2D, hover: {x,y}, eff: Module, canPlace: boolean, u: number, pad: number): void
function drawRulerTicks(ctx: CanvasRenderingContext2D, fib: number[], u: number, pad: number, grid: number, mm: number): void
function drawBorder(ctx: CanvasRenderingContext2D, pad: number, grid: number, u: number): void
```

### 4.2 Performance Optimizations

1. **Offscreen Grid Cache**: Pre-render static grid lines to an offscreen `<canvas>` on init. Composite onto main canvas each frame instead of redrawing 34 lines.
2. **Dirty Rect Tracking**: Only redraw regions that changed:
   - Full redraw on placement/removal (module bounding box + adjacent grid)
   - Partial redraw on hover (previous hover rect + new hover rect)
3. **RAF Throttling**: Hover updates batched via `requestAnimationFrame` instead of per-mousemove
4. **Memoized Occupancy**: `useMemo(() => buildOcc(placed), [placed])` — only rebuild when modules change, not on hover

### 4.3 Module Visual Style

- Fill: `color + "28"` (16% opacity)
- Border: `color + "cc"` (80% opacity), 1.5px
- Diagonal hatch: `color + "18"` (10% opacity), 0.5px lines, 8px step
- Label: Centered text `{w*MM}×{d*MM}`, font scales to `min(pw,ph)`, min 7px max 11px, weight 600
- Only render label if `min(pw, ph) >= 22px`

### 4.4 Hover Preview Style

- Valid placement: Fill `#e8a23c18`, stroke `#e8a23c`, dashed `[5,3]`
- Invalid placement: Fill `#e05c6e18`, stroke `#e05c6e`, dashed `[5,3]`

---

## 5. Interaction Design

### 5.1 Desktop (Mouse)

| Action | Behavior |
|--------|----------|
| Left-click canvas (with selection) | Place module at hover position if valid |
| Right-click canvas | Remove module at hover position |
| Mouse move over canvas | Update hover position, show mm tooltip |
| `R` / `r` key | Rotate selected module |
| `Escape` key | Clear selection |
| `Ctrl+Z` | Undo last placement/removal |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |

### 5.2 Mobile (Touch)

| Action | Behavior |
|--------|----------|
| Tap canvas (with selection) | Place module at tap position if valid |
| Two-finger tap canvas | Rotate selected module |
| Long-press canvas (500ms) | Remove module at position (context menu alternative) |
| Tap module palette item | Select module |

### 5.3 Coordinate Mapping

```typescript
function toGrid(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  u: number,
  pad: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (clientX - rect.left) * scaleX;
  const cy = (clientY - rect.top) * scaleY;
  return {
    x: Math.floor((cx - pad) / u),
    y: Math.floor((cy - pad) / u),
  };
}
```

---

## 6. UI Components

### 6.1 Toolbar (Top Bar)

- Left: Title "φ Storage Grid", subtitle "238 × 238 mm", meta "34u × 34u · u = 7 mm"
- Right: Large fill percentage display (e.g., "42%" with "filled" label)
- Tailwind: `flex justify-between items-baseline`, title uses `text-[11px] uppercase tracking-[2px]` for subtitle style

### 6.2 Canvas Area

- `<canvas>` element with `cursor-crosshair` when module selected, `cursor-default` otherwise
- Tooltip overlay: absolute-positioned div showing `x*MM, y*MM mm` on hover
- Max-width: `100%` to prevent overflow on small screens
- Pixelated rendering: `image-rendering: pixelated`

### 6.3 Module Palette (Right Sidebar)

- Fixed width 260px, full height, `overflow-y-auto`
- Sections: "narrow", "medium", "large" — each with category header
- Each module button: `flex justify-between`, left label in mm, right label in units
- Active state: background `#1e2030`, border `#e8a23c44`, text `#e8a23c`
- Hover state: background `#181a22`, text `#b8bacc`
- Selected module detail panel below palette: shows dimensions, mini preview, rotate/cancel buttons

### 6.4 Stats Panel (Bottom)

- 2×2 grid: Modules count, Filled u², Empty u², Fill %
- Each stat card: background `#0e0e11`, border `#1a1c24`, padding
- Clear All button: full width, danger hover state (border → `#e05c6e66`, text → `#e05c6e`)
- Export buttons: "Export JSON", "Export PNG", "Export CSV"

### 6.5 Row Combos (Below Canvas)

- Header: "Valid row combos (sum = 34u)"
- Tags: each combo as a pill/badge with mm breakdown in muted text
- Background `#1a1c24`, border `#2e3040`, text `#888aaa`

---

## 7. Tailwind Integration

### 7.1 CSS Custom Properties

Define in `src/index.css` after `@import "tailwindcss"`:

```css
:root {
  --fib-bg: #0e0e11;
  --fib-surface: #111217;
  --fib-surface-hover: #181a22;
  --fib-surface-active: #1e2030;
  --fib-fg: #c8c8d4;
  --fib-fg-muted: #888aaa;
  --fib-fg-dim: #555769;
  --fib-fg-subtle: #44475a;
  --fib-fg-faint: #333547;
  --fib-accent: #e8a23c;
  --fib-accent-alpha: rgba(232, 162, 60, 0.27);
  --fib-danger: #e05c6e;
  --fib-grid: #1a1c24;
  --fib-grid-fib: #2e3040;
  --fib-border: #44475a;
}
```

### 7.2 Font Loading

Add Google Fonts link to `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

Set `font-family: 'DM Mono', monospace` via Tailwind `font-mono` or custom utility.

### 7.3 Tailwind Class Mapping Examples

| Inline Style | Tailwind Equivalent |
|--------------|---------------------|
| `background: "#0e0e11"` | `bg-[var(--fib-bg)]` or `bg-[#0e0e11]` |
| `color: "#c8c8d4"` | `text-[var(--fib-fg)]` |
| `fontSize: 11` | `text-[11px]` |
| `display: "flex", gap: 0` | `flex gap-0` |
| `padding: 24` | `p-6` (24px = 1.5rem = 6×0.25rem) |
| `userSelect: "none"` | `select-none` |

### 7.4 Avoiding Conflicts

- Remove global styles from `src/index.css` that interfere (e.g., `body { margin, padding }` defaults from template)
- Add `font-mono` to FibGrid root container instead of global body
- Use `isolate` or `isolation: isolate` on FibGrid container to prevent z-index leakage

---

## 8. Export Functionality

### 8.1 JSON Export

```typescript
interface LayoutExport {
  version: 1;
  gridSize: 34;
  unitMm: 7;
  modules: Array<{
    id: string;
    width: number;      // mm
    depth: number;      // mm
    x: number;          // grid units
    y: number;          // grid units
    color: string;
  }>;
  stats: {
    totalModules: number;
    filledUnits: number;
    fillPercentage: number;
  };
}
```

Trigger: download as `fib-layout-YYYY-MM-DD.json`.

### 8.2 PNG Export

- Use `canvas.toBlob()` → create `URL.createObjectURL()` → trigger `<a>` download
- Filename: `fib-layout-YYYY-MM-DD.png`
- Include current grid state (placed modules + grid lines)

### 8.3 CSV Export

```csv
id,width_mm,depth_mm,x,y,color
m01,21,91,0,0,#e8a23c
```

---

## 9. Error Handling

| Scenario | Handling |
|----------|----------|
| Canvas context lost | Detect `webglcontextlost`-equivalent event, reinitialize canvas and redraw |
| localStorage quota exceeded | Catch `QuotaExceededError`, show toast "Storage full — export your layout", disable auto-save |
| Invalid JSON import | Validate against zod schema or manual checks, show error toast with specific issue |
| Touch device detection | Use `'ontouchstart' in window` to conditionally show touch hints |
| Canvas not supported | Fallback message: "Canvas not supported in this browser" |

---

## 10. Testing Strategy

### 10.1 Unit Tests (`bun test`)

- **`grid-utils.ts`**: 
  - `buildOcc([])` → all nulls
  - `buildOcc([module])` → correct occupied cells
  - `canPlace()` → boundary checks, collision checks
- **`useUndoRedo`**: 
  - Place → undo → placed empty
  - Place → undo → redo → placed restored
  - Max 50 history items
- **`usePersistence`**: 
  - Mock localStorage, assert save/load roundtrip
  - Schema migration test

### 10.2 Integration Tests

- Place module at (0,0) → canvas pixel check (mock 2D context, assert `fillRect` called with expected coords)
- Remove module → occupancy map null at previous position

---

## 11. Dependencies

No new runtime dependencies. Existing stack sufficient:
- `react`, `react-dom` — UI framework
- `tailwindcss` — styling (already configured with `bun-plugin-tailwind`)
- `lucide-react` — icons for export buttons, rotate icon

---

## 12. Migration Plan

1. Create `FibGrid/` directory structure
2. Extract constants and types to `lib/`
3. Implement `canvas-draw.ts` with pure draw functions
4. Implement `grid-utils.ts` with occupancy/collision logic
5. Implement hooks (`useFibGrid` → `useUndoRedo` → `usePersistence`)
6. Build sub-components (`Canvas`, `ModulePalette`, `StatsPanel`, `Toolbar`)
7. Compose in `FibGrid/index.tsx`
8. Update `App.tsx` to mount `FibGrid`
9. Update `index.html` (title, fonts)
10. Update `index.css` (custom properties, remove conflicting global styles)
11. Remove boilerplate files (`APITester.tsx`, `react.svg`)
12. Test with `bun dev`

---

## 13. Open Questions (None)

All questions resolved during brainstorming:
- Styling approach: Tailwind conversion (Option B) ✓
- Feature scope: Full superpowers (Option C) ✓
- Architecture: Balanced component + hooks (Option C) ✓

---

## Approval

Design approved by user on 2026-05-12.

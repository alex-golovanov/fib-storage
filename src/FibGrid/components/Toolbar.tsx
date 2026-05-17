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

import { GRID, MM, COMBOS } from "../lib/constants";
import type { PlacedModule } from "../lib/types";

interface ToolbarProps {
  placed: PlacedModule[];
}

export function Toolbar({ placed }: ToolbarProps) {
  const filledU = placed.reduce((s, p) => s + p.w * p.d, 0);
  const pct = Math.round((filledU / (GRID * GRID)) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-baseline">
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

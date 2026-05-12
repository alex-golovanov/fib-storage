import { GRID } from "../lib/constants";
import type { PlacedModule } from "../lib/types";

interface StatsPanelProps {
  placed: PlacedModule[];
  onClearAll: () => void;
  onExportJSON: () => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
}

export function StatsPanel({
  placed,
  onClearAll,
  onExportJSON,
  onExportPNG,
  onExportCSV,
}: StatsPanelProps) {
  const filledU = placed.reduce((s, p) => s + p.w * p.d, 0);
  const pct = Math.round((filledU / (GRID * GRID)) * 100);

  const stats = [
    ["Modules", placed.length],
    ["Filled", `${filledU} u²`],
    ["Empty", `${GRID * GRID - filledU} u²`],
    ["Fill %", `${pct}%`],
  ] as const;

  return (
    <div className="mt-auto pt-3.5" style={{ borderTop: "1px solid #1a1c24" }}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map(([k, v]) => (
          <div key={k} className="p-2" style={{ background: "#0e0e11", border: "1px solid #1a1c24" }}>
            <div className="text-[8px] tracking-[1px]" style={{ color: "#44475a" }}>
              {k}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: "#c8c8d4" }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={onExportJSON}
          className="flex-1 text-[9px] tracking-[1px] cursor-pointer py-2"
          style={{ background: "#1e2030", border: "1px solid #2e3040", color: "#888aaa" }}
        >
          JSON
        </button>
        <button
          onClick={onExportPNG}
          className="flex-1 text-[9px] tracking-[1px] cursor-pointer py-2"
          style={{ background: "#1e2030", border: "1px solid #2e3040", color: "#888aaa" }}
        >
          PNG
        </button>
        <button
          onClick={onExportCSV}
          className="flex-1 text-[9px] tracking-[1px] cursor-pointer py-2"
          style={{ background: "#1e2030", border: "1px solid #2e3040", color: "#888aaa" }}
        >
          CSV
        </button>
      </div>

      <button
        onClick={onClearAll}
        className="w-full text-[10px] tracking-[1px] cursor-pointer py-2 transition-colors duration-100"
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
        ✕ CLEAR ALL
      </button>
    </div>
  );
}

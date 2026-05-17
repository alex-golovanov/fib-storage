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

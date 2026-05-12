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
  const { exportJSON } = usePersistence(grid.placed, grid.load);

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
        <Toolbar placed={grid.placed} />
        <Canvas
          placed={grid.placed}
          hover={grid.hover}
          effSelected={grid.effSelected}
          occ={grid.occ}
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
          onExportCSV={() => exportCSV(grid.placed)}
        />
      </div>
    </div>
  );
}

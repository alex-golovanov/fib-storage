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
  const { exportJSON } = usePersistence(grid.placed, grid.physical, grid.load, grid.loadPhysical);
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

  const handleClearAll = useCallback(() => {
    if (grid.placed.length === 0) return;
    pushHistory();
    grid.clearAll();
  }, [grid, pushHistory]);

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
          onClearAll={handleClearAll}
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

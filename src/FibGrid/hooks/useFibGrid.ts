import { useState, useCallback, useMemo } from "react";
import { PALETTE } from "../lib/constants";
import { buildOcc, canPlace } from "../lib/grid-utils";
import type { Module, PlacedModule, GridPos } from "../lib/types";

export interface FibGridState {
  placed: PlacedModule[];
  selected: Module | null;
  rotated: boolean;
  hover: GridPos | null;
  colorIndex: number;
}

export function useFibGrid() {
  const [placed, setPlaced] = useState<PlacedModule[]>([]);
  const [selected, setSelected] = useState<Module | null>(null);
  const [rotated, setRotated] = useState(false);
  const [hover, setHover] = useState<GridPos | null>(null);
  const [colorIndex, setColorIndex] = useState(0);

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

  return {
    placed,
    selected,
    rotated,
    hover,
    colorIndex,
    effSelected,
    occ,
    place,
    removeAt,
    select,
    rotate,
    clearAll,
    setHoverPos,
    load,
  };
}

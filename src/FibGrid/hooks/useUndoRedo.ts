import { useState, useCallback } from "react";
import type { PlacedModule } from "../lib/types";

const MAX_HISTORY = 50;

export function useUndoRedo(gridState: {
  placed: PlacedModule[];
  load: (modules: PlacedModule[]) => void;
}) {
  const [past, setPast] = useState<PlacedModule[][]>([]);
  const [future, setFuture] = useState<PlacedModule[][]>([]);
  const pushHistory = useCallback(() => {
    setPast((prev) => {
      const next = [...prev, gridState.placed];
      return next.length > MAX_HISTORY ? next.slice(1) : next;
    });
    setFuture([]);
  }, [gridState.placed]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [gridState.placed, ...prev]);
    gridState.load(previous);
  }, [past, gridState]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    if (!next) return;
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, gridState.placed]);
    gridState.load(next);
  }, [future, gridState]);

  return {
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    pushHistory,
  };
}

import { useState, useCallback, useRef } from "react";
import type { PlacedModule } from "../lib/types";

const MAX_HISTORY = 50;

export function useUndoRedo(gridState: {
  placed: PlacedModule[];
  load: (modules: PlacedModule[]) => void;
}) {
  const [past, setPast] = useState<PlacedModule[][]>([]);
  const [future, setFuture] = useState<PlacedModule[][]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlacedRef = useRef(gridState.placed);

  const pushHistory = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPast((prev) => {
        const next = [...prev, lastPlacedRef.current];
        return next.length > MAX_HISTORY ? next.slice(1) : next;
      });
      lastPlacedRef.current = gridState.placed;
      setFuture([]);
    }, 300);
  }, [gridState.placed]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [gridState.placed, ...prev]);
    gridState.load(previous);
    lastPlacedRef.current = previous;
  }, [past, gridState]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, gridState.placed]);
    gridState.load(next);
    lastPlacedRef.current = next;
  }, [future, gridState]);

  return { undo, redo, canUndo: past.length > 0, canRedo: future.length > 0, pushHistory };
}

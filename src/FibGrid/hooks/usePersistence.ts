import { useEffect, useCallback } from "react";
import type { PlacedModule } from "../lib/types";

const STORAGE_KEY = "fib-grid-layout";
const SCHEMA_VERSION = 1;

interface StoredLayout {
  version: number;
  placed: PlacedModule[];
  timestamp: number;
}

export function usePersistence(
  placed: PlacedModule[],
  load: (modules: PlacedModule[]) => void
) {
  useEffect(() => {
    const data: StoredLayout = {
      version: SCHEMA_VERSION,
      placed,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save layout:", e);
    }
  }, [placed]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: StoredLayout = JSON.parse(raw);
      if (data.version !== SCHEMA_VERSION) {
        console.warn("Layout schema mismatch, ignoring saved data");
        return;
      }
      if (data.placed && Array.isArray(data.placed)) {
        load(data.placed);
      }
    } catch (e) {
      console.warn("Failed to load layout:", e);
    }
  }, []);

  const exportJSON = useCallback(() => {
    const data = {
      version: SCHEMA_VERSION,
      gridSize: 34,
      unitMm: 7,
      modules: placed.map((p) => ({
        id: p.pid,
        width: p.w * 7,
        depth: p.d * 7,
        x: p.x,
        y: p.y,
        color: p.color,
      })),
      stats: {
        totalModules: placed.length,
        filledUnits: placed.reduce((s, p) => s + p.w * p.d, 0),
        fillPercentage: Math.round(
          (placed.reduce((s, p) => s + p.w * p.d, 0) / (34 * 34)) * 100
        ),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [placed]);

  return { exportJSON };
}

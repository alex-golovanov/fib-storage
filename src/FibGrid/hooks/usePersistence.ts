import { useCallback, useEffect, useRef } from "react";
import { GRID, MM } from "../lib/constants";
import type { PhysicalConfig, PlacedModule } from "../lib/types";

const STORAGE_KEY = "fib-grid-layout";
const SCHEMA_VERSION = 2;
const SAVE_DEBOUNCE_MS = 1000;

export interface StoredLayoutV1 {
  version: 1;
  placed: PlacedModule[];
  timestamp: number;
}

export interface StoredLayoutV2 {
  version: 2;
  placed: PlacedModule[];
  physical: PhysicalConfig;
  timestamp: number;
}

type StoredLayout = StoredLayoutV1 | StoredLayoutV2;

export function _migrate(data: StoredLayout): StoredLayoutV2 {
  if (data.version === 2) return data;

  return {
    version: 2,
    placed: data.placed,
    physical: { gapMm: 0, outerMm: GRID * MM },
    timestamp: data.timestamp,
  };
}

export function _buildExportJson(placed: PlacedModule[], physical: PhysicalConfig) {
  const wallMm = (physical.outerMm - GRID * MM) / 2;
  return {
    version: 2,
    gridSize: GRID,
    unitMm: MM,
    physical: {
      gapMm: physical.gapMm,
      outerMm: physical.outerMm,
      wallMm,
    },
    modules: placed.map((p) => ({
      id: p.pid,
      nominal_mm: { w: p.w * MM, d: p.d * MM },
      built_mm: {
        w: p.w * MM - physical.gapMm,
        d: p.d * MM - physical.gapMm,
      },
      position_mm: {
        x: p.x * MM + physical.gapMm / 2,
        y: p.y * MM + physical.gapMm / 2,
      },
      x: p.x,
      y: p.y,
      color: p.color,
    })),
    stats: {
      totalModules: placed.length,
      filledUnits: placed.reduce((s, p) => s + p.w * p.d, 0),
      fillPercentage: Math.round((placed.reduce((s, p) => s + p.w * p.d, 0) / (GRID * GRID)) * 100),
    },
  };
}

export function usePersistence(
  placed: PlacedModule[],
  physical: PhysicalConfig,
  load: (modules: PlacedModule[]) => void,
  loadPhysical: (cfg: PhysicalConfig) => void,
) {
  const hasHydratedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    saveTimeoutRef.current = setTimeout(() => {
      const data: StoredLayoutV2 = {
        version: SCHEMA_VERSION,
        placed,
        physical,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("Failed to save layout:", e);
      } finally {
        saveTimeoutRef.current = null;
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [placed, physical]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredLayout;
      if (parsed.version !== 1 && parsed.version !== 2) {
        console.warn("Layout schema mismatch, ignoring saved data");
        return;
      }
      const data = _migrate(parsed);
      if (data.placed && Array.isArray(data.placed)) {
        load(data.placed);
        loadPhysical(data.physical);
      }
    } catch (e) {
      console.warn("Failed to load layout:", e);
    } finally {
      hasHydratedRef.current = true;
    }
    // Run-once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportJSON = useCallback(() => {
    const data = _buildExportJson(placed, physical);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [placed, physical]);

  return { exportJSON };
}

import { GRID } from "./constants";
import type { PlacedModule, GridPos } from "./types";

export function buildOcc(placed: PlacedModule[]): (string | null)[][] {
  const occ = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, (): string | null => null),
  );

  for (const p of placed) {
    for (let dy = 0; dy < p.d; dy++) {
      const row = occ[p.y + dy];
      if (!row) continue;

      for (let dx = 0; dx < p.w; dx++) {
        if (p.y + dy < GRID && p.x + dx < GRID) {
          row[p.x + dx] = p.pid;
        }
      }
    }
  }
  return occ;
}

export function canPlace(
  w: number,
  d: number,
  gx: number,
  gy: number,
  occ: (string | null)[][],
): boolean {
  if (gx < 0 || gy < 0 || gx + w > GRID || gy + d > GRID) return false;

  for (let dy = 0; dy < d; dy++) {
    const row = occ[gy + dy];
    if (!row) return false;

    for (let dx = 0; dx < w; dx++) {
      if (row[gx + dx] !== null) return false;
    }
  }

  return true;
}

export function toGrid(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  u: number,
  pad: number,
): GridPos {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (clientX - rect.left) * scaleX;
  const cy = (clientY - rect.top) * scaleY;
  return {
    x: Math.floor((cx - pad) / u),
    y: Math.floor((cy - pad) / u),
  };
}

export function findModuleAt(x: number, y: number, occ: (string | null)[][]): string | null {
  if (y < 0 || y >= GRID || x < 0 || x >= GRID) return null;

  return occ[y]?.[x] ?? null;
}

import { GRID, PAD, U_MIN } from "./constants";

export function computeU(
  containerW: number,
  containerH: number,
  wallPx: number,
): number {
  const available = Math.min(containerW, containerH) - 2 * PAD - 2 * wallPx;
  const candidate = Math.floor(available / GRID);
  return Math.max(candidate, U_MIN);
}

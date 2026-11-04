import { expect, test } from "bun:test";
import { GRID } from "./constants";
import { buildOcc, canPlace } from "./grid-utils";
import type { PlacedModule } from "./types";

const mod = (pid: string, w: number, d: number, x: number, y: number): PlacedModule => ({
  pid,
  w,
  d,
  x,
  y,
  color: "#000000",
});

test("buildOcc: empty list yields all-null grid", () => {
  const occ = buildOcc([]);

  expect(occ.length).toBe(GRID);
  expect(occ[0]?.length).toBe(GRID);
  expect(occ.every((row) => row.every((cell) => cell === null))).toBe(true);
});

test("buildOcc: marks exactly the module's cells", () => {
  const occ = buildOcc([mod("a", 3, 2, 1, 1)]);

  expect(occ[1]?.[1]).toBe("a");
  expect(occ[1]?.[3]).toBe("a");
  expect(occ[2]?.[3]).toBe("a");
  expect(occ[0]?.[1]).toBe(null);
  expect(occ[3]?.[1]).toBe(null);
  expect(occ[1]?.[4]).toBe(null);
});

test("canPlace: in-bounds empty grid -> true", () => {
  const occ = buildOcc([]);

  expect(canPlace(5, 5, 0, 0, occ)).toBe(true);
});

test("canPlace: out-of-bounds -> false", () => {
  const occ = buildOcc([]);

  expect(canPlace(5, 5, GRID - 2, 0, occ)).toBe(false);
  expect(canPlace(5, 5, 0, GRID - 2, occ)).toBe(false);
  expect(canPlace(5, 5, -1, 0, occ)).toBe(false);
});

test("canPlace: collision -> false", () => {
  const occ = buildOcc([mod("a", 3, 3, 0, 0)]);

  expect(canPlace(2, 2, 1, 1, occ)).toBe(false);
});

test("canPlace: adjacent to existing -> true (unit space, gap is render-only)", () => {
  const occ = buildOcc([mod("a", 3, 3, 0, 0)]);

  expect(canPlace(2, 2, 3, 0, occ)).toBe(true);
});

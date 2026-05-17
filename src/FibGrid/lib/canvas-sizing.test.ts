import { expect, test } from "bun:test";
import { computeU } from "./canvas-sizing";
import { GRID, PAD, U_MIN } from "./constants";

test("computeU: returns largest integer U that fits in the container", () => {
  // container 800x800, wallPx 0 => available = 800 - 2*PAD = 744
  // floor(744 / 34) = 21
  expect(computeU(800, 800, 0)).toBe(21);
});

test("computeU: uses the smaller dimension when container isn't square", () => {
  // 1200 wide, 600 tall => height is the limit
  // available = 600 - 2*PAD = 544; floor(544/34) = 16
  expect(computeU(1200, 600, 0)).toBe(16);
});

test("computeU: subtracts wall thickness on both sides", () => {
  // 800x800 with 30px wall => available = 800 - 2*PAD - 2*30 = 684
  // floor(684/34) = 20
  expect(computeU(800, 800, 30)).toBe(20);
});

test("computeU: never returns below U_MIN", () => {
  // tiny container — math would give 0, must clamp to U_MIN
  expect(computeU(100, 100, 0)).toBe(U_MIN);
});

test("computeU: returns an integer", () => {
  const result = computeU(1000, 1000, 0);
  expect(Number.isInteger(result)).toBe(true);
});

test("computeU: representative desktop sizes", () => {
  // 1280x800 canvas column (sidebar 260 taken out) => width ~1020, height ~800-toolbar
  // Pass realistic numbers directly.
  expect(computeU(1020, 720, 0)).toBeGreaterThanOrEqual(19);
  expect(computeU(1660, 880, 0)).toBeGreaterThanOrEqual(24);
});

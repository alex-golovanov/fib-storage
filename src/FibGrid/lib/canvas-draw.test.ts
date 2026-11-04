import { expect, test } from "bun:test";
import { drawFrameWall, drawHoverPreview, drawPlacedModules } from "./canvas-draw";
import type { PlacedModule } from "./types";

interface Call {
  method: string;
  args: unknown[];
}

function makeCtx() {
  const calls: Call[] = [];
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "calls") return calls;
      if (
        prop === "save" ||
        prop === "restore" ||
        prop === "beginPath" ||
        prop === "stroke" ||
        prop === "moveTo" ||
        prop === "lineTo" ||
        prop === "fillText" ||
        prop === "setLineDash" ||
        prop === "strokeRect" ||
        prop === "fillRect"
      ) {
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
        };
      }
      return undefined;
    },
    set(_target, prop: string, value: unknown) {
      calls.push({ method: `set:${prop}`, args: [value] });
      return true;
    },
  };

  return new Proxy({}, handler) as CanvasRenderingContext2D & { calls: Call[] };
}

const mod = (pid: string, w: number, d: number, x: number, y: number): PlacedModule => ({
  pid,
  w,
  d,
  x,
  y,
  color: "#aabbcc",
});

test("drawPlacedModules with gapPx=0 fills at nominal cell rect (legacy behavior)", () => {
  const ctx = makeCtx();

  drawPlacedModules(ctx, [mod("a", 2, 2, 0, 0)], 15, 28, 7, 0);

  const fills = ctx.calls.filter((call) => call.method === "fillRect");
  expect(fills.length).toBeGreaterThan(0);

  const firstFill = fills[0];
  expect(firstFill).toBeDefined();

  const [x, y, w, h] = firstFill!.args as [number, number, number, number];
  expect(x).toBeGreaterThanOrEqual(28);
  expect(y).toBeGreaterThanOrEqual(28);
  expect(x + w).toBeLessThanOrEqual(28 + 2 * 15);
  expect(y + h).toBeLessThanOrEqual(28 + 2 * 15);
});

test("drawPlacedModules with gapPx>0 insets the fill rect by gapPx/2 on each side", () => {
  const ctx = makeCtx();

  drawPlacedModules(ctx, [mod("a", 2, 2, 0, 0)], 15, 28, 7, 4);

  const fills = ctx.calls.filter((call) => call.method === "fillRect");
  expect(fills.length).toBeGreaterThanOrEqual(2);

  const actualFill = fills[1];
  expect(actualFill).toBeDefined();

  const [x, y, w, h] = actualFill!.args as [number, number, number, number];
  expect(x).toBe(30);
  expect(y).toBe(30);
  expect(w).toBe(26);
  expect(h).toBe(26);
});

test("drawPlacedModules with gapPx>0 keeps the nominal reserved footprint visible", () => {
  const ctx = makeCtx();

  drawPlacedModules(ctx, [mod("a", 2, 2, 0, 0)], 15, 28, 7, 4);

  const fills = ctx.calls.filter((call) => call.method === "fillRect");
  expect(fills.length).toBe(2);

  const reservedFill = fills[0];
  const actualFill = fills[1];
  expect(reservedFill).toBeDefined();
  expect(actualFill).toBeDefined();

  expect(reservedFill!.args as [number, number, number, number]).toEqual([28, 28, 30, 30]);
  expect(actualFill!.args as [number, number, number, number]).toEqual([30, 30, 26, 26]);
});

test("drawPlacedModules with gapPx>0 labels the built module size", () => {
  const ctx = makeCtx();

  drawPlacedModules(ctx, [mod("a", 2, 2, 0, 0)], 14, 28, 7, 2);

  const labels = ctx.calls.filter((call) => call.method === "fillText");
  expect(labels.length).toBe(1);
  expect(labels[0]?.args[0]).toBe("13×13");
});

test("drawHoverPreview with gapPx>0 insets the preview rect", () => {
  const ctx = makeCtx();

  drawHoverPreview(ctx, { x: 0, y: 0 }, 2, 2, true, 15, 28, 4);

  const fills = ctx.calls.filter((call) => call.method === "fillRect");
  expect(fills.length).toBe(2);

  const actualFill = fills[1];
  expect(actualFill).toBeDefined();

  const [x, y, w, h] = actualFill!.args as [number, number, number, number];
  expect(x).toBe(30);
  expect(y).toBe(30);
  expect(w).toBe(26);
  expect(h).toBe(26);
});

test("drawHoverPreview with gapPx>0 keeps the nominal reserved footprint visible", () => {
  const ctx = makeCtx();

  drawHoverPreview(ctx, { x: 0, y: 0 }, 2, 2, true, 15, 28, 4);

  const fills = ctx.calls.filter((call) => call.method === "fillRect");
  expect(fills.length).toBe(2);

  const reservedFill = fills[0];
  const actualFill = fills[1];
  expect(reservedFill).toBeDefined();
  expect(actualFill).toBeDefined();

  expect(reservedFill!.args as [number, number, number, number]).toEqual([28, 28, 30, 30]);
  expect(actualFill!.args as [number, number, number, number]).toEqual([30, 30, 26, 26]);
});

test("drawFrameWall with wallPx=0 is a no-op", () => {
  const ctx = makeCtx();

  drawFrameWall(ctx, 28, 510, 0);

  const draws = ctx.calls.filter(
    (call) => call.method === "fillRect" || call.method === "strokeRect",
  );
  expect(draws.length).toBe(0);
});

test("drawFrameWall with wallPx>0 fills the wall ring outside the inner area", () => {
  const ctx = makeCtx();

  drawFrameWall(ctx, 28, 510, 10);

  const fills = ctx.calls.filter((call) => call.method === "fillRect");
  expect(fills.length).toBeGreaterThan(0);

  const minX = Math.min(...fills.map((fill) => (fill.args as number[])[0] as number));
  expect(minX).toBe(18);
});

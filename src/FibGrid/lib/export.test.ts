import { expect, test } from "bun:test";
import { buildCsv } from "./export";
import type { PhysicalConfig, PlacedModule } from "./types";

const mod: PlacedModule = {
  pid: "p1",
  w: 3,
  d: 5,
  x: 2,
  y: 4,
  color: "#aabbcc",
};

test("buildCsv header has nominal, built, pos columns", () => {
  const cfg: PhysicalConfig = { gapMm: 0, outerMm: 238 };
  const csv = buildCsv([mod], cfg);
  const [header] = csv.split("\n");

  expect(header).toBe(
    "id,nominal_w_mm,nominal_d_mm,built_w_mm,built_d_mm,x,y,pos_x_mm,pos_y_mm,color",
  );
});

test("buildCsv gap=0: built equals nominal, pos equals x*mm", () => {
  const cfg: PhysicalConfig = { gapMm: 0, outerMm: 238 };
  const csv = buildCsv([mod], cfg);
  const lines = csv.split("\n");

  expect(lines[1]).toBe("p1,21,35,21,35,2,4,14,28,#aabbcc");
});

test("buildCsv gap=1: built shrinks by 1, pos offset by 0.5", () => {
  const cfg: PhysicalConfig = { gapMm: 1, outerMm: 238 };
  const csv = buildCsv([mod], cfg);
  const lines = csv.split("\n");

  expect(lines[1]).toBe("p1,21,35,20,34,2,4,14.5,28.5,#aabbcc");
});

test("buildCsv with multiple modules: one line per module plus header", () => {
  const cfg: PhysicalConfig = { gapMm: 0, outerMm: 238 };
  const m2: PlacedModule = {
    pid: "p2",
    w: 5,
    d: 5,
    x: 10,
    y: 10,
    color: "#112233",
  };
  const csv = buildCsv([mod, m2], cfg);

  expect(csv.split("\n").length).toBe(3);
});

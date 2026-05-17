export const U = 15;
export const GRID = 34;
export const PAD = 28;
export const MM = 7;
export const FIB = [3, 5, 8, 13, 21, 34];

export const MODULES = [
  { id: "m01", w: 3, d: 13, cat: "narrow" as const },
  { id: "m02", w: 5, d: 13, cat: "narrow" as const },
  { id: "m03", w: 8, d: 13, cat: "narrow" as const },
  { id: "m04", w: 3, d: 21, cat: "narrow" as const },
  { id: "m05", w: 5, d: 21, cat: "narrow" as const },
  { id: "m06", w: 8, d: 21, cat: "narrow" as const },
  { id: "m07", w: 13, d: 13, cat: "medium" as const },
  { id: "m08", w: 13, d: 21, cat: "medium" as const },
  { id: "m09", w: 21, d: 13, cat: "medium" as const },
  { id: "m10", w: 21, d: 21, cat: "large" as const },
  { id: "m11", w: 21, d: 34, cat: "large" as const },
  { id: "m12", w: 34, d: 13, cat: "large" as const },
  { id: "m13", w: 34, d: 21, cat: "large" as const },
];

export const PALETTE = [
  "#e8a23c",
  "#5bb8a6",
  "#c46b8a",
  "#6fa3d4",
  "#a07ed4",
  "#78c47a",
  "#d47864",
  "#b8b84a",
  "#64a8c8",
  "#d4906a",
  "#8ac890",
  "#c8788a",
  "#7890c8",
];

export const COMBOS = [
  [[13, 21], "13+21"],
  [[8, 13, 13], "8+13+13"],
  [[5, 8, 21], "5+8+21"],
  [[5, 8, 8, 13], "5+8+8+13"],
  [[3, 5, 5, 8, 13], "3+5+5+8+13"],
  [[5, 5, 3, 8, 13], "5+5+3+8+13"],
] as const;

export const GAP_MM_DEFAULT = 0.3;
export const GAP_MM_MAX = 1.0;
export const GAP_MM_STEP = 0.1;

export const OUTER_MM_DEFAULT = 238;
export const OUTER_MM_MAX = 256;
export const OUTER_MM_STEP = 1;

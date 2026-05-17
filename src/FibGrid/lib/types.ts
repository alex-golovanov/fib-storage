export interface Module {
  id: string;
  w: number;
  d: number;
  cat: "narrow" | "medium" | "large";
}

export interface PlacedModule {
  pid: string;
  w: number;
  d: number;
  x: number;
  y: number;
  color: string;
}

export interface GridPos {
  x: number;
  y: number;
}

export type Category = "narrow" | "medium" | "large";

export interface PhysicalConfig {
  gapMm: number;
  outerMm: number;
}

import { MM } from "./constants";
import type { PhysicalConfig, PlacedModule } from "./types";

export function exportPNG(canvas: HTMLCanvasElement): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function buildCsv(placed: PlacedModule[], physical: PhysicalConfig): string {
  const lines = ["id,nominal_w_mm,nominal_d_mm,built_w_mm,built_d_mm,x,y,pos_x_mm,pos_y_mm,color"];

  for (const p of placed) {
    const nominalW = p.w * MM;
    const nominalD = p.d * MM;
    const builtW = nominalW - physical.gapMm;
    const builtD = nominalD - physical.gapMm;
    const posX = p.x * MM + physical.gapMm / 2;
    const posY = p.y * MM + physical.gapMm / 2;

    lines.push(
      `${p.pid},${nominalW},${nominalD},${builtW},${builtD},${p.x},${p.y},${posX},${posY},${p.color}`,
    );
  }

  return lines.join("\n");
}

export function exportCSV(placed: PlacedModule[], physical: PhysicalConfig): void {
  const csv = buildCsv(placed, physical);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

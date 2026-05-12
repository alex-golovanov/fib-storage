import type { PlacedModule } from "./types";

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

export function exportCSV(placed: PlacedModule[]): void {
  const lines = ["id,width_mm,depth_mm,x,y,color"];
  for (const p of placed) {
    lines.push(`${p.pid},${p.w * 7},${p.d * 7},${p.x},${p.y},${p.color}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fib-layout-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

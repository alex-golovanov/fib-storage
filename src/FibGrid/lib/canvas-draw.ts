import type { PlacedModule } from "./types";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  bgColor: string = "#0e0e11"
): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
}

export function drawPlacedModules(
  ctx: CanvasRenderingContext2D,
  placed: PlacedModule[],
  u: number,
  pad: number,
  mm: number
): void {
  for (const p of placed) {
    const px = pad + p.x * u;
    const py = pad + p.y * u;
    const pw = p.w * u;
    const ph = p.d * u;

    ctx.fillStyle = p.color + "28";
    ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

    ctx.strokeStyle = p.color + "cc";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

    ctx.save();
    ctx.strokeStyle = p.color + "18";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const step = 8;
    for (let t = 0; t < pw + ph; t += step) {
      const x1 = px + Math.max(0, t - ph);
      const y1 = py + Math.min(ph, t);
      const x2 = px + Math.min(pw, t);
      const y2 = py + Math.max(0, t - pw);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.restore();

    const minDim = Math.min(pw, ph);
    if (minDim >= 22) {
      const fs = Math.max(7, Math.min(11, minDim / 4.5));
      ctx.fillStyle = p.color + "ee";
      ctx.font = `600 ${fs}px 'DM Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${p.w * mm}×${p.d * mm}`, px + pw / 2, py + ph / 2);
    }
  }
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  u: number,
  grid: number,
  pad: number,
  fib: number[]
): void {
  for (let i = 0; i <= grid; i++) {
    const isFib = fib.includes(i) || i === 0;
    ctx.strokeStyle = isFib ? "#2e3040" : "#1a1c24";
    ctx.lineWidth = isFib ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(pad + i * u, pad);
    ctx.lineTo(pad + i * u, pad + grid * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, pad + i * u);
    ctx.lineTo(pad + grid * u, pad + i * u);
    ctx.stroke();
  }
}

export function drawBorder(
  ctx: CanvasRenderingContext2D,
  pad: number,
  grid: number,
  u: number
): void {
  ctx.strokeStyle = "#44475a";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad, pad, grid * u, grid * u);
}

export function drawRulerTicks(
  ctx: CanvasRenderingContext2D,
  fib: number[],
  u: number,
  pad: number,
  grid: number,
  mm: number
): void {
  ctx.fillStyle = "#44475a";
  ctx.font = "8px 'DM Mono', monospace";

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const f of fib) {
    ctx.fillText(`${f * mm}`, pad + f * u, pad + grid * u + 4);
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const f of fib) {
    ctx.fillText(`${f * mm}`, pad - 4, pad + f * u);
  }
}

export function drawHoverPreview(
  ctx: CanvasRenderingContext2D,
  hover: { x: number; y: number },
  w: number,
  d: number,
  canPlace: boolean,
  u: number,
  pad: number
): void {
  const hx = pad + hover.x * u;
  const hy = pad + hover.y * u;
  const hw = w * u;
  const hh = d * u;

  ctx.fillStyle = canPlace ? "#e8a23c18" : "#e05c6e18";
  ctx.fillRect(hx, hy, hw, hh);
  ctx.strokeStyle = canPlace ? "#e8a23c" : "#e05c6e";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(hx + 1, hy + 1, hw - 2, hh - 2);
  ctx.setLineDash([]);
}

import type { PlacedModule } from "./types";

function formatBuiltMm(value: number): string {
  const rounded = Number(value.toFixed(1));

  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  bgColor: string = "#0e0e11",
): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
}

export function drawPlacedModules(
  ctx: CanvasRenderingContext2D,
  placed: PlacedModule[],
  u: number,
  pad: number,
  mm: number,
  gapPx: number,
): void {
  const inset = gapPx / 2;
  const gapMm = (gapPx * mm) / u;

  for (const p of placed) {
    const nominalX = pad + p.x * u;
    const nominalY = pad + p.y * u;
    const nominalW = p.w * u;
    const nominalH = p.d * u;
    const px = pad + p.x * u + inset;
    const py = pad + p.y * u + inset;
    const pw = p.w * u - gapPx;
    const ph = p.d * u - gapPx;

    if (gapPx > 0) {
      ctx.fillStyle = p.color + "10";
      ctx.fillRect(nominalX, nominalY, nominalW, nominalH);
      ctx.strokeStyle = p.color + "38";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        nominalX + 0.5,
        nominalY + 0.5,
        nominalW - 1,
        nominalH - 1,
      );
    }

    ctx.fillStyle = p.color + "28";
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = p.color + "cc";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);

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
      const builtWidthMm = p.w * mm - gapMm;
      const builtDepthMm = p.d * mm - gapMm;

      ctx.fillStyle = p.color + "ee";
      ctx.font = `600 ${fs}px 'DM Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${formatBuiltMm(builtWidthMm)}×${formatBuiltMm(builtDepthMm)}`,
        px + pw / 2,
        py + ph / 2,
      );
    }
  }
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  u: number,
  grid: number,
  pad: number,
  fib: number[],
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
  u: number,
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
  mm: number,
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
  pad: number,
  gapPx: number,
): void {
  const inset = gapPx / 2;
  const nominalX = pad + hover.x * u;
  const nominalY = pad + hover.y * u;
  const nominalW = w * u;
  const nominalH = d * u;
  const hx = pad + hover.x * u + inset;
  const hy = pad + hover.y * u + inset;
  const hw = w * u - gapPx;
  const hh = d * u - gapPx;
  const fill = canPlace ? "#e8a23c" : "#e05c6e";

  if (gapPx > 0) {
    ctx.fillStyle = fill + "10";
    ctx.fillRect(nominalX, nominalY, nominalW, nominalH);
    ctx.strokeStyle = fill + "66";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(nominalX + 0.5, nominalY + 0.5, nominalW - 1, nominalH - 1);
  }

  ctx.fillStyle = fill + "18";
  ctx.fillRect(hx, hy, hw, hh);
  ctx.strokeStyle = fill;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(hx, hy, hw, hh);
  ctx.setLineDash([]);
}

export function drawFrameWall(
  ctx: CanvasRenderingContext2D,
  pad: number,
  innerPx: number,
  wallPx: number,
): void {
  if (wallPx <= 0) return;

  const outerX = pad - wallPx;
  const outerY = pad - wallPx;
  const outerSide = innerPx + 2 * wallPx;

  ctx.fillStyle = "#1a1c24";
  ctx.fillRect(outerX, outerY, outerSide, wallPx);
  ctx.fillRect(outerX, pad + innerPx, outerSide, wallPx);
  ctx.fillRect(outerX, pad, wallPx, innerPx);
  ctx.fillRect(pad + innerPx, pad, wallPx, innerPx);

  ctx.strokeStyle = "#2e3040";
  ctx.lineWidth = 1;
  ctx.strokeRect(outerX + 0.5, outerY + 0.5, outerSide - 1, outerSide - 1);
}

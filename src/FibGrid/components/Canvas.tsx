import { useRef, useEffect, useCallback, useState } from "react";
import { U as U_DEFAULT, GRID, PAD, MM, FIB } from "../lib/constants";
import { computeU } from "../lib/canvas-sizing";
import { toGrid, canPlace } from "../lib/grid-utils";
import {
  drawBackground,
  drawFrameWall,
  drawPlacedModules,
  drawGrid,
  drawBorder,
  drawRulerTicks,
  drawHoverPreview,
} from "../lib/canvas-draw";
import type {
  GridPos,
  Module,
  PhysicalConfig,
  PlacedModule,
} from "../lib/types";

interface CanvasProps {
  placed: PlacedModule[];
  hover: GridPos | null;
  effSelected: Module | null;
  occ: (string | null)[][];
  physical: PhysicalConfig;
  onHoverChange: (pos: GridPos | null) => void;
  onPlace: (w: number, d: number, x: number, y: number) => boolean;
  onRemoveAt: (x: number, y: number) => boolean;
}

export function Canvas({
  placed,
  hover,
  effSelected,
  occ,
  physical,
  onHoverChange,
  onPlace,
  onRemoveAt,
}: CanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [u, setU] = useState(U_DEFAULT);

  const pxPerMm = u / MM;
  const wallMm = (physical.outerMm - GRID * MM) / 2;
  const wallPx = wallMm * pxPerMm;
  const gapPx = physical.gapMm * pxPerMm;
  const innerPx = GRID * u;
  const cw = innerPx + 2 * wallPx + 2 * PAD;
  const ch = cw;

  // Observe container size and recompute u
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Wall thickness in pixels depends on U, but U depends on the wall.
      // Two-pass: estimate U ignoring wall, then re-estimate with wall at that U.
      const wallMmLocal = (physical.outerMm - GRID * MM) / 2;
      const provisional = computeU(rect.width, rect.height, 0);
      const wallAtProvisional = wallMmLocal * (provisional / MM);
      const final = computeU(rect.width, rect.height, wallAtProvisional);
      setU((prev) => (prev === final ? prev : final));
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [physical.outerMm]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    drawBackground(ctx, cw, ch);
    drawFrameWall(ctx, PAD + wallPx, innerPx, wallPx);
    drawPlacedModules(ctx, placed, u, PAD + wallPx, MM, gapPx);
    drawGrid(ctx, u, GRID, PAD + wallPx, FIB);
    drawBorder(ctx, PAD + wallPx, GRID, u);
    drawRulerTicks(ctx, FIB, u, PAD + wallPx, GRID, MM);

    if (hover && effSelected) {
      const ok = canPlace(effSelected.w, effSelected.d, hover.x, hover.y, occ);
      drawHoverPreview(
        ctx,
        hover,
        effSelected.w,
        effSelected.d,
        ok,
        u,
        PAD + wallPx,
        gapPx,
      );
    }
  }, [placed, hover, effSelected, occ, gapPx, wallPx, cw, ch, innerPx, u]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cw;
    cv.height = ch;
    draw();
  }, [draw, cw, ch]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const { x, y } = toGrid(e.clientX, e.clientY, cv, u, PAD + wallPx);
      if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
        onHoverChange({ x, y });
      } else {
        onHoverChange(null);
      }
    },
    [onHoverChange, wallPx, u],
  );

  const handleClick = useCallback(() => {
    if (!effSelected || !hover) return;
    onPlace(effSelected.w, effSelected.d, hover.x, hover.y);
  }, [effSelected, hover, onPlace]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!hover) return;
      onRemoveAt(hover.x, hover.y);
    },
    [hover, onRemoveAt],
  );

  const handleMouseLeave = useCallback(() => {
    onHoverChange(null);
  }, [onHoverChange]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className={`block ${effSelected ? "cursor-crosshair" : "cursor-default"}`}
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseLeave}
      />
      {hover && (
        <div
          className="absolute bottom-3 left-3 px-[7px] py-[3px] text-[9px] pointer-events-none"
          style={{
            background: "rgba(14, 14, 17, 0.8)",
            border: "1px solid #2e3040",
            color: "#666880",
            backdropFilter: "blur(4px)",
          }}
        >
          {hover.x * MM},{hover.y * MM} mm
        </div>
      )}
    </div>
  );
}

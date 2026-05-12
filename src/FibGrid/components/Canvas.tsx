import { useRef, useEffect, useCallback } from "react";
import { U, GRID, PAD, MM, FIB } from "../lib/constants";
import { toGrid, canPlace } from "../lib/grid-utils";
import {
  drawBackground,
  drawPlacedModules,
  drawGrid,
  drawBorder,
  drawRulerTicks,
  drawHoverPreview,
} from "../lib/canvas-draw";
import type { Module, PlacedModule, GridPos } from "../lib/types";

interface CanvasProps {
  placed: PlacedModule[];
  hover: GridPos | null;
  effSelected: Module | null;
  occ: (string | null)[][];
  onHoverChange: (pos: GridPos | null) => void;
  onPlace: (w: number, d: number, x: number, y: number) => boolean;
  onRemoveAt: (x: number, y: number) => boolean;
}

const CW = GRID * U + PAD * 2;
const CH = GRID * U + PAD * 2;

export function Canvas({
  placed,
  hover,
  effSelected,
  occ,
  onHoverChange,
  onPlace,
  onRemoveAt,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    drawBackground(ctx, CW, CH);
    drawPlacedModules(ctx, placed, U, PAD, MM);
    drawGrid(ctx, U, GRID, PAD, FIB);
    drawBorder(ctx, PAD, GRID, U);
    drawRulerTicks(ctx, FIB, U, PAD, GRID, MM);

    if (hover && effSelected) {
      const ok = canPlace(effSelected.w, effSelected.d, hover.x, hover.y, occ);
      drawHoverPreview(ctx, hover, effSelected.w, effSelected.d, ok, U, PAD);
    }
  }, [placed, hover, effSelected, occ]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = CW;
    cv.height = CH;
    draw();
  }, [draw]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const { x, y } = toGrid(e.clientX, e.clientY, cv, U, PAD);
      if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
        onHoverChange({ x, y });
      } else {
        onHoverChange(null);
      }
    },
    [onHoverChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!effSelected || !hover) return;
      onPlace(effSelected.w, effSelected.d, hover.x, hover.y);
    },
    [effSelected, hover, onPlace]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!hover) return;
      onRemoveAt(hover.x, hover.y);
    },
    [hover, onRemoveAt]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverChange(null);
  }, [onHoverChange]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`block max-w-full ${effSelected ? "cursor-crosshair" : "cursor-default"}`}
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseLeave}
      />
      {hover && (
        <div
          className="absolute bottom-9 left-3 px-[7px] py-[3px] text-[9px] pointer-events-none"
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

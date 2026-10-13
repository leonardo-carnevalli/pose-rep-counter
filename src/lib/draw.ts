import type { FrameResult } from "@/lib/exercises/rep-engine";
import { LM, SKELETON, type Point } from "@/lib/pose/landmarks";

export interface OverlayStyle {
  bone: string;
  boneAdjust: string;
  joint: string;
  labelBg: string;
  labelText: string;
}

const MIN_DRAW_VISIBILITY = 0.3;

/** Draws the skeleton and live angle labels. Canvas size is in device pixels. */
export function drawOverlay(ctx: CanvasRenderingContext2D, image: Point[] | null, result: FrameResult, mirrored: boolean, style: OverlayStyle) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!image) return;

  const scale = width / 640;
  const px = (p: Point) => [(mirrored ? 1 - p.x : p.x) * width, p.y * height] as const;
  const visible = (p: Point | undefined): p is Point => p !== undefined && p.visibility >= MIN_DRAW_VISIBILITY;

  ctx.lineCap = "round";
  ctx.lineWidth = 4 * scale;
  ctx.strokeStyle = result.status === "tracking" ? style.bone : style.boneAdjust;
  for (const [a, b] of SKELETON) {
    const pa = image[a];
    const pb = image[b];
    if (!visible(pa) || !visible(pb)) continue;
    ctx.globalAlpha = Math.min(pa.visibility, pb.visibility);
    ctx.beginPath();
    ctx.moveTo(...px(pa));
    ctx.lineTo(...px(pb));
    ctx.stroke();
  }

  ctx.fillStyle = style.joint;
  for (const index of Object.values(LM)) {
    const p = image[index];
    if (!visible(p)) continue;
    ctx.globalAlpha = p.visibility;
    ctx.beginPath();
    ctx.arc(...px(p), 5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.font = `600 ${14 * scale}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  for (const label of result.labels) {
    const p = image[label.landmark];
    if (!visible(p)) continue;
    const [x, y] = px(p);
    const w = ctx.measureText(label.text).width + 12 * scale;
    const h = 22 * scale;
    const left = x + 10 * scale;
    ctx.fillStyle = style.labelBg;
    ctx.beginPath();
    ctx.roundRect(left, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = style.labelText;
    ctx.fillText(label.text, left + 6 * scale, y);
  }
}

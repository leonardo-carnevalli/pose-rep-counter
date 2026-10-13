export interface Vec {
  x: number;
  y: number;
  z?: number;
}

const DEG = 180 / Math.PI;

function angleBetween(u: Vec, v: Vec, use3d: boolean): number {
  const uz = use3d ? (u.z ?? 0) : 0;
  const vz = use3d ? (v.z ?? 0) : 0;
  const dot = u.x * v.x + u.y * v.y + uz * vz;
  const norm = Math.hypot(u.x, u.y, uz) * Math.hypot(v.x, v.y, vz);
  if (norm === 0) return Number.NaN;
  return Math.acos(Math.min(1, Math.max(-1, dot / norm))) * DEG;
}

function sub(a: Vec, b: Vec, xScale = 1): Vec {
  return { x: (a.x - b.x) * xScale, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
}

/**
 * Interior angle at `b` in degrees (0..180) from image landmarks.
 * Normalised x and y have different units, so x is scaled by the frame aspect ratio (width / height).
 */
export function angle2d(a: Vec, b: Vec, c: Vec, aspect = 1): number {
  return angleBetween(sub(a, b, aspect), sub(c, b, aspect), false);
}

/** Interior angle at `b` in degrees (0..180) from metric world landmarks. Independent of camera angle. */
export function angle3d(a: Vec, b: Vec, c: Vec): number {
  return angleBetween(sub(a, b), sub(c, b), true);
}

/**
 * Angle in degrees between the segment `from -> to` and straight up.
 * Both MediaPipe coordinate systems point y downwards, so "up" is (0, -1, 0).
 */
export function angleFromVertical(from: Vec, to: Vec, aspect = 1, use3d = false): number {
  return angleBetween(sub(to, from, aspect), { x: 0, y: -1, z: 0 }, use3d);
}

export function distance2d(a: Vec, b: Vec, aspect = 1): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

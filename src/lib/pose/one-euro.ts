/**
 * One Euro filter (Casiez, Roussel and Vogel, CHI 2012).
 * An adaptive low-pass filter: heavy smoothing when the signal is slow (kills jitter while
 * holding a position), light smoothing when it moves fast (keeps lag low during a rep).
 */
export interface OneEuroOptions {
  /** Cut-off frequency in Hz at rest. Lower means smoother. */
  minCutoff: number;
  /** How quickly the cut-off grows with speed. Higher means less lag on fast moves. */
  beta: number;
  /** Cut-off used to smooth the derivative itself. */
  dCutoff: number;
}

export const DEFAULT_ONE_EURO: OneEuroOptions = { minCutoff: 1.2, beta: 0.02, dCutoff: 1 };

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export function createOneEuro(options: OneEuroOptions = DEFAULT_ONE_EURO) {
  let prevT: number | null = null;
  let prevX = 0;
  let prevDx = 0;

  return function filter(x: number, t: number): number {
    if (prevT === null || t <= prevT) {
      prevT = t;
      prevX = x;
      prevDx = 0;
      return x;
    }
    const dt = t - prevT;
    const dx = (x - prevX) / dt;
    const dxHat = prevDx + alpha(options.dCutoff, dt) * (dx - prevDx);
    const cutoff = options.minCutoff + options.beta * Math.abs(dxHat);
    const xHat = prevX + alpha(cutoff, dt) * (x - prevX);
    prevT = t;
    prevX = xHat;
    prevDx = dxHat;
    return xHat;
  };
}

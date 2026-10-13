import { describe, expect, it } from "vitest";
import { angle2d, angle3d, angleFromVertical, distance2d } from "./angles";

describe("angle2d", () => {
  it("measures right and straight angles", () => {
    expect(angle2d({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(angle2d({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180);
    expect(angle2d({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(45);
  });

  it("corrects normalised coordinates for the frame aspect ratio", () => {
    // In a 16:9 frame, 0.09 of the width and 0.16 of the height are the same number of pixels.
    const a = { x: 0.5, y: 0.34 };
    const b = { x: 0.5, y: 0.5 };
    const c = { x: 0.59, y: 0.34 };
    expect(angle2d(a, b, c, 16 / 9)).toBeCloseTo(45, 1);
    expect(angle2d(a, b, c, 1)).not.toBeCloseTo(45, 0);
  });

  it("returns NaN for a degenerate segment", () => {
    expect(angle2d({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNaN();
  });
});

describe("angle3d", () => {
  it("uses depth, which a 2D projection loses", () => {
    const a = { x: 0, y: 1, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 0, z: 1 };
    expect(angle3d(a, b, c)).toBeCloseTo(90);
    expect(angle2d(a, b, c)).toBeNaN();
  });

  it("does not change when the body rotates in front of the camera", () => {
    const rotate = (p: { x: number; y: number; z: number }, deg: number) => {
      const r = (deg * Math.PI) / 180;
      return { x: p.x * Math.cos(r) + p.z * Math.sin(r), y: p.y, z: -p.x * Math.sin(r) + p.z * Math.cos(r) };
    };
    const hip = { x: 0, y: 0, z: 0 };
    const knee = { x: 0.2, y: 0.4, z: 0.05 };
    const ankle = { x: 0.1, y: 0.85, z: 0 };
    const base = angle3d(hip, knee, ankle);
    for (const deg of [30, 60, 90]) {
      expect(angle3d(rotate(hip, deg), rotate(knee, deg), rotate(ankle, deg))).toBeCloseTo(base, 6);
    }
  });
});

describe("angleFromVertical", () => {
  it("is 0 for an upright segment and grows with lean in either direction (y points down)", () => {
    expect(angleFromVertical({ x: 0, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(0);
    expect(angleFromVertical({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(45);
    expect(angleFromVertical({ x: 0, y: 1 }, { x: -1, y: 0 })).toBeCloseTo(45);
  });
});

describe("distance2d", () => {
  it("scales x by the aspect ratio", () => {
    expect(distance2d({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 2)).toBeCloseTo(1);
  });
});

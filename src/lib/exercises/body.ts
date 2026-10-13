import { angle2d, angle3d, angleFromVertical } from "@/lib/pose/angles";
import { jointIndex, type Joint, type Point, type Side } from "@/lib/pose/landmarks";
import type { Body } from "./types";

/**
 * Builds the geometry view features read from. World landmarks are preferred: they are metric and
 * do not shrink when a limb points at the camera. Image landmarks are the fallback, with x
 * rescaled by the frame aspect ratio so angles are not distorted.
 */
export function createBody(image: Point[], world: Point[] | null, side: Side, aspect: number): Body {
  const points = world ?? image;
  const xScale = world ? 1 : aspect;
  const at = (joint: Joint, s: Side = side) => points[jointIndex(joint, s)]!;
  const width = (joint: Joint) => {
    const l = at(joint, "left");
    const r = at(joint, "right");
    return world ? Math.hypot(l.x - r.x, l.y - r.y, l.z - r.z) : Math.hypot((l.x - r.x) * xScale, l.y - r.y);
  };

  return {
    angle: (a, b, c, s = side) => (world ? angle3d(at(a, s), at(b, s), at(c, s)) : angle2d(at(a, s), at(b, s), at(c, s), xScale)),
    lean: (from, to) => angleFromVertical(at(from), at(to), xScale, world !== null),
    spread: (joint) => width(joint) / width("shoulder"),
  };
}

import type { PoseFrame } from "@/lib/pose/landmarks";

/** Anything that produces pose frames over time: the live camera or a recorded fixture. */
export interface PoseSource {
  /** Frame width / height, needed to measure angles on image landmarks. */
  aspect: number;
  /** True when the view should be mirrored like a selfie camera. */
  mirrored: boolean;
  start(onFrame: (frame: PoseFrame) => void, onEnd: () => void): void;
  stop(): void;
}

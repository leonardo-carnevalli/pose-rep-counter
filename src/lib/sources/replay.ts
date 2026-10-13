import { decodeFixture, type Fixture } from "@/lib/replay/fixture";
import type { PoseSource } from "./types";

export async function loadFixture(name: string): Promise<Fixture> {
  const response = await fetch(`/fixtures/${encodeURIComponent(name)}.json`);
  if (!response.ok) throw new Error(`Could not load replay "${name}" (${response.status})`);
  return decodeFixture(await response.json());
}

/** Plays a recorded sequence in real time (or faster), frame timestamps preserved. */
export function createReplaySource(fixture: Fixture, speed = 1): PoseSource {
  let raf = 0;
  return {
    aspect: fixture.aspect,
    mirrored: false,
    start(onFrame, onEnd) {
      const startedAt = performance.now();
      let next = 0;
      const tick = (now: number) => {
        const elapsed = ((now - startedAt) / 1000) * speed;
        while (next < fixture.frames.length && fixture.frames[next]!.t <= elapsed) onFrame(fixture.frames[next++]!);
        if (next >= fixture.frames.length) onEnd();
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}

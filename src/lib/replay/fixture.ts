import { isExerciseId } from "@/lib/exercises/catalog";
import type { ExerciseId } from "@/lib/exercises/types";
import { LANDMARK_COUNT, LM, type Point, type PoseFrame } from "@/lib/pose/landmarks";

/** A recorded pose sequence with the result it is expected to produce. */
export interface Fixture {
  name: string;
  exercise: ExerciseId;
  aspect: number;
  expected: { reps: number; cues: Record<string, number> };
  frames: PoseFrame[];
}

/**
 * On disk a fixture keeps only the 13 landmarks the engine reads, as flat rounded arrays:
 * image [x, y, z, visibility] and world [x, y, z] per landmark. This keeps a 30 s set small.
 */
type EncodedFrame = [t: number, image: number[] | null, world: number[] | null];
interface EncodedFixture extends Omit<Fixture, "frames"> {
  landmarks: number[];
  frames: EncodedFrame[];
}

const STORED = Object.values(LM);
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export function encodeFixture(fixture: Fixture): EncodedFixture {
  const { frames, ...meta } = fixture;
  return {
    ...meta,
    landmarks: STORED,
    frames: frames.map(({ t, image, world }) => [
      t,
      image ? STORED.flatMap((i) => [round(image[i]!.x, 4), round(image[i]!.y, 4), round(image[i]!.z, 4), round(image[i]!.visibility, 2)]) : null,
      world ? STORED.flatMap((i) => [round(world[i]!.x, 3), round(world[i]!.y, 3), round(world[i]!.z, 3)]) : null,
    ]),
  };
}

function unpack(indices: number[], flat: number[], stride: 3 | 4, visibility?: number[]): Point[] {
  const points: Point[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  indices.forEach((index, k) => {
    const o = k * stride;
    points[index] = { x: flat[o]!, y: flat[o + 1]!, z: flat[o + 2]!, visibility: stride === 4 ? flat[o + 3]! : (visibility?.[k] ?? 0) };
  });
  return points;
}

const isNumberArray = (value: unknown): value is number[] => Array.isArray(value) && value.every((n) => typeof n === "number");

/** Parses untrusted JSON into a fixture, throwing on anything malformed. */
export function decodeFixture(raw: unknown): Fixture {
  const data = raw as Partial<EncodedFixture> | null;
  if (!data || typeof data.name !== "string" || typeof data.exercise !== "string" || !isExerciseId(data.exercise)) {
    throw new Error("Fixture: missing name or unknown exercise");
  }
  if (typeof data.aspect !== "number" || !isNumberArray(data.landmarks) || !Array.isArray(data.frames) || !data.expected) {
    throw new Error(`Fixture ${data.name}: malformed header`);
  }
  const indices = data.landmarks;
  const frames = data.frames.map(([t, image, world]): PoseFrame => {
    if (typeof t !== "number" || (image !== null && (!isNumberArray(image) || image.length !== indices.length * 4))) {
      throw new Error(`Fixture ${data.name}: malformed frame`);
    }
    const visibility = image ? indices.map((_, k) => image[k * 4 + 3]!) : undefined;
    return {
      t,
      image: image ? unpack(indices, image, 4) : null,
      world: world && isNumberArray(world) && world.length === indices.length * 3 ? unpack(indices, world, 3, visibility) : null,
    };
  });
  return { name: data.name, exercise: data.exercise, aspect: data.aspect, expected: data.expected, frames };
}

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame } from "@/lib/pose/landmarks";
import type { PoseSource } from "./types";

/** Keep in sync with the exact @mediapipe/tasks-vision version in package.json. */
const TASKS_VISION_VERSION = "1.1.0";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Loads the model once, on first use, so replay mode never downloads it. Only the WASM runtime
 * and model weights are fetched; inference runs in the page and frames are never uploaded.
 */
function getLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    return PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  })().catch((error: unknown) => {
    landmarkerPromise = null;
    throw error;
  });
  return landmarkerPromise;
}

export async function createCameraSource(video: HTMLVideoElement): Promise<PoseSource> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  try {
    video.srcObject = stream;
    await video.play();
    const landmarker = await getLandmarker();
    return wrap(video, stream, landmarker);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}

function wrap(video: HTMLVideoElement, stream: MediaStream, landmarker: PoseLandmarker): PoseSource {
  let raf = 0;
  let lastVideoTime = -1;
  const startedAt = performance.now();

  return {
    aspect: video.videoWidth / video.videoHeight || 16 / 9,
    mirrored: true,
    start(onFrame) {
      const tick = () => {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const now = performance.now();
          const result = landmarker.detectForVideo(video, now);
          const toPoints = (points: { x: number; y: number; z: number; visibility: number }[] | undefined) =>
            points ? points.map(({ x, y, z, visibility }) => ({ x, y, z, visibility })) : null;
          const frame: PoseFrame = {
            t: (now - startedAt) / 1000,
            image: toPoints(result.landmarks[0]),
            world: toPoints(result.worldLandmarks[0]),
          };
          onFrame(frame);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawOverlay, type OverlayStyle } from "@/lib/draw";
import { EXERCISES, isExerciseId } from "@/lib/exercises/catalog";
import { createRepEngine, type FrameResult, type RepEngine, type RepRecord } from "@/lib/exercises/rep-engine";
import { summarize, type SessionSummary } from "@/lib/exercises/summary";
import type { ExerciseId } from "@/lib/exercises/types";
import type { PoseFrame } from "@/lib/pose/landmarks";
import { FIXTURE_PLANS } from "@/lib/sim/plans";
import { createCameraSource } from "@/lib/sources/camera";
import { createReplaySource, loadFixture } from "@/lib/sources/replay";
import type { PoseSource } from "@/lib/sources/types";
import { Controls, type SourceKind } from "./Controls";
import { HistoryList } from "./HistoryList";
import { Stage, type LiveState, type RunState, type Toast } from "./Stage";
import { SummaryCard } from "./SummaryCard";
import { useHistory } from "./useHistory";

const FIXTURE_FOR = Object.fromEntries(FIXTURE_PLANS.map((p) => [p.plan.exercise, p.name])) as Record<ExerciseId, string>;
const IDLE: LiveState = { reps: 0, status: null, guidance: null, phase: "rest", view: "unknown", values: {}, last: null };
/** Live numbers re-render at most this often; the canvas still draws every frame. */
const UI_INTERVAL_MS = 100;
const TOAST_MS = 2800;

interface Session {
  exercise: ExerciseId;
  source: PoseSource;
  engine: RepEngine;
  reps: RepRecord[];
  startedAt: Date;
  style: OverlayStyle;
  lastUi: number;
  lastKey: string;
}

function readOverlayStyle(): OverlayStyle {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    bone: token("--color-accent"),
    boneAdjust: token("--color-warn"),
    joint: token("--color-text"),
    labelBg: "rgb(11 13 16 / 0.85)",
    labelText: token("--color-accent"),
  };
}

function speak(text: string) {
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } catch {
    // Speech synthesis is optional; counting continues silently without it.
  }
}

async function openSource(id: ExerciseId, kind: SourceKind, video: HTMLVideoElement | null, speed = 1): Promise<PoseSource> {
  if (kind === "replay") return createReplaySource(await loadFixture(FIXTURE_FOR[id]), speed);
  if (!video) throw new Error("Video element is not ready");
  return createCameraSource(video);
}

function describeError(error: unknown, kind: SourceKind): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return "Camera access was blocked. Allow it in your browser, or try the replay demo.";
  if (name === "NotFoundError") return "No camera was found. Try the replay demo instead.";
  const detail = error instanceof Error ? error.message : String(error);
  return kind === "camera" ? `Could not start the camera or the pose model: ${detail}` : `Could not load the replay: ${detail}`;
}

export function Trainer() {
  const [exercise, setExercise] = useState<ExerciseId>("squat");
  const [sourceKind, setSourceKind] = useState<SourceKind>("replay");
  const [voice, setVoice] = useState(false);
  const [run, setRun] = useState<RunState>("idle");
  const [live, setLive] = useState<LiveState>(IDLE);
  const [view, setView] = useState({ aspect: 16 / 9, mirrored: false, camera: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { history, save, clear } = useHistory();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const voiceRef = useRef(false);
  const toastId = useRef(0);

  const addToast = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((current) => [...current.slice(-2), { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const onFrame = useCallback(
    (session: Session, frame: PoseFrame) => {
      const result: FrameResult = session.engine.push(frame);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawOverlay(ctx, frame.image, result, session.source.mirrored, session.style);

      if (result.completed) {
        session.reps.push(result.completed);
        if (voiceRef.current) speak(String(result.reps));
        result.completed.cues.forEach((cue) => addToast(cue.message));
      }

      const key = `${result.reps}|${result.status}|${result.guidance}|${result.phase}`;
      const now = performance.now();
      if (key === session.lastKey && now - session.lastUi < UI_INTERVAL_MS) return;
      session.lastKey = key;
      session.lastUi = now;
      const last = session.reps.at(-1) ?? null;
      setLive({
        reps: result.reps,
        status: result.status,
        guidance: result.guidance,
        phase: result.phase,
        view: result.view,
        values: result.values,
        last: last && { tempo: last.tempo, rom: last.rom },
      });
    },
    [addToast],
  );

  const finish = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    session.source.stop();
    const result = summarize(session.exercise, session.startedAt, session.reps);
    setSummary(result);
    if (result.reps > 0) save(result);
    setRun("idle");
    setLive((current) => ({ ...current, status: null, guidance: null }));
  }, [save]);

  /** Wires an opened source to a fresh engine and starts playback. */
  const begin = useCallback(
    (id: ExerciseId, kind: SourceKind, source: PoseSource) => {
      sessionRef.current?.source.stop();
      const session: Session = {
        exercise: id,
        source,
        engine: createRepEngine(EXERCISES[id], { aspect: source.aspect }),
        reps: [],
        startedAt: new Date(),
        style: readOverlayStyle(),
        lastUi: 0,
        lastKey: "",
      };
      sessionRef.current = session;
      setExercise(id);
      setSourceKind(kind);
      setSummary(null);
      setError(null);
      setToasts([]);
      setLive(IDLE);
      setView({ aspect: source.aspect, mirrored: source.mirrored, camera: kind === "camera" });
      setRun("running");
      source.start((frame) => onFrame(session, frame), finish);
    },
    [finish, onFrame],
  );

  const start = useCallback(
    async (id: ExerciseId, kind: SourceKind) => {
      setSummary(null);
      setError(null);
      setRun("loading");
      try {
        begin(id, kind, await openSource(id, kind, videoRef.current));
      } catch (e) {
        setError(describeError(e, kind));
        setRun("idle");
      }
    },
    [begin],
  );

  // Deep link for demos and screenshots: /?replay=squat&speed=2 starts that replay right away.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("replay");
    if (!id || !isExerciseId(id)) return;
    let cancelled = false;
    openSource(id, "replay", null, Number(params.get("speed")) || 1).then(
      (source) => !cancelled && begin(id, "replay", source),
      (e: unknown) => setError(describeError(e, "replay")),
    );
    return () => {
      cancelled = true;
    };
  }, [begin]);

  useEffect(() => () => sessionRef.current?.source.stop(), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Stage
          videoRef={videoRef}
          canvasRef={canvasRef}
          aspect={view.aspect}
          mirrored={view.mirrored}
          showVideo={view.camera && run !== "idle"}
          run={run}
          live={live}
          toasts={toasts}
          exercise={EXERCISES[exercise]}
        />
        {summary && <SummaryCard summary={summary} />}
      </div>

      <aside className="flex flex-col gap-6">
        <Controls
          exercise={exercise}
          sourceKind={sourceKind}
          voice={voice}
          run={run}
          error={error}
          values={live.values}
          onExercise={setExercise}
          onSource={setSourceKind}
          onVoice={(on) => {
            voiceRef.current = on;
            setVoice(on);
          }}
          onStart={() => void start(exercise, sourceKind)}
          onFinish={finish}
        />
        <HistoryList history={history} onClear={clear} />
      </aside>
    </div>
  );
}

import { Trainer } from "@/components/Trainer";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Pose Rep Counter
          </h1>
          <p className="mt-1 max-w-xl text-muted">
            Real-time rep counting, tempo and form cues from your webcam. Pose tracking runs on this device: no video
            leaves the browser.
          </p>
        </div>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
          <span aria-hidden className="size-2 rounded-full bg-accent" />
          On-device · MediaPipe Pose
        </p>
      </header>

      <Trainer />

      <footer className="border-t border-line pt-4 text-sm text-muted">
        <p>
          For general fitness training only. This is not medical advice, and counts and cues are estimates from a
          camera model. Train within your own limits.
        </p>
      </footer>
    </main>
  );
}

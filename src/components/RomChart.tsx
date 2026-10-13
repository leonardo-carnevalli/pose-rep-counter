import type { SessionSummary } from "@/lib/exercises/summary";

const W = 640;
const H = 200;
const PAD = { top: 24, right: 8, bottom: 28, left: 36 };
const TICKS = [0, 50, 100];

/** Range of motion per rep. Reps that triggered a form cue are drawn in the warning colour. */
export function RomChart({ reps }: { reps: SessionSummary["perRep"] }) {
  if (reps.length === 0) return null;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / reps.length;
  const bar = Math.min(40, slot * 0.6);
  const y = (rom: number) => PAD.top + plotH * (1 - rom / 100);
  const flagged = reps.filter((r) => r.cues.length > 0).length;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Range of motion per rep, from ${Math.min(...reps.map((r) => r.rom))}% to ${Math.max(...reps.map((r) => r.rom))}%. ${flagged} of ${reps.length} reps had a form cue.`}
      >
        {TICKS.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-line" strokeDasharray={tick === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[12px]">
              {tick}%
            </text>
          </g>
        ))}
        {reps.map((rep, i) => {
          const x = PAD.left + slot * i + (slot - bar) / 2;
          return (
            <g key={rep.index}>
              <title>{`Rep ${rep.index}: ${rep.rom}% range, ${rep.tempo.toFixed(1)} s${rep.cues.length ? `, cue: ${rep.cues.join(", ")}` : ""}`}</title>
              <rect x={x} y={y(rep.rom)} width={bar} height={y(0) - y(rep.rom)} rx={4} className={rep.cues.length ? "fill-warn" : "fill-accent"} />
              <text x={x + bar / 2} y={y(rep.rom) - 6} textAnchor="middle" className="fill-text text-[11px] tabular-nums">
                {rep.tempo.toFixed(1)}s
              </text>
              <text x={x + bar / 2} y={H - 8} textAnchor="middle" className="fill-muted text-[12px]">
                {rep.index}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>Bars: range of motion per rep · labels: seconds per rep</span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-2.5 rounded-sm bg-accent" /> clean
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-2.5 rounded-sm bg-warn" /> form cue
        </span>
      </figcaption>
    </figure>
  );
}

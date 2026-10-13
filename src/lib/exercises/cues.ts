import type { CueRule } from "./types";

export interface CueHit {
  id: string;
  message: string;
  /** The aggregated value that broke the rule, for the summary. */
  value: number;
}

export type FeatureRanges = Record<string, { min: number; max: number }>;

/** Checks every rule against the min and max each feature reached during one rep. */
export function evaluateCues(rules: readonly CueRule[], ranges: FeatureRanges): CueHit[] {
  return rules.flatMap((rule) => {
    const range = ranges[rule.feature];
    if (!range) return [];
    const value = range[rule.aggregate];
    const broken = rule.op === "<" ? value < rule.threshold : value > rule.threshold;
    return broken ? [{ id: rule.id, message: rule.message, value }] : [];
  });
}

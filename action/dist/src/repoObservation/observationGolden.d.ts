/**
 * P20a.3: Observation Golden Baseline
 *
 * Builds summary snapshots from RepoObservations and compares
 * against stored golden baselines to detect scanner regression.
 *
 * Does NOT store full observation dumps — only shape/quality summaries.
 */
import type { RepoObservations, GoldenObservationSnapshot, ObservationGoldenThresholds, ObservationGoldenComparison } from "./types.js";
export declare const DEFAULT_GOLDEN_THRESHOLDS: ObservationGoldenThresholds;
export declare function buildGoldenObservationSnapshot(input: {
    observations: RepoObservations;
    target: string;
    configLoadedFrom: string | null;
    thresholds?: ObservationGoldenThresholds;
}): GoldenObservationSnapshot;
export declare function compareObservationGolden(input: {
    golden: GoldenObservationSnapshot;
    current: GoldenObservationSnapshot;
    currentObservations?: RepoObservations;
}): ObservationGoldenComparison;

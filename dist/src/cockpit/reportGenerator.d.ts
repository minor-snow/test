/**
 * Trial Report Generator
 *
 * ref: Phase 5 P5-001
 *
 * Consumes trial data directory and produces a structured TrialReportData
 * for the Release Decision Cockpit. Not a JSON dump — a structured,
 * signable report.
 */
import type { Artifact } from "../types.js";
import type { StoreConfig } from "../artifactStore.js";
import type { TrialReportData, ResidualSnapshot, MultiArtifactReportData } from "./types.js";
import type { TrialReport } from "../trial/trialRunner.js";
export declare function buildResidualSnapshot(artifact: Artifact): ResidualSnapshot;
export declare function loadCanonicalArtifact(config: StoreConfig, artifactId: string): Promise<{
    artifact: Artifact;
    revisionId: string;
} | null>;
export declare function generateTrialReportData(config: StoreConfig, artifactId: string, trialReport: TrialReport): Promise<TrialReportData>;
export declare function generateReportFromStore(config: StoreConfig, artifactId: string): Promise<TrialReportData>;
export declare function generateMultiArtifactReport(config: StoreConfig, artifactIds: string[]): Promise<MultiArtifactReportData>;

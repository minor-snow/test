/**
 * Cockpit Pressure Fixtures
 *
 * ref: HARD-006
 *
 * 10 fixed failure samples covering different pipeline failure modes.
 * Each fixture defines:
 *   - A draft artifact
 *   - A patch text (or patch operations)
 *   - The expected pipeline outcome
 *
 * These are used by the cockpit to render diverse failure states,
 * not just the §21 happy-path walkthrough.
 */
import type { Artifact, PatchProposal } from "../../../src/types.js";
export type CockpitFixture = {
    id: string;
    name: string;
    description: string;
    artifact: Artifact;
    /** If set, pipeline uses this as patchTextOverride */
    patchText?: string;
    /** If set, used directly instead of auto-generated PatchProposal */
    patchProposal?: PatchProposal;
    /** Expected pipeline phase after runPipeline */
    expectedPhase: "committed" | "regression_failed" | "patch_compiled" | "candidate_created";
    /** Expected failed gates (if regression_failed) */
    expectedFailedGates?: string[];
    /** Expected patch rejection reason (if pipeline halts at patch) */
    expectedPatchRejectReason?: string;
    /** Whether patch result should be rejected before regression */
    expectPatchRejected?: boolean;
};
export declare const COCKPIT_FIXTURES: CockpitFixture[];
export declare function getFixtureById(id: string): CockpitFixture | undefined;

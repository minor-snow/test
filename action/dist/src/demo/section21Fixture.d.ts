/**
 * Section 21 Fixture
 *
 * ref: HARD-005, 执行宪法 v0.2 §21
 *
 * This is the canonical §21 closed-loop demo artifact.
 * It defines both the input artifact and the expected patch text
 * that triggers the semantic regression → override flow.
 *
 * STATUS: This is a demo fixture, not a production artifact factory.
 */
import type { Artifact } from "../types.js";
/**
 * The replacement text that the demo Patch Agent produces.
 *
 * This intentionally contains an undefined technical term
 * (`quarantine_gate`) which triggers the semantic regression
 * gate, forcing the pipeline to halt at `regression_failed`.
 */
export declare const SECTION21_PATCH_TEXT = "Entries must pass a quarantine_gate before canonical commit.";
/**
 * Create the §21 demo artifact.
 *
 * This artifact has a single block with the naive claim
 * "All entries are committed instantly." which the linter
 * will flag as `unsafe_canonical_commit`.
 */
export declare function makeSection21Artifact(): Artifact;

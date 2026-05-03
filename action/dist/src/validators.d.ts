/**
 * Gate Validators
 *
 * ref: 执行宪法 v0.2 §8 Gate 系统, §9.1 SkillOutput 状态机
 *
 * Implements the four gates:
 *   G-01: Schema Gate
 *   G-02: Source Reference Gate
 *   G-03: Capability Gate
 *   G-04: Type-Specific Invariant Gate
 *
 * And the SkillOutput state machine:
 *   raw → parsed → validated | rejected
 *
 * ref: C-02 — All state transitions are deterministic code, not LLM.
 * ref: C-03 — Validated output can be promoted from quarantine to evidence.
 */
import type { Artifact } from "./types.js";
export type SkillLevel = "L0" | "L1" | "L2" | "L3";
export type SkillCapability = {
    skill_id: string;
    level: SkillLevel;
    allowed_outputs: string[];
    allowed_targets: string[];
    forbidden_targets: string[];
};
export type GateResult = {
    gate: string;
    passed: boolean;
    errors: string[];
};
export type ValidationPipelineResult = {
    status: "validated" | "rejected";
    gates: GateResult[];
    errors: string[];
};
/**
 * ref: G-01 — Validates object against its schema_version.
 */
export declare function schemaGate(data: unknown): GateResult;
/**
 * ref: G-02 — target_block_id must exist in current artifact block index.
 *
 * Checks that any block_id references in the data actually exist
 * in the target artifact.
 */
export declare function sourceReferenceGate(data: unknown, artifact: Artifact | null): GateResult;
/**
 * ref: G-03 — Skill must not exceed its allowed capabilities.
 */
export declare function capabilityGate(skillId: string, outputType: string, targetStore: string): GateResult;
/**
 * ref: G-04 — Different objects have different invariants.
 */
export declare function typeSpecificInvariantGate(data: unknown, objectType: string, artifact: Artifact | null): GateResult;
/**
 * Run the full gate validation pipeline on a skill output.
 *
 * ref: §9.1 — raw → parsed → validated | rejected
 * ref: C-02 — All transitions are deterministic.
 *
 * @param rawJson - The raw JSON string from a skill output
 * @param skillId - The producing skill's identifier
 * @param outputType - The expected output type (e.g., "Issue")
 * @param targetStore - Where the output would be stored (e.g., "quarantine")
 * @param artifact - The target artifact (for reference checks)
 */
export declare function validateSkillOutput(rawJson: string, skillId: string, outputType: string, targetStore: string, artifact: Artifact | null): ValidationPipelineResult;
/**
 * Get the capability definition for a skill.
 */
export declare function getSkillCapability(skillId: string): SkillCapability | undefined;

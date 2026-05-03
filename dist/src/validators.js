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
import { validateForRead } from "./schemaRegistry.js";
/** ref: §7 – Skill registrations for MVP */
const SKILL_CAPABILITIES = {
    document_linter: {
        skill_id: "document_linter",
        level: "L1",
        allowed_outputs: ["Issue"],
        allowed_targets: ["quarantine", "evidence"],
        forbidden_targets: ["canonical", "patch", "commit"],
    },
    blue_patch_agent: {
        skill_id: "blue_patch_agent",
        level: "L2",
        allowed_outputs: ["PatchProposal"],
        allowed_targets: ["quarantine", "evidence"],
        forbidden_targets: ["canonical", "commit"],
    },
    red_review_agent: {
        skill_id: "red_review_agent",
        level: "L2",
        allowed_outputs: ["Issue", "PatchProposal"],
        allowed_targets: ["quarantine", "evidence"],
        forbidden_targets: ["canonical", "commit"],
    },
};
// ---------------------------------------------------------------------------
// G-01: Schema Gate
// ---------------------------------------------------------------------------
/**
 * ref: G-01 — Validates object against its schema_version.
 */
export function schemaGate(data) {
    const result = validateForRead(data);
    return {
        gate: "schema_gate",
        passed: result.valid,
        errors: result.valid ? [] : result.errors,
    };
}
// ---------------------------------------------------------------------------
// G-02: Source Reference Gate
// ---------------------------------------------------------------------------
/**
 * ref: G-02 — target_block_id must exist in current artifact block index.
 *
 * Checks that any block_id references in the data actually exist
 * in the target artifact.
 */
export function sourceReferenceGate(data, artifact) {
    const errors = [];
    if (!artifact) {
        return { gate: "source_reference_gate", passed: true, errors: [] };
    }
    // Build block index
    const blockIds = new Set();
    for (const section of artifact.sections) {
        for (const block of section.commitments) {
            blockIds.add(block.block_id);
        }
    }
    const obj = data;
    // Check target_block_id (Issue, PatchProposal operations)
    if (typeof obj.target_block_id === "string") {
        if (!blockIds.has(obj.target_block_id)) {
            errors.push(`target_block_id "${obj.target_block_id}" does not exist in artifact block index`);
        }
    }
    // Check operations[].target_block_id (PatchProposal)
    if (Array.isArray(obj.operations)) {
        for (const op of obj.operations) {
            const opObj = op;
            if (typeof opObj.target_block_id === "string") {
                if (!blockIds.has(opObj.target_block_id)) {
                    errors.push(`operation target_block_id "${opObj.target_block_id}" does not exist in artifact block index`);
                }
            }
        }
    }
    return {
        gate: "source_reference_gate",
        passed: errors.length === 0,
        errors,
    };
}
// ---------------------------------------------------------------------------
// G-03: Capability Gate
// ---------------------------------------------------------------------------
/**
 * ref: G-03 — Skill must not exceed its allowed capabilities.
 */
export function capabilityGate(skillId, outputType, targetStore) {
    const errors = [];
    const cap = SKILL_CAPABILITIES[skillId];
    if (!cap) {
        return {
            gate: "capability_gate",
            passed: false,
            errors: [`Unknown skill: "${skillId}"`],
        };
    }
    // ref: §7 — L3 is disabled in MVP
    if (cap.level === "L3") {
        errors.push(`L3 skills are disabled in MVP`);
    }
    if (!cap.allowed_outputs.includes(outputType)) {
        errors.push(`Skill "${skillId}" (${cap.level}) is not allowed to produce "${outputType}". ` +
            `Allowed: [${cap.allowed_outputs.join(", ")}]`);
    }
    if (cap.forbidden_targets.includes(targetStore)) {
        errors.push(`Skill "${skillId}" (${cap.level}) is forbidden from writing to "${targetStore}"`);
    }
    if (cap.allowed_targets.length > 0 &&
        !cap.allowed_targets.includes(targetStore)) {
        errors.push(`Skill "${skillId}" (${cap.level}) is not allowed to write to "${targetStore}". ` +
            `Allowed: [${cap.allowed_targets.join(", ")}]`);
    }
    return {
        gate: "capability_gate",
        passed: errors.length === 0,
        errors,
    };
}
// ---------------------------------------------------------------------------
// G-04: Type-Specific Invariant Gate
// ---------------------------------------------------------------------------
/**
 * ref: G-04 — Different objects have different invariants.
 */
export function typeSpecificInvariantGate(data, objectType, artifact) {
    const errors = [];
    const obj = data;
    if (objectType === "Issue" || objectType === "issue") {
        // Issue invariants (ref: §8 G-04)
        if (!obj.issue_id)
            errors.push("issue_id is required");
        if (!obj.artifact_id)
            errors.push("artifact_id is required");
        if (!obj.target_block_id)
            errors.push("target_block_id is required");
        const validSeverities = ["low", "medium", "high", "critical"];
        if (!validSeverities.includes(obj.severity)) {
            errors.push(`severity "${obj.severity}" is not valid`);
        }
        // base_revision_id must match current artifact revision
        if (artifact && obj.base_revision_id !== artifact.revision_id) {
            errors.push(`base_revision_id "${obj.base_revision_id}" does not match ` +
                `current artifact revision "${artifact.revision_id}"`);
        }
    }
    if (objectType === "PatchProposal" || objectType === "patch_proposal") {
        // PatchProposal invariants (ref: §8 G-04)
        const sourceIds = obj.source_issue_ids;
        if (!sourceIds || sourceIds.length === 0) {
            errors.push("source_issue_ids must be non-empty");
        }
        const ops = obj.operations;
        if (ops) {
            for (const op of ops) {
                if (!op.replacement_text) {
                    errors.push("replacement_text must be non-empty");
                }
                if (typeof op.replacement_text === "string" &&
                    op.replacement_text.length > 10000) {
                    errors.push("replacement_text exceeds maximum length (10000)");
                }
            }
        }
    }
    return {
        gate: "type_specific_invariant_gate",
        passed: errors.length === 0,
        errors,
    };
}
// ---------------------------------------------------------------------------
// Full validation pipeline  – ref: §9.1 SkillOutput state machine
// ---------------------------------------------------------------------------
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
export function validateSkillOutput(rawJson, skillId, outputType, targetStore, artifact) {
    const allGates = [];
    const allErrors = [];
    // Step 1: raw → parsed (JSON.parse)
    let parsed;
    try {
        parsed = JSON.parse(rawJson);
    }
    catch (e) {
        return {
            status: "rejected",
            gates: [
                {
                    gate: "json_parse",
                    passed: false,
                    errors: [`Failed to parse JSON: ${e.message}`],
                },
            ],
            errors: [`JSON parse failed: ${e.message}`],
        };
    }
    // Step 2: Schema Gate (G-01)
    const g1 = schemaGate(parsed);
    allGates.push(g1);
    if (!g1.passed)
        allErrors.push(...g1.errors);
    // Step 3: Source Reference Gate (G-02)
    const g2 = sourceReferenceGate(parsed, artifact);
    allGates.push(g2);
    if (!g2.passed)
        allErrors.push(...g2.errors);
    // Step 4: Capability Gate (G-03)
    const g3 = capabilityGate(skillId, outputType, targetStore);
    allGates.push(g3);
    if (!g3.passed)
        allErrors.push(...g3.errors);
    // Step 5: Type-Specific Invariant Gate (G-04)
    const g4 = typeSpecificInvariantGate(parsed, outputType, artifact);
    allGates.push(g4);
    if (!g4.passed)
        allErrors.push(...g4.errors);
    // Determine final status
    const anyFailed = allGates.some((g) => !g.passed);
    return {
        status: anyFailed ? "rejected" : "validated",
        gates: allGates,
        errors: allErrors,
    };
}
/**
 * Get the capability definition for a skill.
 */
export function getSkillCapability(skillId) {
    return SKILL_CAPABILITIES[skillId];
}
//# sourceMappingURL=validators.js.map
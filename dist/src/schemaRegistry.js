/**
 * Schema Registry
 *
 * ref: 执行宪法 v0.2 §6 Schema 版本规则
 *
 * S-01: Every core object must carry schema_version.
 * S-02: Write path strict, read path tolerant, migration explicit.
 * S-03: Must exist a schema registry.
 * S-04: Migration must be explicit.
 *
 * Design:
 *   - Each schema_version string maps to a Zod schema.
 *   - validateForWrite() enforces the CURRENT schema strictly.
 *   - validateForRead() validates against the object's own schema_version.
 *   - Unknown schema_version is always rejected.
 *   - Migration interface is defined but not implemented for MVP.
 */
import { z } from "zod";
// ---------------------------------------------------------------------------
// Common Zod schemas (shared across versions)
// ---------------------------------------------------------------------------
const BlockTypeEnum = z.enum([
    "invariant",
    "mechanism",
    "constraint",
    "decision",
    "risk",
    "interface",
    "module",
    "state_machine",
    "open_question",
]);
const BlockStatusEnum = z.enum([
    "draft",
    "candidate",
    "approved",
    "suspect",
    "revoked",
]);
const CommitmentBlockSchema = z.object({
    block_id: z.string().min(1),
    type: BlockTypeEnum,
    text: z.string().min(1),
    rationale: z.string().optional(),
    terms: z.array(z.string()).optional(),
    linked_architecture_blocks: z.array(z.string()).optional(), // P7a
    linked_interface_blocks: z.array(z.string()).optional(), // P7b
    status: BlockStatusEnum,
    content_hash: z.string().min(1),
});
const ArtifactSectionSchema = z.object({
    section_id: z.string().min(1),
    title: z.string().min(1),
    commitments: z.array(CommitmentBlockSchema),
});
const ArtifactMetadataSchema = z.object({
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
});
const ArtifactTypeEnum = z.enum([
    "ArchitectureDraft",
    "Constitution",
    "InterfaceSpec",
    "ModuleSpec",
    "DecisionLog",
    "RiskRegister",
]);
// ---------------------------------------------------------------------------
// Version-specific schemas
// ---------------------------------------------------------------------------
/** ref: S-01, S-03 */
const ArchitectureDraftV010Schema = z.object({
    artifact_id: z.string().min(1),
    artifact_type: ArtifactTypeEnum,
    schema_version: z.literal("architecture_draft@0.1.0"),
    revision_id: z.string().min(1),
    parent_revision_id: z.string().optional(),
    sections: z.array(ArtifactSectionSchema).min(1),
    metadata: ArtifactMetadataSchema,
});
/** P7a: InterfaceSpec schema */
const InterfaceSpecV010Schema = z.object({
    artifact_id: z.string().min(1),
    artifact_type: ArtifactTypeEnum,
    schema_version: z.literal("interface_spec@0.1.0"),
    revision_id: z.string().min(1),
    parent_revision_id: z.string().optional(),
    sections: z.array(ArtifactSectionSchema).min(1),
    metadata: ArtifactMetadataSchema,
});
/** P7b: ModuleSpec schema */
const ModuleSpecV010Schema = z.object({
    artifact_id: z.string().min(1),
    artifact_type: ArtifactTypeEnum,
    schema_version: z.literal("module_spec@0.1.0"),
    revision_id: z.string().min(1),
    parent_revision_id: z.string().optional(),
    sections: z.array(ArtifactSectionSchema).min(1),
    metadata: ArtifactMetadataSchema,
});
const IssueSeverityEnum = z.enum(["low", "medium", "high", "critical"]);
const IssueV010Schema = z.object({
    issue_id: z.string().min(1),
    artifact_id: z.string().min(1),
    base_revision_id: z.string().min(1),
    target_block_id: z.string().min(1),
    issue_type: z.string().min(1),
    severity: IssueSeverityEnum,
    message: z.string().min(1),
    schema_version: z.literal("issue@0.1.0"),
});
const PatchOpEnum = z.enum(["replace_block"]);
const PatchIntentSchema = z.object({
    op: PatchOpEnum,
    target_block_id: z.string().min(1),
    replacement_text: z.string().min(1).max(10000),
    replacement_linked_architecture_blocks: z.array(z.string()).optional(), // P7a
    replacement_linked_interface_blocks: z.array(z.string()).optional(), // P7b
});
const PatchProposalV010Schema = z.object({
    proposal_id: z.string().min(1),
    artifact_id: z.string().min(1),
    base_revision_id: z.string().min(1),
    source_issue_ids: z.array(z.string().min(1)).min(1),
    operations: z.array(PatchIntentSchema).min(1),
    schema_version: z.literal("patch_proposal@0.1.0"),
});
const ReplaceBlockOperationSchema = z.object({
    op: z.literal("replace_block"),
    target_block_id: z.string().min(1),
    expected_old_hash: z.string().min(1),
    new_block: CommitmentBlockSchema,
});
const OverrideTypeEnum = z.enum([
    "accept_failed_gate",
    "accept_with_known_risk",
    "manual_replace_block",
    "defer_issue",
    "request_targeted_rewrite",
]);
const OverridePatchV010Schema = z.object({
    override_id: z.string().min(1),
    artifact_id: z.string().min(1),
    base_revision_id: z.string().min(1),
    override_type: OverrideTypeEnum,
    operator: z.object({
        type: z.literal("human"),
        id: z.string().min(1),
    }),
    failed_gates: z.array(z.string()),
    affected_issue_ids: z.array(z.string()),
    operations: z.array(ReplaceBlockOperationSchema).optional(),
    rationale: z.string().min(1),
    risk_acceptance: z
        .object({
        accepted_risks: z.array(z.string()),
        mitigation_plan: z.string().optional(),
        revisit_condition: z.string().optional(),
    })
        .optional(),
    timestamp: z.string().min(1),
    schema_version: z.literal("override_patch@0.1.0"),
});
// ---------------------------------------------------------------------------
// Registry  – ref: S-03
// ---------------------------------------------------------------------------
/**
 * The schema registry maps schema_version strings to their Zod validators.
 * Each entry represents a specific version of a specific object type.
 */
const schemaRegistry = {
    "architecture_draft@0.1.0": ArchitectureDraftV010Schema,
    "interface_spec@0.1.0": InterfaceSpecV010Schema, // P7a
    "module_spec@0.1.0": ModuleSpecV010Schema, // P7b
    "issue@0.1.0": IssueV010Schema,
    "patch_proposal@0.1.0": PatchProposalV010Schema,
    "override_patch@0.1.0": OverridePatchV010Schema,
};
/**
 * Current (latest) schema versions for write-path enforcement.
 * Maps object type prefix to its current version string.
 */
const currentVersions = {
    architecture_draft: "architecture_draft@0.1.0",
    interface_spec: "interface_spec@0.1.0", // P7a
    module_spec: "module_spec@0.1.0", // P7b
    issue: "issue@0.1.0",
    patch_proposal: "patch_proposal@0.1.0",
    override_patch: "override_patch@0.1.0",
};
/**
 * Get the Zod schema for a given schema_version string.
 * Returns undefined if the version is unknown.
 */
export function getSchema(schemaVersion) {
    return schemaRegistry[schemaVersion];
}
/**
 * Get the current (latest) schema version for an object type.
 *
 * @param objectType – e.g. "architecture_draft", "issue"
 */
export function getCurrentVersion(objectType) {
    return currentVersions[objectType];
}
/**
 * Validate for WRITE path.
 *
 * ref: S-02 – "Write path strict."
 *
 * The object MUST have a schema_version field that matches the current
 * version for its type. Validation is strict against the current schema.
 *
 * @param objectType – e.g. "architecture_draft"
 * @param data – the object to validate
 */
export function validateForWrite(objectType, data) {
    const currentVersion = currentVersions[objectType];
    if (!currentVersion) {
        return { valid: false, errors: [`Unknown object type: ${objectType}`] };
    }
    const schema = schemaRegistry[currentVersion];
    if (!schema) {
        return {
            valid: false,
            errors: [`No schema registered for version: ${currentVersion}`],
        };
    }
    // Verify schema_version matches current
    if (typeof data === "object" &&
        data !== null &&
        "schema_version" in data &&
        data.schema_version !== currentVersion) {
        return {
            valid: false,
            errors: [
                `Write path requires current schema version "${currentVersion}", ` +
                    `got "${data.schema_version}"`,
            ],
        };
    }
    const result = schema.safeParse(data);
    if (result.success) {
        return { valid: true, data: result.data };
    }
    return {
        valid: false,
        errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
}
/**
 * Validate for READ path.
 *
 * ref: S-02 – "Read path tolerant."
 *
 * The object is validated against its OWN schema_version.
 * This allows old revisions to be read with their original schema,
 * without being killed by newer schema requirements.
 *
 * @param data – the object to validate (must have schema_version field)
 */
export function validateForRead(data) {
    if (typeof data !== "object" || data === null) {
        return { valid: false, errors: ["Data must be a non-null object"] };
    }
    const obj = data;
    if (!obj.schema_version || typeof obj.schema_version !== "string") {
        return { valid: false, errors: ["Missing or invalid schema_version field"] };
    }
    const schema = schemaRegistry[obj.schema_version];
    if (!schema) {
        return {
            valid: false,
            errors: [`Unknown schema_version: "${obj.schema_version}"`],
        };
    }
    const result = schema.safeParse(data);
    if (result.success) {
        return { valid: true, data: result.data };
    }
    return {
        valid: false,
        errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
}
/** Registry for future migrations. Empty in MVP. */
const migrationRegistry = [];
/**
 * Find a migration path from one schema version to another.
 * MVP: Always returns undefined (no migrations implemented).
 */
export function findMigration(from, to) {
    return migrationRegistry.find((m) => m.from === from && m.to === to);
}
/**
 * Register a migration. For future use.
 */
export function registerMigration(migration) {
    migrationRegistry.push(migration);
}
// ---------------------------------------------------------------------------
// Re-exports for testing / direct use
// ---------------------------------------------------------------------------
export { schemaRegistry, currentVersions, ArchitectureDraftV010Schema, InterfaceSpecV010Schema, ModuleSpecV010Schema, IssueV010Schema, PatchProposalV010Schema, OverridePatchV010Schema, };
//# sourceMappingURL=schemaRegistry.js.map
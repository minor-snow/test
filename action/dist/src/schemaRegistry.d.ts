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
import { z, type ZodSchema } from "zod";
/** ref: S-01, S-03 */
declare const ArchitectureDraftV010Schema: z.ZodObject<{
    artifact_id: z.ZodString;
    artifact_type: z.ZodEnum<{
        ArchitectureDraft: "ArchitectureDraft";
        Constitution: "Constitution";
        InterfaceSpec: "InterfaceSpec";
        ModuleSpec: "ModuleSpec";
        DecisionLog: "DecisionLog";
        RiskRegister: "RiskRegister";
    }>;
    schema_version: z.ZodLiteral<"architecture_draft@0.1.0">;
    revision_id: z.ZodString;
    parent_revision_id: z.ZodOptional<z.ZodString>;
    sections: z.ZodArray<z.ZodObject<{
        section_id: z.ZodString;
        title: z.ZodString;
        commitments: z.ZodArray<z.ZodObject<{
            block_id: z.ZodString;
            type: z.ZodEnum<{
                decision: "decision";
                module: "module";
                interface: "interface";
                invariant: "invariant";
                mechanism: "mechanism";
                constraint: "constraint";
                risk: "risk";
                state_machine: "state_machine";
                open_question: "open_question";
            }>;
            text: z.ZodString;
            rationale: z.ZodOptional<z.ZodString>;
            terms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_architecture_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_interface_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            status: z.ZodEnum<{
                suspect: "suspect";
                approved: "approved";
                candidate: "candidate";
                draft: "draft";
                revoked: "revoked";
            }>;
            content_hash: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    metadata: z.ZodObject<{
        created_by: z.ZodOptional<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        updated_at: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/** P7a: InterfaceSpec schema */
declare const InterfaceSpecV010Schema: z.ZodObject<{
    artifact_id: z.ZodString;
    artifact_type: z.ZodEnum<{
        ArchitectureDraft: "ArchitectureDraft";
        Constitution: "Constitution";
        InterfaceSpec: "InterfaceSpec";
        ModuleSpec: "ModuleSpec";
        DecisionLog: "DecisionLog";
        RiskRegister: "RiskRegister";
    }>;
    schema_version: z.ZodLiteral<"interface_spec@0.1.0">;
    revision_id: z.ZodString;
    parent_revision_id: z.ZodOptional<z.ZodString>;
    sections: z.ZodArray<z.ZodObject<{
        section_id: z.ZodString;
        title: z.ZodString;
        commitments: z.ZodArray<z.ZodObject<{
            block_id: z.ZodString;
            type: z.ZodEnum<{
                decision: "decision";
                module: "module";
                interface: "interface";
                invariant: "invariant";
                mechanism: "mechanism";
                constraint: "constraint";
                risk: "risk";
                state_machine: "state_machine";
                open_question: "open_question";
            }>;
            text: z.ZodString;
            rationale: z.ZodOptional<z.ZodString>;
            terms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_architecture_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_interface_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            status: z.ZodEnum<{
                suspect: "suspect";
                approved: "approved";
                candidate: "candidate";
                draft: "draft";
                revoked: "revoked";
            }>;
            content_hash: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    metadata: z.ZodObject<{
        created_by: z.ZodOptional<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        updated_at: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/** P7b: ModuleSpec schema */
declare const ModuleSpecV010Schema: z.ZodObject<{
    artifact_id: z.ZodString;
    artifact_type: z.ZodEnum<{
        ArchitectureDraft: "ArchitectureDraft";
        Constitution: "Constitution";
        InterfaceSpec: "InterfaceSpec";
        ModuleSpec: "ModuleSpec";
        DecisionLog: "DecisionLog";
        RiskRegister: "RiskRegister";
    }>;
    schema_version: z.ZodLiteral<"module_spec@0.1.0">;
    revision_id: z.ZodString;
    parent_revision_id: z.ZodOptional<z.ZodString>;
    sections: z.ZodArray<z.ZodObject<{
        section_id: z.ZodString;
        title: z.ZodString;
        commitments: z.ZodArray<z.ZodObject<{
            block_id: z.ZodString;
            type: z.ZodEnum<{
                decision: "decision";
                module: "module";
                interface: "interface";
                invariant: "invariant";
                mechanism: "mechanism";
                constraint: "constraint";
                risk: "risk";
                state_machine: "state_machine";
                open_question: "open_question";
            }>;
            text: z.ZodString;
            rationale: z.ZodOptional<z.ZodString>;
            terms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_architecture_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_interface_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            status: z.ZodEnum<{
                suspect: "suspect";
                approved: "approved";
                candidate: "candidate";
                draft: "draft";
                revoked: "revoked";
            }>;
            content_hash: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    metadata: z.ZodObject<{
        created_by: z.ZodOptional<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        updated_at: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const IssueV010Schema: z.ZodObject<{
    issue_id: z.ZodString;
    artifact_id: z.ZodString;
    base_revision_id: z.ZodString;
    target_block_id: z.ZodString;
    issue_type: z.ZodString;
    severity: z.ZodEnum<{
        critical: "critical";
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    message: z.ZodString;
    schema_version: z.ZodLiteral<"issue@0.1.0">;
}, z.core.$strip>;
declare const PatchProposalV010Schema: z.ZodObject<{
    proposal_id: z.ZodString;
    artifact_id: z.ZodString;
    base_revision_id: z.ZodString;
    source_issue_ids: z.ZodArray<z.ZodString>;
    operations: z.ZodArray<z.ZodObject<{
        op: z.ZodEnum<{
            replace_block: "replace_block";
        }>;
        target_block_id: z.ZodString;
        replacement_text: z.ZodString;
        replacement_linked_architecture_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        replacement_linked_interface_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    schema_version: z.ZodLiteral<"patch_proposal@0.1.0">;
}, z.core.$strip>;
declare const OverridePatchV010Schema: z.ZodObject<{
    override_id: z.ZodString;
    artifact_id: z.ZodString;
    base_revision_id: z.ZodString;
    override_type: z.ZodEnum<{
        accept_failed_gate: "accept_failed_gate";
        accept_with_known_risk: "accept_with_known_risk";
        manual_replace_block: "manual_replace_block";
        defer_issue: "defer_issue";
        request_targeted_rewrite: "request_targeted_rewrite";
    }>;
    operator: z.ZodObject<{
        type: z.ZodLiteral<"human">;
        id: z.ZodString;
    }, z.core.$strip>;
    failed_gates: z.ZodArray<z.ZodString>;
    affected_issue_ids: z.ZodArray<z.ZodString>;
    operations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        op: z.ZodLiteral<"replace_block">;
        target_block_id: z.ZodString;
        expected_old_hash: z.ZodString;
        new_block: z.ZodObject<{
            block_id: z.ZodString;
            type: z.ZodEnum<{
                decision: "decision";
                module: "module";
                interface: "interface";
                invariant: "invariant";
                mechanism: "mechanism";
                constraint: "constraint";
                risk: "risk";
                state_machine: "state_machine";
                open_question: "open_question";
            }>;
            text: z.ZodString;
            rationale: z.ZodOptional<z.ZodString>;
            terms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_architecture_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked_interface_blocks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            status: z.ZodEnum<{
                suspect: "suspect";
                approved: "approved";
                candidate: "candidate";
                draft: "draft";
                revoked: "revoked";
            }>;
            content_hash: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    rationale: z.ZodString;
    risk_acceptance: z.ZodOptional<z.ZodObject<{
        accepted_risks: z.ZodArray<z.ZodString>;
        mitigation_plan: z.ZodOptional<z.ZodString>;
        revisit_condition: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    timestamp: z.ZodString;
    schema_version: z.ZodLiteral<"override_patch@0.1.0">;
}, z.core.$strip>;
/**
 * The schema registry maps schema_version strings to their Zod validators.
 * Each entry represents a specific version of a specific object type.
 */
declare const schemaRegistry: Record<string, ZodSchema>;
/**
 * Current (latest) schema versions for write-path enforcement.
 * Maps object type prefix to its current version string.
 */
declare const currentVersions: Record<string, string>;
export type ValidationResult = {
    valid: true;
    data: unknown;
} | {
    valid: false;
    errors: string[];
};
/**
 * Get the Zod schema for a given schema_version string.
 * Returns undefined if the version is unknown.
 */
export declare function getSchema(schemaVersion: string): ZodSchema | undefined;
/**
 * Get the current (latest) schema version for an object type.
 *
 * @param objectType – e.g. "architecture_draft", "issue"
 */
export declare function getCurrentVersion(objectType: string): string | undefined;
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
export declare function validateForWrite(objectType: string, data: unknown): ValidationResult;
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
export declare function validateForRead(data: unknown): ValidationResult;
/**
 * Migration definition.
 *
 * ref: S-04 – "Migration must be explicit."
 *
 * MVP: Interface defined, no migrations implemented.
 * Future migrations will be registered here.
 */
export type Migration = {
    from: string;
    to: string;
    migrate: (input: unknown) => unknown;
};
/**
 * Find a migration path from one schema version to another.
 * MVP: Always returns undefined (no migrations implemented).
 */
export declare function findMigration(from: string, to: string): Migration | undefined;
/**
 * Register a migration. For future use.
 */
export declare function registerMigration(migration: Migration): void;
export { schemaRegistry, currentVersions, ArchitectureDraftV010Schema, InterfaceSpecV010Schema, ModuleSpecV010Schema, IssueV010Schema, PatchProposalV010Schema, OverridePatchV010Schema, };

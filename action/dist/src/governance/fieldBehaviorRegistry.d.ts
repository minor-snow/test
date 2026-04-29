/**
 * P18.5-A: Field Behavior Registry
 *
 * Declares the expected and forbidden behaviors of critical schema fields
 * across Pantheon's governance and repair types. Each entry specifies:
 *
 *   - Which modules MUST use the field (and how)
 *   - Which modules MUST NOT use the field (and why)
 *   - Negative test references that prove the forbidden behavior is blocked
 *
 * This complements gateRegistry.ts (which declares gate-level invariants)
 * by covering field-level semantic invariants that gates alone do not capture.
 *
 * ref: P18.5-A
 */
export type FieldBehaviorEntry = {
    /** Unique identifier for this behavior rule */
    readonly id: string;
    /** The schema / type that owns this field */
    readonly schema: string;
    /** The field name or path within the schema */
    readonly field: string;
    /** Severity if violated */
    readonly severity: "critical" | "high" | "medium";
    /** What this field is expected to influence */
    readonly expected_behavior: string;
    /** What this field must NEVER influence */
    readonly forbidden_behavior?: string;
    /** Modules that must read/use this field */
    readonly modules_that_must_use?: readonly string[];
    /** Modules that must NOT read/use this field */
    readonly modules_that_must_not_use?: readonly string[];
    /** Test files that prove the expected behavior */
    readonly positive_tests: readonly string[];
    /** Test files that prove the forbidden behavior is blocked */
    readonly negative_tests: readonly string[];
};
export declare const FIELD_BEHAVIOR_REGISTRY: readonly FieldBehaviorEntry[];
export declare function getFieldBehaviorById(id: string): FieldBehaviorEntry | undefined;
export declare function getFieldBehaviorsBySchema(schema: string): readonly FieldBehaviorEntry[];
export declare function getCriticalFieldBehaviors(): readonly FieldBehaviorEntry[];
export declare function getFieldBehaviorsWithForbidden(): readonly FieldBehaviorEntry[];

/**
 * Kotlin Code Generator — Deterministic code generation from handoff package
 *
 * ref: P12-001
 *
 * Input: ImplementationHandoffPackage (from handoff_package.json)
 * Output: Kotlin source files (entities, DTOs, enums, state machine validators,
 *         conflict policy mapping, conflict policy tests)
 *
 * CONSTRAINTS:
 * - Input is ONLY handoff_package.json. No access to upstream P10 artifacts.
 * - Unknown type → generation failure (no silent String fallback).
 * - All generated files include provenance header.
 * - All field names, enum values, state machine transitions are 1:1 with handoff.
 */
import type { ImplementationHandoffPackage } from "../handoff/types.js";
export type KotlinGeneratorOutput = {
    files: Array<{
        fileName: string;
        content: string;
    }>;
    metrics: {
        entity_count: number;
        dto_count: number;
        enum_count: number;
        state_machine_count: number;
        conflict_policy_groups: number;
        total_fields: number;
        allowed_transitions: number;
        forbidden_transitions: number;
        interface_count: number;
        guard_count: number;
        contract_test_count: number;
        todo_stub_count: number;
    };
    package_hash: string;
};
export declare function generateKotlin(pkg: ImplementationHandoffPackage): KotlinGeneratorOutput;

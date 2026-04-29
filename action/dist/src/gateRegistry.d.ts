/**
 * P18.1: Gate Completeness Registry
 *
 * Every deterministic gate in Pantheon declares what it checks,
 * what it explicitly does NOT check, its fail-closed cases,
 * and which regression tests prove it is wired correctly.
 *
 * Purpose: Prevent "gate gap" bugs — the #1 systemic risk pattern
 * identified across 40 bugs in P2–P18.
 *
 * ref: P18.1
 */
export type RegressionTest = {
    file: string;
    name: string;
};
export type GateCompletenessEntry = {
    gate_id: string;
    gate_name: string;
    source_file: string;
    entry_function: string;
    phase_introduced: string;
    /** Fields this gate is the PRIMARY validator for */
    primary_owned_fields: string[];
    /** Fields this gate reads/observes but doesn't primarily own */
    observed_fields: string[];
    /** What this gate explicitly checks */
    required_checks: string[];
    /** What this gate explicitly does NOT check (known non-goals) */
    known_non_goals: string[];
    /** Inputs that MUST cause this gate to fail */
    fail_closed_cases: string[];
    /** Tests that prove this gate is wired and exercised */
    regression_tests: RegressionTest[];
};
export declare const GATE_REGISTRY: GateCompletenessEntry[];
export declare function getGateById(id: string): GateCompletenessEntry | undefined;
export declare function getGatesByPhase(phase: string): GateCompletenessEntry[];
export declare function getAllGateIds(): string[];

/**
 * P15.2 — Localized Report Renderer
 *
 * Renders blast radius reports and implementation contexts in en or zh-CN.
 * Technical IDs (node_id, file paths, symbol names) are NEVER translated.
 *
 * Used by CLI and cockpit alike.
 */
export type Locale = "en" | "zh-CN";
export interface BlastRadiusReportInput {
    changed_nodes: string[];
    direct: number;
    downstream: number;
    files: number;
    symbols: number;
    tests: number;
    highest_risk: "high" | "medium" | "low";
    affected_files: string[];
    affected_tests: string[];
    risk_amplifications: Array<{
        node_id: string;
        risk_level: "high" | "medium" | "low";
        kind: string;
    }>;
    critical_paths: Array<{
        nodes: string[];
        risk_level: "high" | "medium" | "low";
    }>;
}
/** Render a blast radius markdown report in the given locale. */
export declare function renderLocalizedReport(input: BlastRadiusReportInput, locale: Locale): string;
/** Render a scoped implementation context in the given locale. */
export declare function renderLocalizedContext(input: {
    affected_files: string[];
    affected_tests: string[];
    constraints: string[];
}, locale: Locale): string;

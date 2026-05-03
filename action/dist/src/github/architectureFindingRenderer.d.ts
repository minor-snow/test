/**
 * P30-13: GitHub adapter for the shared architecture finding renderer.
 *
 * GitHub comments need a compact section header plus base-branch disclosure,
 * but the wording, severity grouping, and sanitization stay owned by the
 * platform-neutral renderer in `src/architecture/architectureFindingRenderer.ts`.
 */
export type ArchitectureFindingForRender = {
    kind: string;
    message: string;
    severity: string;
    files?: string[];
};
export declare function renderArchitectureFindingsSection(findings: ArchitectureFindingForRender[], baseSha: string | null): string;

export type ArchitectureFindingForRender = {
    kind: string;
    message: string;
    severity: string;
    files?: string[];
};
export declare function renderArchitectureFindingsSection(findings: ArchitectureFindingForRender[], baseSha: string | null): string;

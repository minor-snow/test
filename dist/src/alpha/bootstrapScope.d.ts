export type DiffFileClass = "bootstrap_init" | "bootstrap_artifact" | "business" | "ignored";
export declare function getBootstrapInitFilePatterns(): string[];
export declare function getBootstrapArtifactPatterns(): string[];
export declare function classifyBootstrapDiffFile(filePath: string): DiffFileClass;
export declare function isMixedBootstrapAndRepair(changedFiles: string[]): boolean;

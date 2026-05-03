/**
 * P30: Architecture Artifact Layout
 *
 * Canonical directory structure for architecture governance artifacts.
 * Follows the same pattern as `repair/repairArtifactLayout.ts`.
 *
 * Layout:
 *   .pantheon/architecture/
 *     runs/<arch_id>/
 *       ingest_run.json
 *       architecture_claims.json
 *       architecture_evidence.json
 *       architecture_relations.json
 *       architecture_mapping_review.md
 *       architecture_overrides.jsonl
 *     architecture_contract.json          # active contract
 *     architecture_contract.md            # human-readable contract summary
 *     architecture_contract_hash.txt      # contract hash for quick comparison
 *
 * ref: P30
 */
export type ArchitectureRootPaths = {
    readonly dir: string;
    readonly runsDir: string;
    readonly activeContract: string;
    readonly activeContractMd: string;
    readonly activeContractHash: string;
};
export type ArchitectureRunPaths = {
    readonly root: ArchitectureRootPaths;
    readonly archId: string;
    readonly dir: string;
    readonly ingestRun: string;
    readonly claims: string;
    readonly evidence: string;
    readonly relations: string;
    readonly mappingReview: string;
    readonly overrides: string;
};
export declare function resolveArchitectureDir(repoRoot: string): string;
export declare function ensureArchitectureDirs(repoRoot: string): void;
export declare function ensureArchitectureRunDir(repoRoot: string, archId: string): void;
export declare function architectureRootPaths(repoRoot: string): ArchitectureRootPaths;
export declare function architectureRunPaths(repoRoot: string, archId: string): ArchitectureRunPaths;

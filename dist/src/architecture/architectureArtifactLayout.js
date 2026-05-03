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
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ensurePantheonDirs, resolvePantheonDir } from "../cli/artifactLayout.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function resolveArchitectureDir(repoRoot) {
    return join(resolvePantheonDir(repoRoot), "architecture");
}
export function ensureArchitectureDirs(repoRoot) {
    ensurePantheonDirs(repoRoot);
    const root = architectureRootPaths(repoRoot);
    mkdirSync(root.dir, { recursive: true });
    mkdirSync(root.runsDir, { recursive: true });
}
export function ensureArchitectureRunDir(repoRoot, archId) {
    ensureArchitectureDirs(repoRoot);
    const runDir = join(architectureRootPaths(repoRoot).runsDir, archId);
    mkdirSync(runDir, { recursive: true });
}
export function architectureRootPaths(repoRoot) {
    const dir = resolveArchitectureDir(repoRoot);
    return {
        dir,
        runsDir: join(dir, "runs"),
        activeContract: join(dir, "architecture_contract.json"),
        activeContractMd: join(dir, "architecture_contract.md"),
        activeContractHash: join(dir, "architecture_contract_hash.txt"),
    };
}
export function architectureRunPaths(repoRoot, archId) {
    const root = architectureRootPaths(repoRoot);
    const dir = join(root.runsDir, archId);
    return {
        root,
        archId,
        dir,
        ingestRun: join(dir, "ingest_run.json"),
        claims: join(dir, "architecture_claims.json"),
        evidence: join(dir, "architecture_evidence.json"),
        relations: join(dir, "architecture_relations.json"),
        mappingReview: join(dir, "architecture_mapping_review.md"),
        overrides: join(dir, "architecture_overrides.jsonl"),
    };
}
//# sourceMappingURL=architectureArtifactLayout.js.map
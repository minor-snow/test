/**
 * Integrity Check – Read-Only Store Validator
 *
 * ref: HARD-002
 *
 * This module performs a read-only scan of the data directory and reports
 * all integrity violations. It never modifies data.
 *
 * Checks:
 *   1. Canonical pointer → revision exists
 *   2. Revision JSON parseable + schema_version registered
 *   2c. Revision structural shape (sections/commitments exist)
 *   3. Block content_hash recomputation match
 *   4. Recomputed revision_id == filename & in-file revision_id
 *   5. parent_revision_id chain continuity
 *   6. Orphan revisions (no canonical path reaches them)
 *   7. Audit log parseable + missing critical events + canonical continuity
 *   8. .tmp leftover files
 */
import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import { computeBlockContentHash, computeRevisionId } from "./hash.js";
import { getSchema } from "./schemaRegistry.js";
import { lintArtifact } from "./linter.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function dirExists(path) {
    try {
        const stat = await fs.stat(path);
        return stat.isDirectory();
    }
    catch {
        return false;
    }
}
async function fileExists(path) {
    try {
        const stat = await fs.stat(path);
        return stat.isFile();
    }
    catch {
        return false;
    }
}
async function listJsonFiles(dirPath) {
    try {
        const entries = await fs.readdir(dirPath);
        return entries.filter((f) => f.endsWith(".json"));
    }
    catch {
        return [];
    }
}
async function listAllFiles(dirPath) {
    try {
        return await fs.readdir(dirPath);
    }
    catch {
        return [];
    }
}
async function tryParseJson(filePath) {
    try {
        const content = await fs.readFile(filePath, "utf8");
        return { ok: true, data: JSON.parse(content) };
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
}
// ---------------------------------------------------------------------------
// Check 8: .tmp leftover files (scan all subdirectories)
// ---------------------------------------------------------------------------
async function checkTmpFiles(config, findings) {
    const subdirs = ["revisions", "canonical", "audit", "quarantine", "evidence", "projections"];
    for (const subdir of subdirs) {
        const dirPath = join(config.dataDir, subdir);
        if (!(await dirExists(dirPath)))
            continue;
        const entries = await listAllFiles(dirPath);
        // Check top-level .tmp files
        for (const entry of entries) {
            if (entry.endsWith(".tmp")) {
                findings.push({
                    check: "tmp_leftover",
                    severity: "warning",
                    artifact_id: subdir,
                    message: `Leftover .tmp file: ${subdir}/${entry}`,
                });
            }
        }
        // For revisions, also check subdirectories
        if (subdir === "revisions") {
            for (const entry of entries) {
                const subPath = join(dirPath, entry);
                if (await dirExists(subPath)) {
                    const subFiles = await listAllFiles(subPath);
                    for (const f of subFiles) {
                        if (f.endsWith(".tmp")) {
                            findings.push({
                                check: "tmp_leftover",
                                severity: "warning",
                                artifact_id: entry,
                                message: `Leftover .tmp file: revisions/${entry}/${f}`,
                            });
                        }
                    }
                }
            }
        }
    }
}
// ---------------------------------------------------------------------------
// Per-artifact checks
// ---------------------------------------------------------------------------
async function checkArtifact(config, artifactId, findings, stats) {
    const revisionsPath = join(config.dataDir, "revisions", artifactId);
    const canonicalFile = join(config.dataDir, "canonical", `${artifactId}.json`);
    const auditFile = join(config.dataDir, "audit", `${artifactId}.jsonl`);
    // Collect all revision files
    const revisionFiles = await listJsonFiles(revisionsPath);
    const allRevisionIds = new Set(revisionFiles.map((f) => basename(f, ".json")));
    // Track reachable revisions (from canonical via parent chain)
    const reachableRevisions = new Set();
    // ── Check 1: Canonical pointer → revision exists ──
    let canonicalRevisionId = null;
    if (await fileExists(canonicalFile)) {
        const parseResult = await tryParseJson(canonicalFile);
        if (!parseResult.ok) {
            findings.push({
                check: "canonical_parse",
                severity: "corrupt",
                artifact_id: artifactId,
                message: `Canonical pointer unparseable: ${parseResult.error}`,
            });
        }
        else {
            const raw = parseResult.data;
            // Shape guard: canonical pointer must be a non-null object
            // with a string current_revision_id field.
            if (typeof raw !== "object" ||
                raw === null ||
                Array.isArray(raw)) {
                findings.push({
                    check: "canonical_shape_invalid",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    message: `Canonical pointer file is valid JSON but not an object ` +
                        `(got ${raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw})`,
                });
            }
            else if (typeof raw.current_revision_id !== "string" ||
                raw.current_revision_id === "") {
                findings.push({
                    check: "canonical_shape_invalid",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    message: `Canonical pointer missing or invalid \"current_revision_id\" field`,
                });
            }
            else if (typeof raw.artifact_id !== "string" ||
                raw.artifact_id === "") {
                findings.push({
                    check: "canonical_shape_invalid",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    message: `Canonical pointer missing or invalid \"artifact_id\" field`,
                });
            }
            else if (raw.artifact_id !== artifactId) {
                findings.push({
                    check: "canonical_shape_invalid",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    message: `Canonical pointer artifact_id \"${raw.artifact_id}\" ` +
                        `does not match expected \"${artifactId}\"`,
                });
            }
            else {
                canonicalRevisionId = raw.current_revision_id;
                const revFile = join(revisionsPath, `${canonicalRevisionId}.json`);
                if (!(await fileExists(revFile))) {
                    findings.push({
                        check: "canonical_target_missing",
                        severity: "corrupt",
                        artifact_id: artifactId,
                        revision_id: canonicalRevisionId,
                        message: `Canonical pointer references non-existent revision "${canonicalRevisionId}"`,
                    });
                }
            }
        }
    }
    // ── Check 2-5: Per-revision checks ──
    const revisionMap = new Map();
    for (const revFile of revisionFiles) {
        const revId = basename(revFile, ".json");
        const filePath = join(revisionsPath, revFile);
        stats.revisions_scanned++;
        // Check 2a: JSON parseable
        const parseResult = await tryParseJson(filePath);
        if (!parseResult.ok) {
            findings.push({
                check: "revision_parse",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Revision JSON unparseable: ${parseResult.error}`,
            });
            continue;
        }
        const parsed = parseResult.data;
        // Check 2a-bis: parsed value must be a non-null object (not array/primitive)
        // JSON.parse("null"), JSON.parse("[]"), JSON.parse("123") all succeed
        // but are not valid revision objects.
        if (typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)) {
            findings.push({
                check: "revision_shape_invalid",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Revision file is valid JSON but not an object (got ${parsed === null ? "null" : Array.isArray(parsed) ? "array" : typeof parsed})`,
            });
            continue;
        }
        const artifact = parsed;
        revisionMap.set(revId, artifact);
        // Check 2b: schema_version is registered
        if (!artifact.schema_version) {
            findings.push({
                check: "schema_version_missing",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Revision missing schema_version field`,
            });
        }
        else if (!getSchema(artifact.schema_version)) {
            findings.push({
                check: "schema_version_unknown",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Unknown schema_version "${artifact.schema_version}" (not registered)`,
            });
        }
        // Check 2c: Structural shape validation
        // sections and commitments must exist before we attempt hash/revision checks
        if (!artifact.sections ||
            !Array.isArray(artifact.sections) ||
            !artifact.sections.every((s) => typeof s === "object" &&
                s !== null &&
                "commitments" in s &&
                Array.isArray(s.commitments))) {
            findings.push({
                check: "revision_shape_invalid",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Revision has invalid structure: "sections" or "commitments" missing or malformed`,
            });
            // Skip checks 3 and 4 — they would throw on bad shape
            continue;
        }
        // Check 3: Block content_hash recomputation
        try {
            for (const section of artifact.sections) {
                for (const block of section.commitments) {
                    const recomputed = computeBlockContentHash(block);
                    if (block.content_hash !== recomputed) {
                        findings.push({
                            check: "block_content_hash_mismatch",
                            severity: "corrupt",
                            artifact_id: artifactId,
                            revision_id: revId,
                            message: `Block "${block.block_id}": stored hash "${block.content_hash}" ` +
                                `does not match recomputed "${recomputed}"`,
                        });
                    }
                }
            }
        }
        catch (err) {
            findings.push({
                check: "block_hash_computation_error",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Failed to recompute block hashes: ${err.message}`,
            });
        }
        // Check 4: Recomputed revision_id == filename and in-file revision_id
        try {
            const recomputedRevId = computeRevisionId(artifact);
            // 4a: in-file revision_id matches filename
            if (artifact.revision_id !== revId) {
                findings.push({
                    check: "revision_id_filename_mismatch",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    revision_id: revId,
                    message: `In-file revision_id "${artifact.revision_id}" does not match filename "${revId}"`,
                });
            }
            // 4b: recomputed revision_id matches stored
            if (recomputedRevId !== artifact.revision_id) {
                findings.push({
                    check: "revision_id_recomputation_mismatch",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    revision_id: revId,
                    message: `Recomputed revision_id "${recomputedRevId}" does not match stored "${artifact.revision_id}"`,
                });
            }
        }
        catch (err) {
            findings.push({
                check: "revision_id_computation_error",
                severity: "corrupt",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Failed to recompute revision_id: ${err.message}`,
            });
        }
    }
    // Check 5: parent_revision_id chain continuity
    for (const [revId, artifact] of revisionMap) {
        if (artifact.parent_revision_id) {
            if (!allRevisionIds.has(artifact.parent_revision_id)) {
                findings.push({
                    check: "parent_chain_broken",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    revision_id: revId,
                    message: `parent_revision_id "${artifact.parent_revision_id}" does not exist. Chain is broken.`,
                });
            }
        }
    }
    // ── Check 6: Orphan revisions ──
    // Walk from canonical revision back through parent chain
    if (canonicalRevisionId && allRevisionIds.has(canonicalRevisionId)) {
        let currentId = canonicalRevisionId;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            reachableRevisions.add(currentId);
            const rev = revisionMap.get(currentId);
            currentId = rev?.parent_revision_id;
        }
    }
    for (const revId of allRevisionIds) {
        if (!reachableRevisions.has(revId)) {
            findings.push({
                check: "orphan_revision",
                severity: "warning",
                artifact_id: artifactId,
                revision_id: revId,
                message: `Revision "${revId}" is not reachable from canonical pointer (orphan)`,
            });
        }
    }
    // ── Check 7: Audit log ──
    if (await fileExists(auditFile)) {
        try {
            const content = await fs.readFile(auditFile, "utf8");
            const lines = content.trim().split("\n").filter((l) => l.length > 0);
            let hasArtifactCreated = false;
            // Track revision_ids that have audit coverage
            const auditedRevisionIds = new Set();
            let lineNum = 0;
            for (const line of lines) {
                lineNum++;
                try {
                    const entry = JSON.parse(line);
                    if (entry.entry_type === "artifact_created") {
                        hasArtifactCreated = true;
                    }
                    // Track which revisions have audit events that explain
                    // how they became canonical.
                    //
                    // IMPORTANT: patch_applied does NOT qualify.
                    // patch_applied proves "candidate revision was created",
                    // not "candidate was promoted to canonical".
                    // Only canonicalization events count:
                    //   - artifact_created (initial revision only)
                    //   - canonical_updated
                    //   - override_applied
                    if (entry.entry_type === "artifact_created" ||
                        entry.entry_type === "canonical_updated" ||
                        entry.entry_type === "override_applied") {
                        if (entry.revision_id) {
                            auditedRevisionIds.add(entry.revision_id);
                        }
                    }
                }
                catch {
                    findings.push({
                        check: "audit_line_parse",
                        severity: "corrupt",
                        artifact_id: artifactId,
                        message: `Audit log line ${lineNum} is unparseable`,
                    });
                }
            }
            // Check: canonical revision should have an artifact_created event
            if (canonicalRevisionId && !hasArtifactCreated) {
                findings.push({
                    check: "audit_missing_created",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    message: `Audit log missing "artifact_created" event for artifact with canonical pointer`,
                });
            }
            // P2 Check: canonical revision must have a corresponding audit event
            // that explains how it became canonical
            if (canonicalRevisionId &&
                hasArtifactCreated &&
                !auditedRevisionIds.has(canonicalRevisionId)) {
                findings.push({
                    check: "audit_missing_canonical_event",
                    severity: "corrupt",
                    artifact_id: artifactId,
                    revision_id: canonicalRevisionId,
                    message: `Canonical revision "${canonicalRevisionId}" has no canonicalization event ` +
                        `(artifact_created, canonical_updated, or override_applied) ` +
                        `explaining how it became canonical. Possible partial write.`,
                });
            }
        }
        catch (err) {
            findings.push({
                check: "audit_read_error",
                severity: "corrupt",
                artifact_id: artifactId,
                message: `Cannot read audit log: ${err.message}`,
            });
        }
    }
    else if (canonicalRevisionId) {
        // Canonical exists but no audit log
        findings.push({
            check: "audit_missing",
            severity: "corrupt",
            artifact_id: artifactId,
            message: `No audit log found for artifact with canonical pointer`,
        });
    }
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Run a read-only integrity check on the entire data directory.
 *
 * ref: HARD-002 — "先不自动修, 只做报告"
 *
 * @returns IntegrityReport with all findings
 */
export async function integrityCheck(config) {
    const findings = [];
    const stats = { revisions_scanned: 0 };
    // Discover all artifact IDs from revisions/ directory
    const revisionsBase = join(config.dataDir, "revisions");
    const artifactIds = new Set();
    if (await dirExists(revisionsBase)) {
        const entries = await fs.readdir(revisionsBase);
        for (const entry of entries) {
            if (await dirExists(join(revisionsBase, entry))) {
                artifactIds.add(entry);
            }
        }
    }
    // Also discover from canonical/ directory
    const canonicalBase = join(config.dataDir, "canonical");
    if (await dirExists(canonicalBase)) {
        const entries = await listJsonFiles(canonicalBase);
        for (const entry of entries) {
            artifactIds.add(basename(entry, ".json"));
        }
    }
    // Check each artifact
    for (const artifactId of artifactIds) {
        await checkArtifact(config, artifactId, findings, stats);
    }
    // Check .tmp leftover files
    await checkTmpFiles(config, findings);
    // P4-002: Count residual linter issues on canonical revisions
    let residualIssues = 0;
    const canonicalDir = join(config.dataDir, "canonical");
    if (await dirExists(canonicalDir)) {
        const canonicalFiles = await listJsonFiles(canonicalDir);
        for (const cf of canonicalFiles) {
            const aid = basename(cf, ".json");
            const canonicalFilePath = join(canonicalDir, cf);
            try {
                const rawCanonical = await fs.readFile(canonicalFilePath, "utf8");
                const pointer = JSON.parse(rawCanonical);
                if (pointer && pointer.current_revision_id) {
                    const revPath = join(config.dataDir, "revisions", aid, `${pointer.current_revision_id}.json`);
                    if (await fileExists(revPath)) {
                        const rawRev = await fs.readFile(revPath, "utf8");
                        const artifact = JSON.parse(rawRev);
                        if (artifact &&
                            typeof artifact === "object" &&
                            Array.isArray(artifact.sections)) {
                            const issues = lintArtifact(artifact);
                            residualIssues += issues.length;
                        }
                    }
                }
            }
            catch {
                // If canonical can't be loaded, skip residual check
                // (integrity findings already cover parse errors)
            }
        }
    }
    // Build summary
    const warnings = findings.filter((f) => f.severity === "warning").length;
    const corruptions = findings.filter((f) => f.severity === "corrupt").length;
    return {
        timestamp: new Date().toISOString(),
        data_dir: config.dataDir,
        findings,
        summary: {
            total: findings.length,
            warnings,
            corruptions,
            artifacts_scanned: artifactIds.size,
            revisions_scanned: stats.revisions_scanned,
            residual_issues: residualIssues,
        },
    };
}
//# sourceMappingURL=integrityCheck.js.map
/**
 * Trial Report Generator
 *
 * ref: Phase 5 P5-001
 *
 * Consumes trial data directory and produces a structured TrialReportData
 * for the Release Decision Cockpit. Not a JSON dump — a structured,
 * signable report.
 */

import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import { lintArtifact } from "../linter.js";
import { crossLintArtifacts } from "../crossArtifactLinter.js";
import { integrityCheck } from "../integrityCheck.js";
import { renderMarkdown } from "../renderMarkdown.js";
import type { Artifact, CanonicalPointer } from "../types.js";
import type { StoreConfig } from "../artifactStore.js";
import type {
  TrialReportData,
  ResidualSnapshot,
  ResidualIssue,
  CycleDigest,
  ThreeLayerStatus,
  MultiArtifactReportData,
  ArtifactReportSummary,
  CrossResidualSnapshot,
} from "./types.js";
import type { TrialReport } from "../trial/trialRunner.js";

// ---------------------------------------------------------------------------
// Build residual snapshot from canonical artifact
// ---------------------------------------------------------------------------

export function buildResidualSnapshot(artifact: Artifact): ResidualSnapshot {
  const issues = lintArtifact(artifact);

  // Build section map: block_id → { section_id, title }
  const sectionMap: Record<string, { section_id: string; title: string }> = {};
  for (const sec of artifact.sections) {
    for (const block of sec.commitments) {
      sectionMap[block.block_id] = {
        section_id: sec.section_id,
        title: sec.title,
      };
    }
  }

  const residualIssues: ResidualIssue[] = issues.map((i, idx) => {
    const sec = sectionMap[i.target_block_id];
    return {
      issue_id: i.issue_id || `residual_${idx + 1}`,
      block_id: i.target_block_id,
      section_id: sec?.section_id ?? "unknown",
      section_title: sec?.title ?? "Unknown",
      issue_type: i.issue_type,
      severity: i.severity,
      message: i.message,
    };
  });

  const by_severity: Record<string, number> = {};
  const by_type: Record<string, number> = {};
  const by_section: Record<string, number> = {};

  for (const ri of residualIssues) {
    by_severity[ri.severity] = (by_severity[ri.severity] || 0) + 1;
    by_type[ri.issue_type] = (by_type[ri.issue_type] || 0) + 1;
    const secLabel = `${ri.section_id} (${ri.section_title})`;
    by_section[secLabel] = (by_section[secLabel] || 0) + 1;
  }

  return {
    total: residualIssues.length,
    by_severity,
    by_type,
    by_section,
    issues: residualIssues,
  };
}

// ---------------------------------------------------------------------------
// Build cycle digests from trial report
// ---------------------------------------------------------------------------

function buildCycleDigests(trialReport: TrialReport): CycleDigest[] {
  return trialReport.cycles.map((c) => ({
    cycle: c.cycle,
    target_block_id: c.issue?.target_block_id ?? null,
    issue_type: c.issue?.issue_type ?? null,
    committed: c.committed,
    rejected: c.mechanicalRejection,
    override: c.overrideApplied,
  }));
}

// ---------------------------------------------------------------------------
// Load canonical artifact from trial store
// ---------------------------------------------------------------------------

export async function loadCanonicalArtifact(
  config: StoreConfig,
  artifactId: string
): Promise<{ artifact: Artifact; revisionId: string } | null> {
  const canonicalPath = join(config.dataDir, "canonical", `${artifactId}.json`);
  try {
    const raw = await fs.readFile(canonicalPath, "utf8");
    const pointer = JSON.parse(raw) as CanonicalPointer;
    if (!pointer?.current_revision_id) return null;

    const revPath = join(
      config.dataDir,
      "revisions",
      artifactId,
      `${pointer.current_revision_id}.json`
    );
    const revRaw = await fs.readFile(revPath, "utf8");
    const artifact = JSON.parse(revRaw) as Artifact;
    return { artifact, revisionId: pointer.current_revision_id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generate trial report data
// ---------------------------------------------------------------------------

export async function generateTrialReportData(
  config: StoreConfig,
  artifactId: string,
  trialReport: TrialReport
): Promise<TrialReportData> {
  // Load canonical artifact
  const canonical = await loadCanonicalArtifact(config, artifactId);
  if (!canonical) {
    throw new Error(`Cannot load canonical artifact: ${artifactId}`);
  }

  const { artifact, revisionId } = canonical;

  // Build residual snapshot
  const residual = buildResidualSnapshot(artifact);

  // Run integrity check
  const integrityReport = await integrityCheck(config);
  const integrityClean = integrityReport.summary.corruptions === 0;

  // Three-layer status
  const three_layer_status: ThreeLayerStatus = {
    integrity_clean: integrityClean,
    artifact_clean: residual.total === 0,
    document_coherent: false, // Always false until human fills coherence note
  };

  // Canonical preview
  const canonicalMd = renderMarkdown(artifact);
  const preview = canonicalMd.length > 1500
    ? canonicalMd.slice(0, 1500) + "\n\n…(truncated)"
    : canonicalMd;

  return {
    artifact_id: artifactId,
    artifact_type: artifact.artifact_type,
    canonical_revision_id: revisionId,
    schema_version: artifact.schema_version,
    timestamp: new Date().toISOString(),

    three_layer_status,

    total_cycles: trialReport.total_cycles,
    issues_found: trialReport.issues_found,
    issues_by_rule: trialReport.issues_by_rule,
    proposals_generated: trialReport.proposals_generated,
    proposals_accepted: trialReport.proposals_accepted,
    semantic_rejections: trialReport.proposals_rejected_semantic,
    natural_rejections: trialReport.natural_rejection_count,
    forced_rejections: trialReport.forced_rejection_count,
    overrides: trialReport.override_count,

    residual,
    cycles: buildCycleDigests(trialReport),

    canonical_markdown_preview: preview,

    integrity_corruptions: integrityReport.summary.corruptions,
    integrity_warnings: integrityReport.summary.warnings,
  };
}

// ---------------------------------------------------------------------------
// Standalone report from store (without trial report)
// ---------------------------------------------------------------------------

export async function generateReportFromStore(
  config: StoreConfig,
  artifactId: string
): Promise<TrialReportData> {
  const canonical = await loadCanonicalArtifact(config, artifactId);
  if (!canonical) {
    throw new Error(`Cannot load canonical artifact: ${artifactId}`);
  }

  const { artifact, revisionId } = canonical;
  const residual = buildResidualSnapshot(artifact);
  const integrityReport = await integrityCheck(config);
  const integrityClean = integrityReport.summary.corruptions === 0;

  const three_layer_status: ThreeLayerStatus = {
    integrity_clean: integrityClean,
    artifact_clean: residual.total === 0,
    document_coherent: false,
  };

  const canonicalMd = renderMarkdown(artifact);
  const preview = canonicalMd.length > 1500
    ? canonicalMd.slice(0, 1500) + "\n\n…(truncated)"
    : canonicalMd;

  return {
    artifact_id: artifactId,
    artifact_type: artifact.artifact_type,
    canonical_revision_id: revisionId,
    schema_version: artifact.schema_version,
    timestamp: new Date().toISOString(),

    three_layer_status,

    total_cycles: 0,
    issues_found: 0,
    issues_by_rule: {},
    proposals_generated: 0,
    proposals_accepted: 0,
    semantic_rejections: 0,
    natural_rejections: 0,
    forced_rejections: 0,
    overrides: 0,

    residual,
    cycles: [],

    canonical_markdown_preview: preview,

    integrity_corruptions: integrityReport.summary.corruptions,
    integrity_warnings: integrityReport.summary.warnings,
  };
}

// ---------------------------------------------------------------------------
// P7a: Multi-artifact report from store
// ---------------------------------------------------------------------------

export async function generateMultiArtifactReport(
  config: StoreConfig,
  artifactIds: string[]
): Promise<MultiArtifactReportData> {
  const integrityReport = await integrityCheck(config);
  const integrityClean = integrityReport.summary.corruptions === 0;

  const artifacts: Artifact[] = [];
  const summaries: ArtifactReportSummary[] = [];

  for (const artifactId of artifactIds) {
    const canonical = await loadCanonicalArtifact(config, artifactId);
    if (!canonical) {
      throw new Error(`Cannot load canonical artifact: ${artifactId}`);
    }

    const { artifact, revisionId } = canonical;
    artifacts.push(artifact);

    const residual = buildResidualSnapshot(artifact);
    const md = renderMarkdown(artifact);
    const preview = md.length > 1500 ? md.slice(0, 1500) + "\n\n…(truncated)" : md;

    summaries.push({
      artifact_id: artifactId,
      artifact_type: artifact.artifact_type,
      canonical_revision_id: revisionId,
      residual,
      three_layer_status: {
        integrity_clean: integrityClean,
        artifact_clean: residual.total === 0,
        document_coherent: false,
      },
      canonical_markdown_preview: preview,
    });
  }

  // Cross-artifact residuals
  const crossIssues = crossLintArtifacts(artifacts);
  const crossByType: Record<string, number> = {};
  for (const issue of crossIssues) {
    crossByType[issue.issue_type] = (crossByType[issue.issue_type] || 0) + 1;
  }

  const crossResidual: CrossResidualSnapshot = {
    total: crossIssues.length,
    by_type: crossByType,
    issues: crossIssues.map(i => ({
      issue_id: i.issue_id,
      block_id: i.target_block_id,
      section_id: "cross",
      section_title: "Cross-Artifact",
      issue_type: i.issue_type,
      severity: i.severity,
      message: i.message,
    })),
  };

  const blockCount = artifacts.reduce(
    (sum, a) => sum + a.sections.reduce((s, sec) => s + sec.commitments.length, 0),
    0
  );

  return {
    timestamp: new Date().toISOString(),
    artifact_count: artifacts.length,
    block_count: blockCount,
    artifacts: summaries,
    cross_residual: crossResidual,
    integrity_clean: integrityClean,
    integrity_corruptions: integrityReport.summary.corruptions,
    integrity_warnings: integrityReport.summary.warnings,
  };
}

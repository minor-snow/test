/**
 * Release Cockpit API Server
 *
 * ref: Phase 5 P5-002
 *
 * Serves the Release Decision Cockpit and API endpoints.
 *
 * Endpoints:
 *   GET  /cockpit              �?Serve release cockpit HTML
 *   GET  /api/release/report   �?Generate trial report data
 *   POST /api/release/decide   �?Submit release decision
 *   GET  /api/release/backlog  �?Get backlog markdown
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateReportFromStore, generateMultiArtifactReport } from "./reportGenerator.js";
import {
  generateBacklogItems,
  exportBacklogMarkdown,
  validateReleaseDecision,
  ALLOWED_DECISIONS,
} from "./backlogExport.js";
import type { ReleaseDecision, MultiArtifactReleaseDecision } from "./types.js";
import type { StoreConfig } from "../artifactStore.js";
import { loadFromQuarantine } from "../artifactStore.js";
import { appendDecisionEntry, readDecisionLog } from "./decisionLog.js";
import { appendRiskEntries, readRiskRegister, type RiskEntry } from "./riskRegister.js";
import { validateDraft } from "../draftValidator.js";
import { evaluateDraftQuality } from "../domainQualityEvaluator.js";
import { loadDomainProfile } from "../domainProfile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default to trial data
const DATA_DIR = process.env.PANTHEON_DATA_DIR
  ?? join(process.cwd(), "data", "trial");
const ARTIFACT_ID = process.env.PANTHEON_ARTIFACT_ID
  ?? "pantheon_architecture";

const config: StoreConfig = { dataDir: DATA_DIR };

async function startServer() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: true });

  // Serve cockpit HTML
  fastify.get("/cockpit", async (_req, reply) => {
    const html = await fs.readFile(
      join(process.cwd(), "cockpit", "release.html"),
      "utf8"
    );
    return reply.type("text/html").send(html);
  });

  // Redirect root to cockpit
  fastify.get("/", async (_req, reply) => {
    return reply.redirect("/cockpit");
  });

  // Generate report
  fastify.get("/api/release/report", async () => {
    return generateReportFromStore(config, ARTIFACT_ID);
  });

  // Submit decision
  //
  // P1 fix: Server regenerates the authoritative report from the store.
  //         Client-supplied snapshot/three_layer_status/revision are IGNORED.
  //         Only decision type, rationale, coherence note, operator_id,
  //         and per-item why_deferred are accepted from the client.
  // P2 fix: decision_id is stamped onto backlog items server-side.
  fastify.post("/api/release/decide", async (req) => {
    const body = req.body as Partial<ReleaseDecision> & {
      backlog_overrides?: Record<string, string>; // issue_id �?custom why_deferred
    };

    // --- Runtime input validation ---

    // P2 fix: decision type must be one of the three allowed values
    if (!body.decision || !ALLOWED_DECISIONS.includes(body.decision as any)) {
      return {
        valid: false,
        errors: [
          "Invalid decision type: " + JSON.stringify(body.decision || "(missing)") +
          ". Must be one of: " + ALLOWED_DECISIONS.join(", "),
        ],
      };
    }

    // P1 fix: canonical_revision_id is required �?proves the operator reviewed something
    const viewedRevision = body.canonical_revision_id;
    if (!viewedRevision || typeof viewedRevision !== "string" || !viewedRevision.trim()) {
      return {
        valid: false,
        errors: [
          "canonical_revision_id is required. " +
          "Submit the revision ID you reviewed so the server can verify it is still current.",
        ],
      };
    }

    // --- Server-side authoritative report ---
    const report = await generateReportFromStore(config, ARTIFACT_ID);

    // Stale review guard: reject if operator reviewed a different revision
    if (viewedRevision !== report.canonical_revision_id) {
      return {
        valid: false,
        stale: true,
        errors: [
          `Stale submission: you reviewed revision ${viewedRevision} ` +
          `but the current canonical is ${report.canonical_revision_id}. ` +
          `Please refresh the report and re-review before submitting.`,
        ],
      };
    }

    const decisionId = `dec_${Date.now()}`;

    // Derive three-layer status from server-side data
    const three_layer_status = {
      integrity_clean: report.three_layer_status.integrity_clean,
      artifact_clean: report.residual.total === 0,
      document_coherent: !!(body.final_coherence_note?.trim()),
    };

    // Build backlog items server-side with proper provenance
    const backlogOverrides: Record<string, string> = {};
    if (Array.isArray(body.backlog_items)) {
      for (const item of body.backlog_items) {
        if (item.source_issue_id && item.why_deferred) {
          backlogOverrides[item.source_issue_id] = item.why_deferred;
        }
      }
    }

    const backlogItems =
      body.decision === "accepted_with_residual_issues"
        ? generateBacklogItems(
            report.residual,
            report.canonical_revision_id,
            decisionId,  // P2: real decision_id, not empty string
            backlogOverrides
          )
        : [];

    const decision: ReleaseDecision = {
      decision_id: decisionId,
      decision: body.decision ?? "rejected_requires_cleanup",
      canonical_revision_id: report.canonical_revision_id,  // P1: from store
      artifact_id: ARTIFACT_ID,
      operator_id: body.operator_id ?? "unknown",
      timestamp: new Date().toISOString(),
      rationale: body.rationale ?? "",
      final_coherence_note: body.final_coherence_note ?? "",
      three_layer_status,                                    // P1: from store
      residual_snapshot: report.residual,                    // P1: from store
      backlog_items: backlogItems,                           // P2: server-built
    };

    // Validate against server-side truth
    const result = validateReleaseDecision(decision);
    if (!result.valid) {
      return { valid: false, errors: result.errors };
    }

    // Save decision
    const decisionsDir = join(config.dataDir, "decisions");
    await fs.mkdir(decisionsDir, { recursive: true });
    await fs.writeFile(
      join(decisionsDir, `${decision.decision_id}.json`),
      JSON.stringify(decision, null, 2)
    );

    // Save backlog if applicable
    if (decision.backlog_items.length > 0) {
      const backlogMd = exportBacklogMarkdown(decision.backlog_items);
      await fs.writeFile(
        join(decisionsDir, `${decision.decision_id}_backlog.md`),
        backlogMd
      );
    }

    return { valid: true, decision_id: decision.decision_id };
  });

  // Get latest backlog
  fastify.get("/api/release/backlog", async () => {
    const report = await generateReportFromStore(config, ARTIFACT_ID);
    const items = generateBacklogItems(
      report.residual,
      report.canonical_revision_id,
      "preview"
    );
    return {
      items,
      markdown: exportBacklogMarkdown(items),
    };
  });

  // ---------------------------------------------------------------------------
  // P7a: Multi-artifact endpoints
  // ---------------------------------------------------------------------------

  // Serve multi-artifact cockpit
  fastify.get("/cockpit/multi", async (_req, reply) => {
    const html = await fs.readFile(
      join(process.cwd(), "cockpit", "multi-release.html"),
      "utf8"
    );
    return reply.type("text/html").send(html);
  });

  // Multi-artifact report
  fastify.get("/api/release/multi-report", async (req) => {
    const query = req.query as { artifacts?: string };
    const artifactIds = query.artifacts
      ? query.artifacts.split(",").map(s => s.trim())
      : [ARTIFACT_ID];
    return generateMultiArtifactReport(config, artifactIds);
  });

  // Multi-artifact release decision
  fastify.post("/api/release/multi-decide", async (req) => {
    const body = req.body as Partial<MultiArtifactReleaseDecision>;

    if (!body.decision || !ALLOWED_DECISIONS.includes(body.decision as any)) {
      return {
        valid: false,
        errors: [
          "Invalid decision type: " + JSON.stringify(body.decision || "(missing)") +
          ". Must be one of: " + ALLOWED_DECISIONS.join(", "),
        ],
      };
    }

    if (!body.artifact_ids || body.artifact_ids.length === 0) {
      return { valid: false, errors: ["artifact_ids is required."] };
    }

    // Regenerate report from store
    const report = await generateMultiArtifactReport(
      config,
      body.artifact_ids
    );

    // Stale check: verify all revision IDs match
    if (body.revision_ids) {
      for (const summary of report.artifacts) {
        const viewedRev = body.revision_ids[summary.artifact_id];
        if (viewedRev && viewedRev !== summary.canonical_revision_id) {
          return {
            valid: false,
            stale: true,
            errors: [
              `Stale: artifact ${summary.artifact_id} reviewed as ${viewedRev} ` +
              `but current is ${summary.canonical_revision_id}.`,
            ],
          };
        }
      }
    }

    const decisionId = `dec_multi_${Date.now()}`;

    const decision: MultiArtifactReleaseDecision = {
      decision_id: decisionId,
      decision: body.decision ?? "rejected_requires_cleanup",
      artifact_ids: body.artifact_ids,
      revision_ids: Object.fromEntries(
        report.artifacts.map(a => [a.artifact_id, a.canonical_revision_id])
      ),
      operator_id: body.operator_id ?? "unknown",
      timestamp: new Date().toISOString(),
      rationale: body.rationale ?? "",
      final_coherence_note: body.final_coherence_note ?? "",
      artifacts: report.artifacts,
      cross_residual: report.cross_residual,
      integrity_clean: report.integrity_clean,
      backlog_items: [],
    };

    const decisionsDir = join(config.dataDir, "decisions");
    await fs.mkdir(decisionsDir, { recursive: true });
    await fs.writeFile(
      join(decisionsDir, `${decision.decision_id}.json`),
      JSON.stringify(decision, null, 2)
    );

    // P7b-004: Append to DecisionLog
    await appendDecisionEntry(config.dataDir, {
      decision_id: decisionId,
      decision_type: decision.decision,
      operator_id: decision.operator_id,
      release_decision_id: decisionId,
      affected_artifacts: decision.artifact_ids,
      canonical_revision_ids: decision.revision_ids,
      rationale: decision.rationale,
      created_at: decision.timestamp,
    });

    // P7b-005: If accepted_with_residual, append to RiskRegister
    if (decision.decision === "accepted_with_residual_issues") {
      const riskEntries: RiskEntry[] = [];
      for (const artSummary of report.artifacts) {
        for (const issue of artSummary.residual?.issues ?? []) {
          riskEntries.push({
            risk_id: `risk_${Date.now()}_${riskEntries.length}`,
            source_issue_id: issue.issue_id,
            issue_type: issue.issue_type,
            severity: issue.severity,
            block_id: issue.block_id,
            artifact_id: artSummary.artifact_id,
            canonical_revision_id: artSummary.canonical_revision_id,
            accepted_by: decision.operator_id,
            release_decision_id: decisionId,
            why_accepted: decision.rationale,
            created_at: decision.timestamp,
          });
        }
      }
      for (const crossIssue of report.cross_residual?.issues ?? []) {
        riskEntries.push({
          risk_id: `risk_${Date.now()}_cross_${riskEntries.length}`,
          source_issue_id: crossIssue.issue_id,
          issue_type: crossIssue.issue_type,
          severity: crossIssue.severity,
          block_id: crossIssue.block_id,
          artifact_id: "cross",
          canonical_revision_id: "cross",
          accepted_by: decision.operator_id,
          release_decision_id: decisionId,
          why_accepted: decision.rationale,
          created_at: decision.timestamp,
        });
      }
      if (riskEntries.length > 0) {
        await appendRiskEntries(config.dataDir, riskEntries);
      }
    }

    return { valid: true, decision_id: decision.decision_id };
  });

  // P7b-004: Decision log endpoint
  fastify.get("/api/release/decision-log", async () => {
    return readDecisionLog(config.dataDir);
  });

  // P7b-005: Risk register endpoint
  fastify.get("/api/release/risk-register", async () => {
    return readRiskRegister(config.dataDir);
  });

  // ---------------------------------------------------------------------------
  // P9-005: Draft review endpoints
  // ---------------------------------------------------------------------------

  // Serve draft review cockpit
  fastify.get("/cockpit/draft", async (_req, reply) => {
    const html = await fs.readFile(
      join(process.cwd(), "cockpit", "draft-review.html"),
      "utf8"
    );
    return reply.type("text/html").send(html);
  });

  // List quarantined drafts
  fastify.get("/api/draft/list", async () => {
    const quarantineDir = join(config.dataDir, "quarantine");
    try {
      const files = await fs.readdir(quarantineDir);
      const drafts = files
        .filter(f => f.endsWith(".json"))
        .map(f => f.replace(".json", ""));
      return { drafts };
    } catch {
      return { drafts: [] };
    }
  });

  // Get quality report for a quarantined draft
  fastify.get("/api/draft/:quarantine_id/quality", async (req) => {
    const { quarantine_id } = req.params as { quarantine_id: string };

    const item = await loadFromQuarantine(config, quarantine_id);
    if (!item) {
      return { error: `Quarantine item "${quarantine_id}" not found` };
    }

    const validation = validateDraft(item);
    if (validation.status === "rejected") {
      return {
        error: "Draft validation failed",
        validation_errors: validation.errors,
      };
    }

    const profilePath = process.env.PANTHEON_PROFILE_PATH
      ?? join(process.cwd(), "data", "profiles", "software_engineering_architecture.json");

    try {
      const profile = await loadDomainProfile(profilePath);
      const report = evaluateDraftQuality(validation.artifact, profile);
      return { quality_report: report, artifact_id: validation.artifact.artifact_id };
    } catch (e) {
      return { error: `Failed to load profile: ${(e as Error).message}` };
    }
  });

  // Submit intake decision for a quarantined draft
  //
  // CRITICAL: accept_as_seed does NOT call promoteDraft().
  // Draft stays in quarantine. Only DecisionLog is updated.
  fastify.post("/api/draft/:quarantine_id/intake", async (req) => {
    const { quarantine_id } = req.params as { quarantine_id: string };
    const body = req.body as {
      decision?: string;
      operator_id?: string;
      rationale?: string;
    };

    const INTAKE_DECISIONS = ["reject_draft", "accept_for_cleanup", "accept_as_seed"] as const;
    if (!body.decision || !INTAKE_DECISIONS.includes(body.decision as any)) {
      return {
        valid: false,
        errors: [`Invalid decision. Must be one of: ${INTAKE_DECISIONS.join(", ")}`],
      };
    }

    if (!body.rationale || !body.rationale.trim()) {
      return { valid: false, errors: ["rationale is required for all intake decisions"] };
    }

    if (!body.operator_id || !body.operator_id.trim()) {
      return { valid: false, errors: ["operator_id is required"] };
    }

    const item = await loadFromQuarantine(config, quarantine_id);
    if (!item) {
      return { valid: false, errors: [`Quarantine item "${quarantine_id}" not found`] };
    }

    // Build quality snapshot for DecisionLog provenance.
    // CRITICAL: For accept_for_cleanup and accept_as_seed, quality evaluation
    // must succeed. Only reject_draft is allowed without a quality report.
    let qualitySnapshot: Record<string, unknown> = {};
    let qualityError: string | null = null;
    try {
      const validation = validateDraft(item);
      if (validation.status === "accepted") {
        const profilePath = process.env.PANTHEON_PROFILE_PATH
          ?? join(process.cwd(), "data", "profiles", "software_engineering_architecture.json");
        const profile = await loadDomainProfile(profilePath);
        const report = evaluateDraftQuality(validation.artifact, profile);
        qualitySnapshot = {
          score: report.score,
          required_concept_coverage: report.required_concept_coverage,
          recommendation: report.recommendation,
          blocking_issues_count: report.blocking_issues.length,
          issue_breakdown: report.issue_breakdown,
        };
      } else {
        qualityError = `Draft validation failed: ${validation.errors.join("; ")}`;
      }
    } catch (e) {
      qualityError = `Quality evaluation failed: ${(e as Error).message}`;
    }

    // Fail closed: non-reject decisions require a quality report
    if (qualityError && body.decision !== "reject_draft") {
      return {
        valid: false,
        errors: [
          `Cannot ${body.decision} without a quality report. ${qualityError}`,
        ],
      };
    }

    const decisionId = `intake_${Date.now()}`;

    await appendDecisionEntry(config.dataDir, {
      decision_id: decisionId,
      decision_type: `draft_intake:${body.decision}`,
      operator_id: body.operator_id,
      release_decision_id: decisionId,
      affected_artifacts: [quarantine_id],
      canonical_revision_ids: {},
      rationale: body.rationale,
      created_at: new Date().toISOString(),
      quality_snapshot: qualitySnapshot,
    });

    return {
      valid: true,
      decision_id: decisionId,
      decision: body.decision,
      quarantine_id,
      note: body.decision === "accept_as_seed"
        ? "Draft remains in quarantine. Use promoteDraft() for canonical promotion."
        : undefined,
    };
  });

  const port = Number(process.env.PORT ?? 3456);
  await fastify.listen({ port, host: "0.0.0.0" });
  console.log(`\n\ud83c\udfdb\ufe0f Pantheon Release Cockpit at http://localhost:${port}/cockpit\n`);
}

startServer().catch(console.error);

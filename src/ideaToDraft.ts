/**
 * Idea-to-Draft Pipeline
 *
 * ref: P8-003
 *
 * End-to-end pipeline:
 *   idea → LLM draft → DraftValidator → quarantine → lint → result
 *
 * The resulting artifact is in quarantine. It does NOT become canonical
 * until cockpit signoff via promoteDraft().
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { Artifact, Issue } from "./types.js";
import type { LlmClient } from "./trial/llmClient.js";
import type { StoreConfig } from "./artifactStore.js";
import { saveToQuarantine } from "./artifactStore.js";
import { generateDraft } from "./trial/draftAgent.js";
import { validateDraft } from "./draftValidator.js";
import { lintArtifact } from "./linter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DraftPipelineResult = {
  status: "success" | "validation_failed" | "parse_error" | "llm_error";
  artifact?: Artifact;
  validation_errors?: string[];
  validation_warnings?: string[];
  lint_issues?: Issue[];
  raw_output?: string;
};

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

/** Extract a diagnostic string from any thrown value. */
function normalizeError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? `${err.name}: ${err.message}`;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full idea-to-draft pipeline.
 *
 * Steps:
 *   1. Call LLM to generate draft JSON
 *   2. Parse JSON
 *   3. Validate with DraftValidator
 *   4. Save finalized artifact to quarantine
 *   5. Lint the finalized artifact
 *   6. Return result
 *
 * The artifact is in quarantine, NOT canonical.
 */
export async function runIdeaToDraft(
  idea: string,
  client: LlmClient,
  store: StoreConfig,
  existingArtifactIds: string[] = []
): Promise<DraftPipelineResult> {
  // Step 1: Generate draft via LLM
  let rawOutput: string;
  try {
    rawOutput = await generateDraft(client, idea);
  } catch (err) {
    return {
      status: "llm_error",
      raw_output: normalizeError(err),
    };
  }

  // Strip markdown code fences if LLM wraps output
  let cleanOutput = rawOutput.trim();
  if (cleanOutput.startsWith("```")) {
    cleanOutput = cleanOutput.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanOutput);
  } catch (err) {
    return {
      status: "parse_error",
      raw_output: rawOutput,
      validation_errors: [`JSON parse failed: ${(err as Error).message}`],
    };
  }

  // Step 3: Validate with DraftValidator
  const validation = validateDraft(parsed, existingArtifactIds);

  if (validation.status === "rejected") {
    return {
      status: "validation_failed",
      raw_output: rawOutput,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
    };
  }

  const artifact = validation.artifact;

  // Step 4: Save to quarantine ONLY — no canonical pointer.
  // Draft must NOT become canonical until cockpit signoff (promoteDraft).
  const quarantineId = `draft_${artifact.artifact_id}_${Date.now()}`;
  await saveToQuarantine(store, quarantineId, artifact);

  // Also archive the raw LLM output
  const draftRunsDir = join(store.dataDir, "draft_runs");
  await fs.mkdir(draftRunsDir, { recursive: true });
  await fs.writeFile(join(draftRunsDir, `${quarantineId}_raw.txt`), rawOutput, "utf8");
  await fs.writeFile(
    join(draftRunsDir, `${quarantineId}_metadata.json`),
    JSON.stringify({
      quarantine_id: quarantineId,
      artifact_id: artifact.artifact_id,
      revision_id: artifact.revision_id,
      idea: idea.slice(0, 500),
      timestamp: new Date().toISOString(),
      validation_warnings: validation.warnings,
    }, null, 2),
    "utf8"
  );

  // Step 5: Lint
  const lintIssues = lintArtifact(artifact);

  return {
    status: "success",
    artifact,
    validation_warnings: validation.warnings,
    lint_issues: lintIssues,
    raw_output: rawOutput,
  };
}

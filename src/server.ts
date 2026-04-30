/**
 * Pantheon Cockpit API Server
 *
 * ref: 执行宪法 v0.2 §17 Day 7, HARD-005
 *
 * STATUS: This server runs the CLOSED-LOOP DEMO (§21),
 * not a general-purpose orchestrator.
 *
 * Endpoints:
 *   GET  /api/pipeline/run    — Run the §21 demo pipeline
 *   POST /api/pipeline/override — Apply a human override
 *   GET  /api/pipeline/state   — Get current pipeline state
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runSection21Demo,
  overrideSection21Demo,
  generateCockpitData,
} from "./demo/runDemo.js";
import type { PipelineState } from "./pipeline.js";
import type { OverridePatch } from "./types.js";
import type { StoreConfig } from "./artifactStore.js";

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data", "live");

const config: StoreConfig = { dataDir: DATA_DIR };
let currentState: PipelineState | null = null;

async function startServer() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: true });

  // Serve static cockpit files
  fastify.get("/", async (_req, reply) => {
    const html = await fs.readFile(
      join(__dirname, "..", "cockpit-mock", "cockpit-live.html"),
      "utf8"
    );
    return reply.type("text/html").send(html);
  });

  // Run §21 demo pipeline
  fastify.get("/api/pipeline/run", async () => {
    currentState = await runSection21Demo(config);
    return generateCockpitData(currentState);
  });

  // Get current state
  fastify.get("/api/pipeline/state", async () => {
    if (!currentState) {
      return { phase: "idle", error: "Pipeline not yet run. Call /api/pipeline/run first." };
    }
    return generateCockpitData(currentState);
  });

  // Apply override
  fastify.post<{ Body: OverridePatch }>("/api/pipeline/override", async (req) => {
    if (!currentState || currentState.phase !== "regression_failed") {
      return {
        error: "Pipeline not in regression_failed state. Run pipeline first.",
      };
    }

    const override: OverridePatch = {
      override_id: `ovr_${Date.now()}`,
      artifact_id: currentState.artifact!.artifact_id,
      base_revision_id: currentState.candidateRevision!.revision_id,
      override_type: req.body.override_type || "accept_with_known_risk",
      operator: req.body.operator || { type: "human", id: "cockpit_user" },
      failed_gates: currentState.regressionResult?.failed_gates || [],
      affected_issue_ids: currentState.validatedIssues.map((i) => i.issue_id),
      rationale: req.body.rationale || "Accepted via cockpit.",
      risk_acceptance: req.body.risk_acceptance,
      timestamp: new Date().toISOString(),
    };

    currentState = await overrideSection21Demo(config, currentState, override);
    return generateCockpitData(currentState);
  });

  const port = 3456;
  await fastify.listen({ port, host: "0.0.0.0" });
  console.log(`\n🏛️  Pantheon Cockpit (§21 Demo) running at http://localhost:${port}\n`);
}

startServer().catch(console.error);

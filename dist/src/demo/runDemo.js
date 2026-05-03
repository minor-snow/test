/**
 * Demo Runner
 *
 * ref: HARD-005
 *
 * STATUS: This is a CLOSED-LOOP DEMO RUNNER, not a general orchestrator.
 *
 * It drives the §21 scenario end-to-end:
 *   1. Creates the §21 artifact
 *   2. Runs the pipeline (which halts at regression_failed)
 *   3. Optionally applies a human override
 *
 * The current pipeline.ts is a general-purpose orchestrator that accepts
 * any artifact + any patch text. This runner is the demo-specific wrapper
 * that feeds it the §21 fixture.
 */
import { promises as fs } from "node:fs";
import { runPipeline, applyHumanOverride, } from "../pipeline.js";
import { makeSection21Artifact } from "./section21Fixture.js";
/**
 * Run the §21 demo pipeline.
 *
 * Cleans the data directory, creates the §21 artifact,
 * and runs the pipeline to completion (or regression_failed).
 */
export async function runSection21Demo(config) {
    // Clean previous data
    await fs.rm(config.dataDir, { recursive: true, force: true });
    await fs.mkdir(config.dataDir, { recursive: true });
    const artifact = makeSection21Artifact();
    return runPipeline(config, artifact);
}
/**
 * Apply a human override to the demo pipeline state.
 */
export async function overrideSection21Demo(config, state, override) {
    return applyHumanOverride(config, state, override);
}
// Re-export for convenience
export { generateCockpitData } from "../pipeline.js";
export { makeSection21Artifact } from "./section21Fixture.js";
//# sourceMappingURL=runDemo.js.map
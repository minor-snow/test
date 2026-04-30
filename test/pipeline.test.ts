import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { computeBlockContentHash } from "../src/hash.js";
import { runPipeline } from "../src/pipeline.js";
import { makeSection21Artifact } from "../src/demo/section21Fixture.js";
import type { StoreConfig } from "../src/artifactStore.js";

const TEST_DATA_DIR = join(process.cwd(), "data", "_test_pipeline_tmp");

describe("runPipeline", () => {
  let config: StoreConfig;

  beforeEach(async () => {
    config = { dataDir: TEST_DATA_DIR };
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it("fails closed when multiple validated issues are present", async () => {
    const artifact = makeSection21Artifact();
    artifact.sections[0].commitments.push({
      block_id: "b_mem_002",
      type: "invariant",
      text: "",
      rationale: "Second broken block.",
      terms: [],
      status: "draft",
      content_hash: "",
    });
    const secondBlock = artifact.sections[0].commitments[1];
    secondBlock.content_hash = computeBlockContentHash(secondBlock);

    const result = await runPipeline(config, artifact);
    expect(result.error).toContain("supports exactly one validated issue");
    expect(result.patchProposal).toBeNull();
  });
});

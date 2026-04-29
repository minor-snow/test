/**
 * Idea-to-Draft Pipeline — Tests
 *
 * ref: P8-003
 */

import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { runIdeaToDraft } from "../src/ideaToDraft.js";
import type { LlmClient } from "../src/trial/llmClient.js";
import { computeBlockContentHash } from "../src/hash.js";

function makeTmpDir(): string {
  return join(tmpdir(), `pantheon_test_draft_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

function mockClient(response: string): LlmClient {
  return {
    complete: async () => response,
  };
}

const VALID_DRAFT_JSON = JSON.stringify({
  artifact_id: "test_pipeline_draft",
  artifact_type: "ArchitectureDraft",
  sections: [
    {
      section_id: "sec_core",
      title: "Core",
      commitments: [
        {
          block_id: "b_core_001",
          type: "invariant",
          text: "The system stores all events in an append-only log.",
          status: "draft",
          terms: ["append_only_log"],
        },
        {
          block_id: "b_core_002",
          type: "mechanism",
          text: "Event ingestion validates each payload against a JSON schema before persisting.",
          status: "draft",
        },
      ],
    },
    {
      section_id: "sec_api",
      title: "API Layer",
      commitments: [
        {
          block_id: "b_api_001",
          type: "interface",
          text: "GET /events returns a paginated list of events sorted by timestamp.",
          status: "draft",
        },
      ],
    },
  ],
});

describe("P8-003: Idea-to-Draft Pipeline", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = makeTmpDir();
    await fs.mkdir(dataDir, { recursive: true });
  });

  it("succeeds with valid LLM output", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const result = await runIdeaToDraft("An event sourcing system", client, { dataDir });

    expect(result.status).toBe("success");
    expect(result.artifact).toBeDefined();
    expect(result.artifact!.artifact_id).toBe("test_pipeline_draft");
    expect(result.artifact!.revision_id).toMatch(/^rev_/);
    expect(result.artifact!.schema_version).toBe("architecture_draft@0.1.0");
    expect(result.lint_issues).toBeDefined();
  });

  it("host recomputes all hashes", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("success");
    for (const section of result.artifact!.sections) {
      for (const block of section.commitments) {
        expect(block.content_hash).toBe(computeBlockContentHash(block));
      }
    }
  });

  it("handles JSON parse failure", async () => {
    const client = mockClient("this is not json at all");
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("parse_error");
    expect(result.validation_errors).toBeDefined();
    expect(result.validation_errors!.some(e => e.includes("JSON parse failed"))).toBe(true);
  });

  it("handles DraftValidator rejection", async () => {
    const badDraft = JSON.stringify({
      artifact_id: "x",  // too short
      artifact_type: "BadType",
      sections: [],
    });
    const client = mockClient(badDraft);
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("validation_failed");
    expect(result.validation_errors!.length).toBeGreaterThan(0);
  });

  it("strips markdown code fences from LLM output", async () => {
    const wrapped = "```json\n" + VALID_DRAFT_JSON + "\n```";
    const client = mockClient(wrapped);
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("success");
    expect(result.artifact).toBeDefined();
  });

  it("handles LLM error", async () => {
    const client: LlmClient = {
      complete: async () => { throw new Error("API rate limit"); },
    };
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("llm_error");
  });

  it("detects collision with existing artifact IDs", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const result = await runIdeaToDraft(
      "Test idea", client, { dataDir },
      ["test_pipeline_draft"]  // collision
    );

    expect(result.status).toBe("validation_failed");
    expect(result.validation_errors!.some(e => e.includes("collision"))).toBe(true);
  });

  it("saves raw output to draft_runs directory", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    await runIdeaToDraft("Test idea", client, { dataDir });

    const draftRunsDir = join(dataDir, "draft_runs");
    const files = await fs.readdir(draftRunsDir);
    expect(files.length).toBeGreaterThanOrEqual(2); // raw + metadata
    const rawFiles = files.filter(f => f.endsWith("_raw.txt"));
    expect(rawFiles.length).toBe(1);
  });
});

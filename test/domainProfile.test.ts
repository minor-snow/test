/**
 * Domain Profile — Tests
 *
 * ref: P9-001
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { loadDomainProfile, type DomainProfile } from "../src/domainProfile.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEED_PROFILE_PATH = join(
  process.cwd(),
  "data",
  "profiles",
  "software_engineering_architecture.json"
);

function tmpFile(): string {
  return join(
    tmpdir(),
    `profile_test_${Date.now()}_${Math.random().toString(36).slice(2)}.json`
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P9-001: DomainProfile", () => {
  it("loads the seed profile successfully", async () => {
    const profile = await loadDomainProfile(SEED_PROFILE_PATH);
    expect(profile.profile_id).toBe("software_engineering_architecture");
    expect(profile.artifact_type).toBe("ArchitectureDraft");
    expect(profile.domain_name).toBeTruthy();
    expect(profile.required_concepts.length).toBeGreaterThanOrEqual(6);
    expect(profile.required_sections.length).toBeGreaterThanOrEqual(5);
    expect(profile.forbidden_generic_phrases.length).toBeGreaterThan(0);
    expect(profile.quality_rubric.min_sections).toBeGreaterThan(0);
  });

  it("seed profile has artifact_type = ArchitectureDraft", async () => {
    const profile = await loadDomainProfile(SEED_PROFILE_PATH);
    expect(profile.artifact_type).toBe("ArchitectureDraft");
  });

  it("seed profile required_concepts have aliases", async () => {
    const profile = await loadDomainProfile(SEED_PROFILE_PATH);
    for (const concept of profile.required_concepts) {
      expect(concept.concept).toBeTruthy();
      expect(Array.isArray(concept.aliases)).toBe(true);
    }
  });

  it("seed profile required_sections have aliases", async () => {
    const profile = await loadDomainProfile(SEED_PROFILE_PATH);
    for (const section of profile.required_sections) {
      expect(section.title).toBeTruthy();
      expect(Array.isArray(section.aliases)).toBe(true);
    }
  });

  it("rejects missing file", async () => {
    await expect(
      loadDomainProfile("/nonexistent/path/profile.json")
    ).rejects.toThrow();
  });

  it("rejects non-object JSON", async () => {
    const path = tmpFile();
    await fs.writeFile(path, '"just a string"', "utf8");
    await expect(loadDomainProfile(path)).rejects.toThrow("non-null JSON object");
  });

  it("rejects missing profile_id", async () => {
    const path = tmpFile();
    await fs.writeFile(path, JSON.stringify({
      artifact_type: "ArchitectureDraft",
      domain_name: "Test",
      required_concepts: [],
      required_sections: [],
      forbidden_generic_phrases: [],
      quality_rubric: { min_sections: 1, min_blocks: 1, max_blocks: 10, min_required_concept_coverage: 0.5 },
    }), "utf8");
    await expect(loadDomainProfile(path)).rejects.toThrow("profile_id");
  });

  it("rejects missing quality_rubric fields", async () => {
    const path = tmpFile();
    await fs.writeFile(path, JSON.stringify({
      profile_id: "test",
      artifact_type: "ArchitectureDraft",
      domain_name: "Test",
      required_concepts: [],
      required_sections: [],
      forbidden_generic_phrases: [],
      quality_rubric: { min_sections: 1 },
    }), "utf8");
    await expect(loadDomainProfile(path)).rejects.toThrow("quality_rubric");
  });

  it("rejects missing required_sections", async () => {
    const path = tmpFile();
    await fs.writeFile(path, JSON.stringify({
      profile_id: "test",
      artifact_type: "ArchitectureDraft",
      domain_name: "Test",
      required_concepts: [],
      forbidden_generic_phrases: [],
      quality_rubric: { min_sections: 1, min_blocks: 1, max_blocks: 10, min_required_concept_coverage: 0.5 },
    }), "utf8");
    await expect(loadDomainProfile(path)).rejects.toThrow("required_sections");
  });
});

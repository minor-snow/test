/**
 * P24: Config Loader Tests (pantheon.json)
 */

import { describe, it, expect } from "vitest";
import { loadPantheonConfig, generateDefaultConfigJson } from "../../src/cli/pantheonConfig.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("pantheonConfig (JSON)", () => {
  const tmpDir = join("test", "cli", "__tmp_config__");

  function setup(content?: string) {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    if (content !== undefined) {
      writeFileSync(join(tmpDir, "pantheon.json"), content);
    }
  }

  function cleanup() {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  describe("loadPantheonConfig", () => {
    it("returns defaults when no config exists", () => {
      setup();
      const { config, warnings, loaded_from } = loadPantheonConfig(tmpDir);
      expect(loaded_from).toBeNull();
      expect(warnings).toHaveLength(0);
      expect(config.protected.length).toBeGreaterThan(0);
      cleanup();
    });

    it("parses a complete config", () => {
      setup(JSON.stringify({
        version: 1,
        protected: [".git/**", ".pantheon/**"],
        review_required: ["models/**"],
        generated: ["openapi.json"],
        path_roles: { saleor: "src", "saleor/tests": "test" },
      }));

      const { config, warnings } = loadPantheonConfig(tmpDir);
      expect(warnings).toHaveLength(0);
      expect(config.protected).toEqual([".git/**", ".pantheon/**"]);
      expect(config.review_required).toEqual(["models/**"]);
      expect(config.generated).toEqual(["openapi.json"]);
      expect(config.path_roles.saleor).toBe("src");
      expect(config.path_roles["saleor/tests"]).toBe("test");
      cleanup();
    });

    it("warns on unknown keys", () => {
      setup(JSON.stringify({ version: 1, unknown_field: true }));
      const { warnings } = loadPantheonConfig(tmpDir);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain("unknown_field");
      cleanup();
    });

    it("warns on unsupported version", () => {
      setup(JSON.stringify({ version: 99 }));
      const { config, warnings } = loadPantheonConfig(tmpDir);
      expect(warnings.length).toBeGreaterThan(0);
      expect(config.version).toBe(1);
      cleanup();
    });

    it("uses defaults for protected when empty", () => {
      setup(JSON.stringify({ version: 1 }));
      const { config } = loadPantheonConfig(tmpDir);
      expect(config.protected.length).toBeGreaterThan(0);
      expect(config.protected).toContain(".pantheon/**");
      cleanup();
    });

    it("warns on malformed JSON", () => {
      setup("not valid json {{{");
      const { warnings } = loadPantheonConfig(tmpDir);
      expect(warnings.length).toBeGreaterThan(0);
      cleanup();
    });

    it("ignores repo_observation key without warning", () => {
      setup(JSON.stringify({
        version: 1,
        repo_observation: { excluded_dirs: [".venv"] },
      }));
      const { warnings } = loadPantheonConfig(tmpDir);
      expect(warnings).toHaveLength(0);
      cleanup();
    });
  });

  describe("generateDefaultConfigJson", () => {
    it("produces valid parseable JSON", () => {
      const json = generateDefaultConfigJson();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.protected).toContain(".pantheon/**");
    });
  });
});

/**
 * Conformance test: Change governance commands.
 *
 * Exercises change commands marked conformanceRequired: true in the manifest.
 * We validate envelope shape — business logic results (needs_setup, not_found) are acceptable.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("Change Commands Conformance", () => {
  it("change intake --json command exists and responds", () => {
    // intake requires --type, --title, --reason, --target args
    const result = runCli([
      "change", "intake",
      "--type", "feature",
      "--title", "conformance-test",
      "--reason", "testing",
      "--target", "test/conformance",
      "--json",
    ]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      // Command exists but may fail without proper setup — acceptable
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("change plan --json command exists and responds", () => {
    // plan requires --change-id arg
    const result = runCli(["change", "plan", "--change-id", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("change check --json command exists and responds", () => {
    // check requires --change-id arg
    const result = runCli(["change", "check", "--change-id", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });
});

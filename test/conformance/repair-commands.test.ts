/**
 * Conformance test: Repair commands.
 *
 * Exercises repair commands marked conformanceRequired: true in the manifest.
 * We validate envelope shape — business logic results (needs_setup, not_found) are acceptable.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("Repair Commands Conformance", () => {
  it("repair intake --json command exists and responds", () => {
    // intake requires --from arg pointing to a bug report file
    const result = runCli(["repair", "intake", "--from", "nonexistent.json", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      // Command exists but fails without valid input — acceptable
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("repair plan --json command exists and responds", () => {
    // plan requires --repair-id arg
    const result = runCli(["repair", "plan", "--repair-id", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("repair check --json command exists and responds", () => {
    // check requires --repair-id arg
    const result = runCli(["repair", "check", "--repair-id", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });
});

/**
 * Conformance test: DSA commands.
 *
 * Exercises all DSA commands marked conformanceRequired: true in the manifest.
 * We validate envelope shape — business logic results (needs_setup, not_found) are acceptable.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("DSA Commands Conformance", () => {
  it("dsa observe --json produces a valid envelope", () => {
    const result = runCli(["dsa", "observe", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("dsa status --json produces a valid envelope", () => {
    const result = runCli(["dsa", "status", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("dsa review list --json produces a valid envelope", () => {
    const result = runCli(["dsa", "review", "list", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("dsa review show --json command exists and responds", () => {
    // show requires a candidate-id argument
    const result = runCli(["dsa", "review", "show", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      // Command exists but outputs usage text for missing/invalid args
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("dsa review approve --json command exists and responds", () => {
    // approve requires a candidate-id argument
    const result = runCli(["dsa", "review", "approve", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("dsa review reject --json command exists and responds", () => {
    // reject requires a candidate-id argument
    const result = runCli(["dsa", "review", "reject", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("dsa materialize --json command exists and responds", () => {
    // materialize requires --candidate arg
    const result = runCli(["dsa", "materialize", "--candidate", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("dsa project --json produces a valid envelope", () => {
    const result = runCli(["dsa", "project", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });
});

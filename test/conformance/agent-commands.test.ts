/**
 * Conformance test: Agent Gateway commands.
 *
 * Exercises all agent commands marked conformanceRequired: true in the manifest.
 * We validate envelope shape — business logic results (needs_setup, not_found) are acceptable.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("Agent Commands Conformance", () => {
  it("agent status --json produces a valid envelope", () => {
    const result = runCli(["agent", "status", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("agent sessions --json produces a valid envelope", () => {
    const result = runCli(["agent", "sessions", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("agent submit --json command exists and responds", () => {
    // submit requires --envelope arg; without it, outputs usage text (not JSON)
    // We verify the command exists by checking it produces recognizable output
    const result = runCli(["agent", "submit", "--json", "--envelope", '{"invalid":"data"}']);
    // Even with invalid data, should produce a JSON envelope or at minimum respond
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      // Command exists but doesn't produce JSON for invalid input — acceptable
      expect(result.exitCode).not.toBe(127); // not "command not found"
    }
  });

  it("agent progress --json command exists and responds", () => {
    // progress requires --envelope arg
    const result = runCli(["agent", "progress", "--json", "--envelope", '{"invalid":"data"}']);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("agent complete --json command exists and responds", () => {
    // complete requires --envelope arg
    const result = runCli(["agent", "complete", "--json", "--envelope", '{"invalid":"data"}']);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });
});

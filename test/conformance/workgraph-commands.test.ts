/**
 * Conformance test: Workgraph commands.
 *
 * Exercises all workgraph commands marked conformanceRequired: true in the manifest.
 * We validate envelope shape — business logic results (needs_setup, not_found) are acceptable.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("Workgraph Commands Conformance", () => {
  it("workgraph status --json produces a valid envelope", () => {
    const result = runCli(["workgraph", "status", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("workgraph list --json produces a valid envelope", () => {
    const result = runCli(["workgraph", "list", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("workgraph show --json command exists and responds", () => {
    // show requires a work-item-id argument
    const result = runCli(["workgraph", "show", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("workgraph claim --json command exists and responds", () => {
    // claim requires work-item-id and --actor args
    const result = runCli(["workgraph", "claim", "nonexistent-id", "--actor", "test-agent", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("workgraph release --json command exists and responds", () => {
    // release requires claim-id and --reason args
    const result = runCli(["workgraph", "release", "nonexistent-id", "--reason", "test", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("workgraph complete --json command exists and responds", () => {
    // complete requires claim-id
    const result = runCli(["workgraph", "complete", "nonexistent-id", "--json"]);
    if (result.parsed) {
      const errors = validateEnvelopeShape(result.parsed);
      expect(errors).toEqual([]);
      expect(result.parsed.schema_version).toBe("pantheon_cli_result@0.1.0");
    } else {
      expect(result.exitCode).not.toBe(127);
    }
  });

  it("workgraph conflicts --json produces a valid envelope", () => {
    const result = runCli(["workgraph", "conflicts", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("workgraph joins --json produces a valid envelope", () => {
    const result = runCli(["workgraph", "joins", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("workgraph events --json produces a valid envelope", () => {
    const result = runCli(["workgraph", "events", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });

  it("workgraph import-dsa --json produces a valid envelope", () => {
    const result = runCli(["workgraph", "import-dsa", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });
});

/**
 * Conformance test: CLI Envelope shape validation.
 *
 * Verifies that the `clarion doctor --json` command produces a valid CliResultEnvelope.
 * This is the most basic conformance test — if doctor works, the envelope infrastructure is sound.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("CLI Envelope Conformance", () => {
  it("doctor --json produces a valid CliResultEnvelope", () => {
    const result = runCli(["doctor", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
    expect(result.parsed!.target_type).toBe("doctor");
  });

  it("doctor --json has correct command field", () => {
    const result = runCli(["doctor", "--json"]);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.command).toContain("doctor");
  });

  it("doctor --json has privacy disclosure", () => {
    const result = runCli(["doctor", "--json"]);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.privacy.disclosure).toBe("full-local");
  });

  it("check --json produces a valid CliResultEnvelope", () => {
    const result = runCli(["check", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });
});

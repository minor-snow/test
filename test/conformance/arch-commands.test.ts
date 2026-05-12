/**
 * Conformance test: Architecture commands.
 *
 * Exercises arch commands marked conformanceRequired: true in the manifest.
 * We validate envelope shape — business logic results (needs_setup, not_found) are acceptable.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import { runCli, validateEnvelopeShape } from "./helpers";

declare const describe: any;
declare const it: any;
declare const expect: any;

describe("Architecture Commands Conformance", () => {
  it("arch check --json produces a valid envelope", () => {
    const result = runCli(["arch", "check", "--json"]);
    expect(result.parsed).toBeDefined();
    const errors = validateEnvelopeShape(result.parsed);
    expect(errors).toEqual([]);
    expect(result.parsed!.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.parsed!.status).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { validateChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteValidator.js";
import { buildChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteBuilder.js";
import { scanRepo } from "../../../src/repoObservation/repoScanner.js";
import type { ChangeContractLite } from "../../../src/changeContract/lite/types.js";

const FIXTURE_ROOT = join(import.meta.dirname, "..", "..", "fixtures", "repo_fixture");

function makeValidLite(): ChangeContractLite {
  const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
  return buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
}

describe("validateChangeContractLite", () => {
  it("valid Lite contract passes", () => {
    const result = validateChangeContractLite(makeValidLite());
    expect(result.status).toBe("valid");
    expect(result.errors).toHaveLength(0);
  });

  it("rejects invalid schema_version", () => {
    const contract = { ...makeValidLite(), schema_version: "wrong" as any };
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
  });

  it("rejects invalid mode", () => {
    const contract = { ...makeValidLite(), mode: "full" as any };
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
  });

  it("rejects missing contract_id", () => {
    const contract = { ...makeValidLite(), contract_id: "" };
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
  });

  it("rejects lifecycle_status field", () => {
    const contract = { ...makeValidLite(), lifecycle_status: "active" } as any;
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("lifecycle_status"))).toBe(true);
  });

  it("rejects result_events field", () => {
    const contract = { ...makeValidLite(), result_events: [] } as any;
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("result_events"))).toBe(true);
  });

  it("rejects obligations field", () => {
    const contract = { ...makeValidLite(), obligations: {} } as any;
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("obligations"))).toBe(true);
  });

  it("warns on non-pass with empty actions", () => {
    const contract = {
      ...makeValidLite(),
      decision: { verdict: "requires_review" as const, reasons: ["test"], required_actions: [] as string[] },
    };
    const result = validateChangeContractLite(contract);
    expect(result.warnings.some(w => w.includes("required_actions"))).toBe(true);
  });

  it("rejects non-pass with empty reasons", () => {
    const contract = {
      ...makeValidLite(),
      decision: { verdict: "requires_review" as const, reasons: [] as string[], required_actions: ["x"] },
    };
    const result = validateChangeContractLite(contract);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("reason"))).toBe(true);
  });
});

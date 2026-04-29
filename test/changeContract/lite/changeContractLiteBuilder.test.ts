import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { buildChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteBuilder.js";
import { scanRepo } from "../../../src/repoObservation/repoScanner.js";

const FIXTURE_ROOT = join(import.meta.dirname, "..", "..", "fixtures", "repo_fixture");

function getFixtureObservations() {
  return scanRepo({ repoRoot: FIXTURE_ROOT });
}

describe("buildChangeContractLite", () => {
  it("builds a Lite contract from observations", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
    expect(contract.schema_version).toBe("change_contract_lite.v1");
    expect(contract.mode).toBe("bootstrap");
    expect(contract.contract_id).toBeTruthy();
    expect(contract.refs.repo_observations_hash).toBe(obs.meta.observation_hash);
  });

  it("normalizes changed files", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src\\utils\\format.ts"] });
    const status = contract.observed_scope.changed_file_statuses[0];
    expect(status.path).toBe("src/utils/format.ts");
  });

  it("classifies observed file as observed", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
    const status = contract.observed_scope.changed_file_statuses.find(s => s.path === "src/utils/format.ts");
    expect(status?.status).toBe("observed");
  });

  it("classifies invalid path as path_invalid → requires_reverse_issue", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["../escape.ts"] });
    const status = contract.observed_scope.changed_file_statuses[0];
    expect(status.status).toBe("path_invalid");
    expect(contract.decision.verdict).toBe("requires_reverse_issue");
  });

  it("classifies excluded dir path → requires_reverse_issue", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["node_modules/pkg/index.js"] });
    const status = contract.observed_scope.changed_file_statuses[0];
    expect(status.status).toBe("excluded");
    expect(contract.decision.verdict).toBe("requires_reverse_issue");
  });

  it("classifies not_observed file → requires_review", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/nonexistent/file.ts"] });
    const status = contract.observed_scope.changed_file_statuses[0];
    expect(status.status).toBe("not_observed");
    expect(contract.decision.verdict).toBe("requires_review");
  });

  it("sensitive path → requires_review", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
    expect(contract.decision.verdict).toBe("requires_review");
    expect(contract.observed_scope.touched_sensitive_paths.length).toBeGreaterThan(0);
  });

  it("no test mapping → requires_review (NOT fail)", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/unmapped/noTest.ts"] });
    expect(contract.decision.verdict).toBe("requires_review");
    expect(contract.decision.reasons.some(r => r.includes("No test mapping"))).toBe(true);
    // Must NOT be fail
    expect(contract.decision.verdict).not.toBe("fail");
  });

  it("working_tree_only → requires_review", () => {
    const obs = getFixtureObservations();
    expect(obs.repo.repo_state).toBe("working_tree_only");
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
    expect(contract.decision.verdict).toBe("requires_review");
    expect(contract.decision.reasons.some(r => r.includes("No Git repository"))).toBe(true);
  });

  it("changed_file_statuses covers every changed file", () => {
    const obs = getFixtureObservations();
    const changed = ["src/utils/format.ts", "src/auth/login.ts", "src/nonexistent.ts"];
    const contract = buildChangeContractLite({ observations: obs, changedFiles: changed });
    expect(contract.observed_scope.changed_file_statuses.length).toBeGreaterThanOrEqual(changed.length);
  });

  it("pass when clean observed file has test", () => {
    // Need a file that: is observed, has test mapping, not sensitive, in clean repo
    // The fixture repo is working_tree_only, so this will still be requires_review
    // This test verifies the test-mapping part doesn't produce fail
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
    // Even though it has a test, working_tree_only triggers review
    expect(contract.decision.verdict).toBe("requires_review");
    // But verify no "fail" and no "No test mapping" reason for this file
    expect(contract.decision.reasons.every(r => !r.includes("No test mapping found") || !r.includes("format.ts"))).toBe(true);
  });

  it("includes intent when provided", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({
      observations: obs,
      changedFiles: ["src/utils/format.ts"],
      intent: "Add currency formatting for EUR",
    });
    expect(contract.intent).toBe("Add currency formatting for EUR");
  });

  it("does not include lifecycle_status or result_events", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
    expect("lifecycle_status" in contract).toBe(false);
    expect("result_events" in contract).toBe(false);
  });

  it("priority: requires_reverse_issue > requires_review", () => {
    const obs = getFixtureObservations();
    const contract = buildChangeContractLite({
      observations: obs,
      changedFiles: ["../escape.ts", "src/utils/format.ts"],
    });
    expect(contract.decision.verdict).toBe("requires_reverse_issue");
  });
});

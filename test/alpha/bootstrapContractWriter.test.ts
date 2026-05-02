import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeBootstrapContract, type BootstrapContractInput } from "../../src/alpha/bootstrapContractWriter.js";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("writeBootstrapContract", () => {
  let tmpDir1: string;
  let tmpDir2: string;

  beforeEach(() => {
    tmpDir1 = mkdtempSync(join(tmpdir(), "pantheon-test-bcontract1-"));
    tmpDir2 = mkdtempSync(join(tmpdir(), "pantheon-test-bcontract2-"));
  });

  afterEach(() => {
    rmSync(tmpDir1, { recursive: true, force: true });
    rmSync(tmpDir2, { recursive: true, force: true });
  });

  function getContract(repoRoot: string) {
    const content = readFileSync(join(repoRoot, ".pantheon", "bootstrap", "bootstrap_contract.json"), "utf-8");
    return JSON.parse(content) as { change_id: string; allowed_scope: string[] };
  }

  it("same content + different absolute repo_root => same bootstrap_change_id", () => {
    const input1: BootstrapContractInput = {
      repoRoot: tmpDir1,
      policyVersion: "1.0",
      generatedFiles: [
        { path: "AGENTS.md", content: "Agent docs" },
        { path: "pantheon.alpha.json", content: "{}" }
      ]
    };

    const input2: BootstrapContractInput = {
      repoRoot: tmpDir2,
      policyVersion: "1.0",
      generatedFiles: [
        { path: "AGENTS.md", content: "Agent docs" },
        { path: "pantheon.alpha.json", content: "{}" }
      ]
    };

    writeBootstrapContract(input1);
    writeBootstrapContract(input2);

    const contract1 = getContract(tmpDir1);
    const contract2 = getContract(tmpDir2);

    expect(contract1.change_id).toBe(contract2.change_id);
    expect(contract1.change_id).toMatch(/^boot_[0-9a-f]{16}$/);
  });

  it("same paths + different content => different bootstrap_change_id", () => {
    const input1: BootstrapContractInput = {
      repoRoot: tmpDir1,
      policyVersion: "1.0",
      generatedFiles: [
        { path: "AGENTS.md", content: "Agent docs A" }
      ]
    };

    const input2: BootstrapContractInput = {
      repoRoot: tmpDir2,
      policyVersion: "1.0",
      generatedFiles: [
        { path: "AGENTS.md", content: "Agent docs B" }
      ]
    };

    writeBootstrapContract(input1);
    writeBootstrapContract(input2);

    const contract1 = getContract(tmpDir1);
    const contract2 = getContract(tmpDir2);

    expect(contract1.change_id).not.toBe(contract2.change_id);
  });

  it("same content + different policy_version => different bootstrap_change_id", () => {
    const input1: BootstrapContractInput = {
      repoRoot: tmpDir1,
      policyVersion: "1.0",
      generatedFiles: [
        { path: "AGENTS.md", content: "Agent docs" }
      ]
    };

    const input2: BootstrapContractInput = {
      repoRoot: tmpDir2,
      policyVersion: "2.0",
      generatedFiles: [
        { path: "AGENTS.md", content: "Agent docs" }
      ]
    };

    writeBootstrapContract(input1);
    writeBootstrapContract(input2);

    const contract1 = getContract(tmpDir1);
    const contract2 = getContract(tmpDir2);

    expect(contract1.change_id).not.toBe(contract2.change_id);
  });
});

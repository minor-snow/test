import { describe, it, expect } from "vitest";
import { classifyBootstrapDiffFile, isMixedBootstrapAndRepair } from "../../src/alpha/bootstrapScope.js";

describe("Bootstrap Scope Classification", () => {
  it("classifies AGENTS.md as bootstrap_init", () => {
    expect(classifyBootstrapDiffFile("AGENTS.md")).toBe("bootstrap_init");
  });

  it("classifies pantheon configs as bootstrap_init", () => {
    expect(classifyBootstrapDiffFile("pantheon.alpha.json")).toBe("bootstrap_init");
    expect(classifyBootstrapDiffFile("pantheon.agent.json")).toBe("bootstrap_init");
    expect(classifyBootstrapDiffFile("pantheon.json")).toBe("bootstrap_init");
  });

  it("classifies github workflows as bootstrap_init", () => {
    expect(classifyBootstrapDiffFile(".github/workflows/pantheon-repair.yml")).toBe("bootstrap_init");
    expect(classifyBootstrapDiffFile(".github/workflows/pantheon-repair.yaml")).toBe("bootstrap_init");
  });

  it("classifies pantheon docs as bootstrap_init", () => {
    expect(classifyBootstrapDiffFile("docs/pantheon/setup.md")).toBe("bootstrap_init");
    expect(classifyBootstrapDiffFile("docs/pantheon/agent.md")).toBe("bootstrap_init");
  });

  it("classifies bootstrap generated artifacts as bootstrap_artifact", () => {
    expect(classifyBootstrapDiffFile(".pantheon/bootstrap/bootstrap_contract.json")).toBe("bootstrap_artifact");
    expect(classifyBootstrapDiffFile(".pantheon/bootstrap/bootstrap_scope.md")).toBe("bootstrap_artifact");
  });

  it("classifies source files as business", () => {
    expect(classifyBootstrapDiffFile("src/foo.ts")).toBe("business");
    expect(classifyBootstrapDiffFile("package.json")).toBe("business");
    expect(classifyBootstrapDiffFile("README.md")).toBe("business");
  });
});

describe("isMixedBootstrapAndRepair", () => {
  it("returns false for only business files", () => {
    expect(isMixedBootstrapAndRepair(["src/foo.ts", "package.json"])).toBe(false);
  });

  it("returns false for only bootstrap files", () => {
    expect(isMixedBootstrapAndRepair(["AGENTS.md", "pantheon.alpha.json"])).toBe(false);
  });

  it("returns false for only bootstrap artifacts", () => {
    expect(isMixedBootstrapAndRepair([".pantheon/bootstrap/bootstrap_contract.json"])).toBe(false);
  });

  it("returns true for mixed bootstrap and business", () => {
    expect(isMixedBootstrapAndRepair(["AGENTS.md", "src/foo.ts"])).toBe(true);
  });

  it("returns true for mixed bootstrap artifact and business", () => {
    expect(isMixedBootstrapAndRepair([".pantheon/bootstrap/bootstrap_contract.json", "src/foo.ts"])).toBe(true);
  });

  it("returns false for bootstrap + pantheon docs", () => {
    expect(isMixedBootstrapAndRepair(["AGENTS.md", "docs/pantheon/setup.md"])).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseCodeowners } from "../../src/repoObservation/codeownersParser.js";

const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");

describe("parseCodeowners", () => {
  it("parses root CODEOWNERS file", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    expect(result.owner_hints.length).toBeGreaterThanOrEqual(4);
  });

  it("extracts owners with @ prefix", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const authHint = result.owner_hints.find(h => h.path_pattern === "src/auth/");
    expect(authHint).toBeDefined();
    expect(authHint!.owners).toContain("@security-team");
  });

  it("supports multiple owners on one line", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const paymentHint = result.owner_hints.find(h => h.path_pattern === "src/payment/");
    expect(paymentHint).toBeDefined();
    expect(paymentHint!.owners).toContain("@billing-team");
    expect(paymentHint!.owners).toContain("@security-team");
  });

  it("parses .github/CODEOWNERS with correct source label", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const syncHint = result.owner_hints.find(h => h.path_pattern === "src/sync/");
    expect(syncHint).toBeDefined();
    expect(syncHint!.owners).toContain("@infra-team");
    expect(syncHint!.source).toBe("CODEOWNERS:.github");
  });

  it("root CODEOWNERS gets source 'CODEOWNERS'", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const authHint = result.owner_hints.find(h => h.path_pattern === "src/auth/");
    expect(authHint).toBeDefined();
    expect(authHint!.source).toBe("CODEOWNERS");
  });

  it("marks ** glob patterns as unresolved_complex_pattern", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const complexHint = result.owner_hints.find(h => h.path_pattern.includes("**"));
    expect(complexHint).toBeDefined();
    expect(complexHint!.match_status).toBe("unresolved_complex_pattern");
  });

  it("marks simple path patterns as simple_pattern", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const simpleHint = result.owner_hints.find(h => h.path_pattern === "src/auth/");
    expect(simpleHint).toBeDefined();
    expect(simpleHint!.match_status).toBe("simple_pattern");
  });

  it("marks * wildcard patterns as unresolved_complex_pattern", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    const mdHint = result.owner_hints.find(h => h.path_pattern === "*.md");
    expect(mdHint).toBeDefined();
    expect(mdHint!.match_status).toBe("unresolved_complex_pattern");
  });

  it("records unresolved patterns", () => {
    const result = parseCodeowners(FIXTURE_ROOT);
    expect(result.unresolved_patterns.length).toBeGreaterThanOrEqual(1);
  });
});

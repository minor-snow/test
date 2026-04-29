import { describe, it, expect } from "vitest";
import { classifyFile, detectLanguage } from "../../src/repoObservation/fileClassifier.js";

describe("classifyFile", () => {
  it("classifies src/ as src", () => {
    expect(classifyFile("src/foo.ts")).toBe("src");
  });

  it("classifies lib/ as src", () => {
    expect(classifyFile("lib/bar.ts")).toBe("src");
  });

  it("classifies app/ as src", () => {
    expect(classifyFile("app/main.ts")).toBe("src");
  });

  it("classifies test/ as test", () => {
    expect(classifyFile("test/foo.test.ts")).toBe("test");
  });

  it("classifies tests/ as test", () => {
    expect(classifyFile("tests/bar.test.ts")).toBe("test");
  });

  it("classifies __tests__/ as test", () => {
    expect(classifyFile("src/__tests__/foo.test.ts")).toBe("test");
  });

  it("classifies .test.ts inside src/ as test (not src)", () => {
    expect(classifyFile("src/foo.test.ts")).toBe("test");
  });

  it("classifies .spec.ts as test", () => {
    expect(classifyFile("src/foo.spec.ts")).toBe("test");
  });

  it("classifies tsconfig.json as config", () => {
    expect(classifyFile("tsconfig.json")).toBe("config");
  });

  it("classifies package.json as config", () => {
    expect(classifyFile("package.json")).toBe("config");
  });

  it("classifies .github/ as config", () => {
    expect(classifyFile(".github/CODEOWNERS")).toBe("config");
  });

  it("classifies config/ as config", () => {
    expect(classifyFile("config/app.yaml")).toBe("config");
  });

  it("classifies generated/ as generated", () => {
    expect(classifyFile("generated/api.generated.ts")).toBe("generated");
  });

  it("classifies .generated.ts as generated", () => {
    expect(classifyFile("src/api.generated.ts")).toBe("generated");
  });

  it("classifies docs/ as docs", () => {
    expect(classifyFile("docs/README.md")).toBe("docs");
  });

  it("classifies root .md as docs", () => {
    expect(classifyFile("CHANGELOG.md")).toBe("docs");
  });

  it("classifies scripts/ as script", () => {
    expect(classifyFile("scripts/build.ts")).toBe("script");
  });

  it("classifies bin/ as script", () => {
    expect(classifyFile("bin/cli.js")).toBe("script");
  });

  it("classifies .png as asset", () => {
    expect(classifyFile("assets/logo.png")).toBe("asset");
  });

  it("classifies unknown file as unknown", () => {
    expect(classifyFile("random/stuff.xyz")).toBe("unknown");
  });
});

describe("detectLanguage", () => {
  it("detects TypeScript", () => {
    expect(detectLanguage("src/foo.ts")).toBe("typescript");
  });

  it("detects TSX", () => {
    expect(detectLanguage("src/App.tsx")).toBe("typescript");
  });

  it("detects JavaScript", () => {
    expect(detectLanguage("src/foo.js")).toBe("javascript");
  });

  it("detects JSX", () => {
    expect(detectLanguage("src/App.jsx")).toBe("javascript");
  });

  it("detects JSON", () => {
    expect(detectLanguage("package.json")).toBe("json");
  });

  it("detects Markdown", () => {
    expect(detectLanguage("README.md")).toBe("markdown");
  });

  it("detects YAML", () => {
    expect(detectLanguage("config/app.yaml")).toBe("yaml");
  });

  it("detects YML", () => {
    expect(detectLanguage("config/app.yml")).toBe("yaml");
  });

  it("returns other for unknown extension", () => {
    expect(detectLanguage("Makefile")).toBe("other");
  });
});

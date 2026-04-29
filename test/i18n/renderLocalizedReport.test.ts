/**
 * P15.2 — Tests for localized report rendering
 *
 * Critical invariant: technical IDs (node_id, file paths, symbol names)
 * must be preserved in ALL locales. They are NEVER translated.
 */

import { describe, it, expect } from "vitest";
import { renderLocalizedReport, renderLocalizedContext, type BlastRadiusReportInput } from "../../src/i18n/renderLocalizedReport.js";
import { TERM_GLOSSARY, lookupTerm, getTermDisplay, isPreservedId } from "../../src/i18n/termGlossary.js";

// ============================================================
// Term Glossary
// ============================================================

describe("termGlossary", () => {
  it("all terms have en and zhCN", () => {
    for (const term of TERM_GLOSSARY) {
      expect(term.en, `${term.id} missing en`).toBeTruthy();
      expect(term.zhCN, `${term.id} missing zhCN`).toBeTruthy();
    }
  });

  it("zhCN terms preserve English in parentheses for key system concepts", () => {
    const mustPreserve = ["conflict_policy", "forbidden_assumption", "state_machine", "data_model", "blast_radius"];
    for (const id of mustPreserve) {
      const term = lookupTerm(id);
      expect(term, `missing term: ${id}`).toBeDefined();
      const enName = term!.en;
      expect(term!.zhCN).toContain(enName);
    }
  });

  it("lookupTerm returns undefined for unknown id", () => {
    expect(lookupTerm("nonexistent_xyz")).toBeUndefined();
  });

  it("getTermDisplay falls back to id for unknown terms", () => {
    expect(getTermDisplay("unknown_abc", "en")).toBe("unknown_abc");
    expect(getTermDisplay("unknown_abc", "zh-CN")).toBe("unknown_abc");
  });

  it("isPreservedId is true for node kinds", () => {
    expect(isPreservedId("conflict_policy")).toBe(true);
    expect(isPreservedId("forbidden_assumption")).toBe(true);
    expect(isPreservedId("state_machine")).toBe(true);
    expect(isPreservedId("data_model")).toBe(true);
  });

  it("isPreservedId is false for display-only terms", () => {
    expect(isPreservedId("blast_radius")).toBe(false);
    expect(isPreservedId("architecture")).toBe(false);
    expect(isPreservedId("unknown")).toBe(false);
  });
});

// ============================================================
// Localized Report
// ============================================================

const SAMPLE_INPUT: BlastRadiusReportInput = {
  changed_nodes: ["blk:arch:b_conflict_001"],
  direct: 24,
  downstream: 63,
  files: 10,
  symbols: 21,
  tests: 8,
  highest_risk: "high",
  affected_files: ["file:Dtos.kt", "file:ConflictPolicy.kt"],
  affected_tests: ["test:policy:patient_case_status", "test:forbidden:FA-001"],
  risk_amplifications: [
    { node_id: "hc:conflict_policy:patient_case_status", risk_level: "high", kind: "conflict_policy" },
    { node_id: "hc:forbidden:FA-001", risk_level: "high", kind: "forbidden_assumption" },
  ],
  critical_paths: [
    { nodes: ["blk:arch:b_conflict_001", "hc:conflict_policy:patient_case_status", "test:policy:patient_case_status"], risk_level: "high" },
  ],
};

describe("renderLocalizedReport", () => {
  describe("English", () => {
    const report = renderLocalizedReport(SAMPLE_INPUT, "en");

    it("contains English title", () => {
      expect(report).toContain("Blast Radius Report");
    });

    it("contains summary numbers", () => {
      expect(report).toContain("24");
      expect(report).toContain("63");
      expect(report).toContain("10");
    });

    it("preserves all technical node IDs", () => {
      expect(report).toContain("blk:arch:b_conflict_001");
      expect(report).toContain("hc:conflict_policy:patient_case_status");
      expect(report).toContain("hc:forbidden:FA-001");
      expect(report).toContain("test:policy:patient_case_status");
      expect(report).toContain("test:forbidden:FA-001");
    });

    it("preserves file paths", () => {
      expect(report).toContain("file:Dtos.kt");
      expect(report).toContain("file:ConflictPolicy.kt");
    });
  });

  describe("Chinese", () => {
    const report = renderLocalizedReport(SAMPLE_INPUT, "zh-CN");

    it("contains Chinese title with English in parentheses", () => {
      expect(report).toContain("影响范围报告（Blast Radius Report）");
    });

    it("contains Chinese labels", () => {
      expect(report).toContain("变更节点");
      expect(report).toContain("摘要");
      expect(report).toContain("直接影响");
      expect(report).toContain("总下游影响");
      expect(report).toContain("最高风险");
    });

    it("contains Chinese risk level with English preserved", () => {
      expect(report).toContain("高（HIGH）");
    });

    it("preserves ALL technical node IDs — never translates them", () => {
      expect(report).toContain("blk:arch:b_conflict_001");
      expect(report).toContain("hc:conflict_policy:patient_case_status");
      expect(report).toContain("hc:forbidden:FA-001");
      expect(report).toContain("test:policy:patient_case_status");
      expect(report).toContain("test:forbidden:FA-001");
    });

    it("preserves file paths — never translates them", () => {
      expect(report).toContain("file:Dtos.kt");
      expect(report).toContain("file:ConflictPolicy.kt");
    });

    it("does not contain patient_case_status translated to Chinese", () => {
      // This is the critical test: technical IDs must NOT be translated
      expect(report).not.toContain("病患");
      expect(report).not.toContain("患者");
    });

    it("contains Chinese risk reason with English preserved", () => {
      expect(report).toContain("冲突策略（Conflict Policy）");
    });
  });
});

// ============================================================
// Localized Context
// ============================================================

describe("renderLocalizedContext", () => {
  const contextInput = {
    affected_files: ["Dtos.kt", "ConflictPolicy.kt", "contracts/Guards.kt"],
    affected_tests: ["test:policy:patient_case_status", "test:forbidden:FA-001"],
    constraints: [
      "- conflict policy: patient_case_status requires vector_clock",
      "- forbidden assumption: no silent overwrite",
    ],
  };

  describe("English", () => {
    const ctx = renderLocalizedContext(contextInput, "en");

    it("has English section titles", () => {
      expect(ctx).toContain("Scoped Implementation Context");
      expect(ctx).toContain("Affected Files");
      expect(ctx).toContain("Constraints");
    });

    it("preserves technical identifiers", () => {
      expect(ctx).toContain("Dtos.kt");
      expect(ctx).toContain("patient_case_status");
      expect(ctx).toContain("vector_clock");
    });
  });

  describe("Chinese", () => {
    const ctx = renderLocalizedContext(contextInput, "zh-CN");

    it("has Chinese section titles", () => {
      expect(ctx).toContain("实现上下文（Implementation Context）");
      expect(ctx).toContain("允许修改的文件");
      expect(ctx).toContain("必须遵守的约束");
    });

    it("preserves ALL technical identifiers — never translates file names", () => {
      expect(ctx).toContain("Dtos.kt");
      expect(ctx).toContain("ConflictPolicy.kt");
      expect(ctx).toContain("contracts/Guards.kt");
    });

    it("preserves ALL technical identifiers — never translates test IDs", () => {
      expect(ctx).toContain("test:policy:patient_case_status");
      expect(ctx).toContain("test:forbidden:FA-001");
    });

    it("preserves constraint technical terms", () => {
      expect(ctx).toContain("patient_case_status");
      expect(ctx).toContain("vector_clock");
    });
  });
});

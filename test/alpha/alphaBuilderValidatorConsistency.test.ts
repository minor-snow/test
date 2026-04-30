import { describe, expect, it } from "vitest";
import {
  generateAgentBugReportTemplate,
  generatePantheonAgentJson,
  generatePantheonAlphaJson,
} from "../../src/alpha/alphaTemplates.js";
import { pantheonAgentConfigSchema, pantheonAlphaConfigSchema } from "../../src/alpha/types.js";
import { agentBugReportSchema } from "../../src/repair/types.js";

describe("alpha builder / validator consistency", () => {
  it("accepts the canonical generated agent config", () => {
    const parsed = pantheonAgentConfigSchema.safeParse(generatePantheonAgentJson());
    expect(parsed.success).toBe(true);
  });

  it("accepts the canonical generated alpha config", () => {
    const parsed = pantheonAlphaConfigSchema.safeParse(generatePantheonAlphaJson());
    expect(parsed.success).toBe(true);
  });

  it("accepts the canonical generated agent bug report template", () => {
    const parsed = agentBugReportSchema.safeParse(JSON.parse(generateAgentBugReportTemplate()));
    expect(parsed.success).toBe(true);
  });
});

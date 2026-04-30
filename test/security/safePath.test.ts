import { describe, expect, it } from "vitest";
import { assertInsideRoot, resolveInsideRoot, resolveTrustedPath, sanitizeFileNameSegment } from "../../src/safePath.js";

describe("safePath", () => {
  it("resolves repo-relative paths inside the trusted root", () => {
    const resolved = resolveInsideRoot("H:/Boom/pantheon", "data/trial");
    expect(resolved.replace(/\\/g, "/")).toContain("H:/Boom/pantheon/data/trial");
  });

  it("rejects escape attempts", () => {
    expect(() => resolveInsideRoot("H:/Boom/pantheon", "../outside")).toThrow(/escapes trusted root/i);
  });

  it("allows explicit trusted absolute paths only when requested", () => {
    expect(() => resolveTrustedPath("H:/Boom/pantheon", "C:/tmp/outside")).toThrow(/escapes trusted root/i);
    expect(resolveTrustedPath("H:/Boom/pantheon", "C:/tmp/outside", { allowAbsolute: true }).replace(/\\/g, "/")).toBe("C:/tmp/outside");
  });

  it("sanitizes file name segments and rejects traversal separators", () => {
    expect(sanitizeFileNameSegment("repair_123")).toBe("repair_123");
    expect(() => sanitizeFileNameSegment("../repair_123")).toThrow(/path separators/i);
  });

  it("detects already-resolved escapes", () => {
    expect(() => assertInsideRoot("H:/Boom/pantheon", "H:/Boom/elsewhere/file.txt")).toThrow(/escapes trusted root/i);
  });
});

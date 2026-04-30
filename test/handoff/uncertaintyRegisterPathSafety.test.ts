import { describe, expect, it } from "vitest";
import { createUncertaintyRegister, saveRegister } from "../../src/handoff/uncertaintyRegister.js";

describe("uncertaintyRegister path safety", () => {
  it("rejects saving outside the trusted root by default", async () => {
    await expect(saveRegister("../outside/register.json", createUncertaintyRegister())).rejects.toThrow(/escapes trusted root/i);
  });
});

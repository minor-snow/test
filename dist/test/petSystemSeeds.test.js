import { describe, expect, it } from "vitest";
import { validateForWrite } from "../src/schemaRegistry.js";
import { crossLintArtifacts } from "../src/crossArtifactLinter.js";
import { createPetArchitectureSeed, createPetInterfaceSpecSeed, } from "../src/trial/petSystemSeeds.js";
describe("petSystemSeeds", () => {
    it("creates a valid ArchitectureDraft seed", () => {
        const artifact = createPetArchitectureSeed();
        const result = validateForWrite("architecture_draft", artifact);
        expect(result.valid).toBe(true);
        expect(artifact.artifact_id).toBe("pet_triage_architecture");
        expect(artifact.sections).toHaveLength(6);
        expect(artifact.sections.flatMap((section) => section.commitments)).toHaveLength(18);
        expect(artifact.sections.flatMap((section) => section.commitments).every((block) => block.status === "approved")).toBe(true);
        expect(artifact.sections
            .flatMap((section) => section.commitments)
            .some((block) => block.text.includes("must request the backend triage engine in real time"))).toBe(true);
        expect(artifact.sections
            .flatMap((section) => section.commitments)
            .some((block) => block.text.includes("must lock the triage screen"))).toBe(true);
    });
    it("creates a valid InterfaceSpec seed", () => {
        const artifact = createPetInterfaceSpecSeed();
        const result = validateForWrite("interface_spec", artifact);
        const interfaceBlocks = artifact.sections.flatMap((section) => section.commitments.filter((block) => block.type === "interface"));
        expect(result.valid).toBe(true);
        expect(artifact.artifact_id).toBe("pet_triage_interface");
        expect(interfaceBlocks.length).toBeGreaterThan(0);
        expect(interfaceBlocks.every((block) => Array.isArray(block.linked_architecture_blocks) &&
            block.linked_architecture_blocks.length > 0)).toBe(true);
        expect(interfaceBlocks.some((block) => block.text.includes("POST /triage/submit"))).toBe(true);
    });
    it("cross-links architecture and interface seeds without P7 issues", () => {
        const architecture = createPetArchitectureSeed();
        const interfaceSpec = createPetInterfaceSpecSeed();
        expect(crossLintArtifacts([architecture, interfaceSpec])).toEqual([]);
    });
});
//# sourceMappingURL=petSystemSeeds.test.js.map
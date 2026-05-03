import { ensureAlphaScaffolding } from "./alphaFileWriter.js";
export function cmdAlphaInit(input) {
    console.log(`[Pantheon Alpha] Initializing Pantheon in ${input.repoRoot}...`);
    ensureAlphaScaffolding(input.repoRoot, {
        force: input.force,
        noGithub: input.noGithub,
        actionRef: input.actionRef,
        artifactMode: input.artifactMode,
    });
    console.log(`[Pantheon Alpha] Initialization complete.`);
    console.log(`[Pantheon Alpha] Next, you can run: npx pantheon-alpha doctor`);
}
//# sourceMappingURL=alphaInit.js.map
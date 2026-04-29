import { ensureAlphaScaffolding } from "./alphaFileWriter.js";

export interface AlphaInitInput {
  repoRoot: string;
  force?: boolean;
  noGithub?: boolean;
  actionRef?: string;
  artifactMode?: "public" | "private" | "debug";
}

export function cmdAlphaInit(input: AlphaInitInput): void {
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

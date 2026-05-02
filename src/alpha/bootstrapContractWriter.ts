import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { stableTextHash, shortStableId } from "../deterministic.js";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface BootstrapContractInput {
  repoRoot: string;
  policyVersion: string;
  generatedFiles: GeneratedFile[];
  packageNameOrSlug?: string;
}

export function writeBootstrapContract(input: BootstrapContractInput): void {
  const normalizedFiles = input.generatedFiles.map(f => ({
    path: f.path.replace(/\\/g, "/"),
    content_hash: stableTextHash(f.content),
  }));

  const bootstrapChangeId = shortStableId("boot", {
    schema_version: "bootstrap_contract@0.1.0",
    policy_version: input.policyVersion,
    generated_files: normalizedFiles,
    ...(input.packageNameOrSlug ? { repo: input.packageNameOrSlug } : {}),
  });

  const bootstrapDir = join(input.repoRoot, ".pantheon", "bootstrap");
  mkdirSync(bootstrapDir, { recursive: true });

  const contract = {
    schema_version: "bootstrap_contract@0.1.0",
    change_id: bootstrapChangeId,
    description: "Pantheon governance harness initialization files.",
    allowed_scope: normalizedFiles.map(f => f.path),
  };

  writeFileSync(
    join(bootstrapDir, "bootstrap_contract.json"),
    JSON.stringify(contract, null, 2) + "\n"
  );

  const scopeMd = `# Pantheon Bootstrap Scope\n\nChange ID: \`${bootstrapChangeId}\`\n\nThe following files are part of the Pantheon bootstrap initialization and are allowed in this change:\n\n${normalizedFiles.map(f => `- \`${f.path}\``).join("\n")}\n`;
  writeFileSync(join(bootstrapDir, "bootstrap_scope.md"), scopeMd);

  const taskMd = `# Pantheon Bootstrap Task\n\nChange ID: \`${bootstrapChangeId}\`\n\nThis task isolates the Pantheon initialization files from business logic repair sessions. Do not mix business logic changes with these files.\n`;
  writeFileSync(join(bootstrapDir, "bootstrap_task.md"), taskMd);
}

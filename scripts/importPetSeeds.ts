import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  appendAuditLog,
  createArtifact,
  loadCanonicalPointer,
  loadRevision,
  type StoreConfig,
} from "../src/artifactStore.js";
import { crossLintArtifacts } from "../src/crossArtifactLinter.js";
import { getHashMeta } from "../src/hash.js";
import { integrityCheck } from "../src/integrityCheck.js";
import { renderMarkdown } from "../src/renderMarkdown.js";
import { validateForWrite } from "../src/schemaRegistry.js";
import {
  createPetArchitectureSeed,
  createPetInterfaceSpecSeed,
} from "../src/trial/petSystemSeeds.js";
import type { Artifact } from "../src/types.js";

function validateSeed(objectType: "architecture_draft" | "interface_spec", artifact: Artifact): void {
  const result = validateForWrite(objectType, artifact);
  if (!result.valid) {
    throw new Error(
      `Seed validation failed for ${artifact.artifact_id}:\n${result.errors.join("\n")}`
    );
  }
}

async function writeProjection(config: StoreConfig, artifact: Artifact): Promise<void> {
  const path = join(config.dataDir, "projections", `${artifact.artifact_id}.md`);
  await fs.mkdir(join(config.dataDir, "projections"), { recursive: true });
  await fs.writeFile(path, renderMarkdown(artifact), "utf8");
}

async function ensureSeed(config: StoreConfig, artifact: Artifact): Promise<Artifact> {
  const existingPointer = await loadCanonicalPointer(config, artifact.artifact_id);
  if (existingPointer) {
    if (existingPointer.current_revision_id !== artifact.revision_id) {
      throw new Error(
        `Artifact ${artifact.artifact_id} already exists with canonical ${existingPointer.current_revision_id}, ` +
          `expected seed ${artifact.revision_id}. Refusing to overwrite canonical state.`
      );
    }

    const existingRevision = await loadRevision(
      config,
      artifact.artifact_id,
      existingPointer.current_revision_id
    );
    if (!existingRevision) {
      throw new Error(
        `Canonical pointer exists for ${artifact.artifact_id}, but revision ${existingPointer.current_revision_id} is missing.`
      );
    }
    return existingRevision;
  }

  const created = await createArtifact(config, artifact);
  await appendAuditLog(config, {
    entry_id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    entry_type: "canonical_updated",
    artifact_id: created.artifact_id,
    revision_id: created.revision_id,
    details: {
      reason: "seed_import",
      seed_label: "seed_rev_001",
      hash_meta: getHashMeta(),
    },
  });
  return created;
}

async function main(): Promise<void> {
  const config: StoreConfig = {
    dataDir: join(process.cwd(), "data"),
  };

  const architecture = createPetArchitectureSeed();
  const interfaceSpec = createPetInterfaceSpecSeed();

  validateSeed("architecture_draft", architecture);
  validateSeed("interface_spec", interfaceSpec);

  const crossIssues = crossLintArtifacts([architecture, interfaceSpec]);
  if (crossIssues.length > 0) {
    throw new Error(
      `Seed cross-artifact lint failed:\n${crossIssues
        .map((issue) => `- ${issue.issue_type} on ${issue.target_block_id}: ${issue.message}`)
        .join("\n")}`
    );
  }

  const createdArchitecture = await ensureSeed(config, architecture);
  const createdInterface = await ensureSeed(config, interfaceSpec);

  await writeProjection(config, createdArchitecture);
  await writeProjection(config, createdInterface);

  const integrity = await integrityCheck(config);
  if (integrity.summary.corruptions > 0 || integrity.summary.warnings > 0) {
    throw new Error(
      `Integrity check did not pass cleanly: ${JSON.stringify(integrity.summary, null, 2)}`
    );
  }

  const summary = [
    {
      artifact_id: createdArchitecture.artifact_id,
      revision_id: createdArchitecture.revision_id,
      canonical: join(config.dataDir, "canonical", `${createdArchitecture.artifact_id}.json`),
    },
    {
      artifact_id: createdInterface.artifact_id,
      revision_id: createdInterface.revision_id,
      canonical: join(config.dataDir, "canonical", `${createdInterface.artifact_id}.json`),
    },
  ];

  console.log(JSON.stringify({ imported: summary, integrity: integrity.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

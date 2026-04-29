import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  generateAgentBugReportTemplate,
  generateAgentQuickstartMd,
  generateAgentsMd,
  generateGithubWorkflow,
  generateHumanQuickstartMd,
  generatePantheonAgentJson,
  generatePantheonAlphaJson,
  generateRepairProtocolMd,
  generateTroubleshootingMd,
  generateLocalGovernanceLogMd,
  generateHumanReviewQueueMd,
} from "./alphaTemplates.js";
import type { PantheonAlphaConfig } from "./types.js";

export function ensureAlphaScaffolding(
  repoRoot: string,
  options: {
    force?: boolean;
    noGithub?: boolean;
    actionRef?: string;
    artifactMode?: "public" | "private" | "debug";
  } = {},
): void {
  const root = resolve(repoRoot);

  const writeSafe = (relativePath: string, content: string) => {
    const fullPath = join(root, relativePath);
    if (!existsSync(fullPath) || options.force) {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
      console.log(`[Pantheon Alpha] Created ${relativePath}`);
    } else {
      console.log(`[Pantheon Alpha] Skipped existing ${relativePath}`);
    }
  };

  writeSafe("AGENTS.md", generateAgentsMd());

  writeSafe("pantheon.agent.json", JSON.stringify(generatePantheonAgentJson(), null, 2));

  const alphaConfigOverrides: Partial<PantheonAlphaConfig> = {};
  if (options.artifactMode) {
    alphaConfigOverrides.artifact_mode = options.artifactMode;
  }
  if (options.noGithub) {
    alphaConfigOverrides.github = {
      enabled: false,
      workflow_path: ".github/workflows/pantheon-repair.yml",
      post_comment: false,
      upload_artifact: false,
    };
  }
  writeSafe("pantheon.alpha.json", JSON.stringify(generatePantheonAlphaJson(alphaConfigOverrides), null, 2));

  writeSafe(".pantheon/repair/inbox/agent_bug_report.template.json", generateAgentBugReportTemplate());
  writeSafe(".pantheon/governance/.gitkeep", "");
  writeSafe(".pantheon/reviews/review_requests/.gitkeep", "");
  writeSafe(".pantheon/metrics/daily/.gitkeep", "");

  writeSafe("docs/pantheon/agent-quickstart.md", generateAgentQuickstartMd());
  writeSafe("docs/pantheon/human-quickstart.md", generateHumanQuickstartMd());
  writeSafe("docs/pantheon/repair-protocol.md", generateRepairProtocolMd());
  writeSafe("docs/pantheon/troubleshooting.md", generateTroubleshootingMd());
  writeSafe("docs/pantheon/local-governance-log.md", generateLocalGovernanceLogMd());
  writeSafe("docs/pantheon/human-review-queue.md", generateHumanReviewQueueMd());

  if (!options.noGithub) {
    const actionRef = options.actionRef || "minor-snow/test/pantheon/action@v0.1.0";
    writeSafe(".github/workflows/pantheon-repair.yml", generateGithubWorkflow(actionRef));
  }

  ensureGitignore(root);
}

function ensureGitignore(repoRoot: string): void {
  const gitignorePath = join(repoRoot, ".gitignore");
  const entriesToIgnore = [
    ".pantheon/repair/runs/",
    ".pantheon/repair/outbox/",
    "pantheon-repair-report/",
  ];

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, entriesToIgnore.join("\n") + "\n");
    console.log(`[Pantheon Alpha] Created .gitignore`);
    return;
  }

  const content = readFileSync(gitignorePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const newLines = [];

  for (const entry of entriesToIgnore) {
    if (!lines.some((line) => line.trim() === entry || line.trim() === entry.replace(/\/$/, ""))) {
      newLines.push(entry);
    }
  }

  if (newLines.length > 0) {
    const suffix = content.endsWith("\n") || content === "" ? "" : "\n";
    writeFileSync(gitignorePath, content + suffix + newLines.join("\n") + "\n");
    console.log(`[Pantheon Alpha] Appended entries to .gitignore`);
  }
}

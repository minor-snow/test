import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { generateAgentBugReportTemplate, generateAgentQuickstartMd, generateAgentsMd, generateGithubWorkflow, generateHumanQuickstartMd, generatePantheonAgentJson, generatePantheonAlphaJson, generateRepairProtocolMd, generateTroubleshootingMd, generateLocalGovernanceLogMd, generateHumanReviewQueueMd, } from "./alphaTemplates.js";
import { writeBootstrapContract } from "./bootstrapContractWriter.js";
export function ensureAlphaScaffolding(repoRoot, options = {}) {
    const root = resolve(repoRoot);
    const generatedFiles = [];
    const writeSafe = (relativePath, content) => {
        const fullPath = join(root, relativePath);
        if (!existsSync(fullPath) || options.force) {
            mkdirSync(dirname(fullPath), { recursive: true });
            writeFileSync(fullPath, content);
            console.log(`[Pantheon Alpha] Created ${relativePath}`);
            generatedFiles.push({ path: relativePath, content });
        }
        else {
            console.log(`[Pantheon Alpha] Skipped existing ${relativePath}`);
            generatedFiles.push({ path: relativePath, content: readFileSync(fullPath, "utf-8") });
        }
    };
    writeSafe("AGENTS.md", generateAgentsMd());
    writeSafe("pantheon.agent.json", JSON.stringify(generatePantheonAgentJson(), null, 2));
    const alphaConfigOverrides = {};
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
    const gitignoreContent = ensureGitignore(root);
    if (gitignoreContent) {
        generatedFiles.push({ path: ".gitignore", content: gitignoreContent });
    }
    writeBootstrapContract({
        repoRoot,
        policyVersion: "0.1.0",
        generatedFiles,
    });
}
function ensureGitignore(repoRoot) {
    const gitignorePath = join(repoRoot, ".gitignore");
    const entriesToIgnore = [
        ".pantheon/repair/runs/",
        ".pantheon/repair/outbox/",
        "pantheon-repair-report/",
    ];
    if (!existsSync(gitignorePath)) {
        const content = entriesToIgnore.join("\n") + "\n";
        writeFileSync(gitignorePath, content);
        console.log(`[Pantheon Alpha] Created .gitignore`);
        return content;
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
        const newContent = content + suffix + newLines.join("\n") + "\n";
        writeFileSync(gitignorePath, newContent);
        console.log(`[Pantheon Alpha] Appended entries to .gitignore`);
        return newContent;
    }
    return content;
}
//# sourceMappingURL=alphaFileWriter.js.map
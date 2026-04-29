import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pantheonAgentConfigSchema, pantheonAlphaConfigSchema } from "./types.js";

export interface AlphaDoctorInput {
  repoRoot: string;
}

export function cmdAlphaDoctor(input: AlphaDoctorInput): void {
  console.log(`Pantheon Alpha Doctor\n`);
  
  const root = resolve(input.repoRoot);
  let allPassed = true;

  const checkFile = (relativePath: string, checkContent?: (content: string) => boolean | string): void => {
    const fullPath = join(root, relativePath);
    if (!existsSync(fullPath)) {
      console.log(`[FAIL] ${relativePath}: not found`);
      allPassed = false;
      return;
    }
    
    if (checkContent) {
      try {
        const content = readFileSync(fullPath, "utf-8");
        const result = checkContent(content);
        if (typeof result === "string") {
          console.log(`[FAIL] ${relativePath}: ${result}`);
          allPassed = false;
        } else if (result) {
          console.log(`[PASS] ${relativePath}: found and valid`);
        } else {
          console.log(`[FAIL] ${relativePath}: invalid content`);
          allPassed = false;
        }
      } catch (e) {
        console.log(`[FAIL] ${relativePath}: error reading file - ${e instanceof Error ? e.message : String(e)}`);
        allPassed = false;
      }
    } else {
      console.log(`[PASS] ${relativePath}: found`);
    }
  };

  checkFile("AGENTS.md");
  
  checkFile("pantheon.agent.json", (content) => {
    try {
      const parsed = JSON.parse(content);
      pantheonAgentConfigSchema.parse(parsed);
      return true;
    } catch (e) {
      return `Schema validation failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  let githubEnabled = true;

  checkFile("pantheon.alpha.json", (content) => {
    try {
      const parsed = JSON.parse(content);
      const config = pantheonAlphaConfigSchema.parse(parsed);
      githubEnabled = config.github.enabled;
      return true;
    } catch (e) {
      return `Schema validation failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  checkFile(".pantheon/repair/inbox/agent_bug_report.template.json");
  checkFile("docs/pantheon/agent-quickstart.md");
  checkFile("docs/pantheon/human-quickstart.md");
  checkFile("docs/pantheon/local-governance-log.md");
  checkFile("docs/pantheon/human-review-queue.md");
  
  if (githubEnabled) {
    checkFile(".github/workflows/pantheon-repair.yml");
  }

  const repairInboxDir = join(root, ".pantheon/repair/inbox");
  if (existsSync(repairInboxDir)) {
    console.log(`[PASS] repair inbox: found`);
  } else {
    console.log(`[FAIL] repair inbox: not found`);
    allPassed = false;
  }

  const governanceDir = join(root, ".pantheon/governance");
  if (existsSync(governanceDir)) {
    console.log(`[PASS] governance log dir: found`);
  } else {
    console.log(`[FAIL] governance log dir: not found`);
    allPassed = false;
  }

  const reviewDir = join(root, ".pantheon/reviews/review_requests");
  if (existsSync(reviewDir)) {
    console.log(`[PASS] review queue dir: found`);
  } else {
    console.log(`[FAIL] review queue dir: not found`);
    allPassed = false;
  }

  const metricsDir = join(root, ".pantheon/metrics/daily");
  if (existsSync(metricsDir)) {
    console.log(`[PASS] metrics dir: found`);
  } else {
    console.log(`[FAIL] metrics dir: not found`);
    allPassed = false;
  }

  console.log("");
  if (allPassed) {
    console.log(`Agent-usable repo: yes`);
  } else {
    console.log(`Agent-usable repo: no`);
    console.log(`\nRun:\n  npx pantheon-alpha init`);
    process.exitCode = 1;
  }
}

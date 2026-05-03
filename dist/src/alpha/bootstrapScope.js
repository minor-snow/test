import { matchesGlob } from "../globMatch.js";
export function getBootstrapInitFilePatterns() {
    return [
        "AGENTS.md",
        "pantheon.json",
        "pantheon.alpha.json",
        "pantheon.agent.json",
        ".github/workflows/pantheon-repair.yml",
        ".github/workflows/pantheon-repair.yaml",
        "docs/pantheon/**",
        ".gitignore",
    ];
}
export function getBootstrapArtifactPatterns() {
    return [
        ".pantheon/bootstrap/**",
    ];
}
export function classifyBootstrapDiffFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const initPatterns = getBootstrapInitFilePatterns();
    if (initPatterns.some((pattern) => matchesGlob(normalizedPath, pattern))) {
        return "bootstrap_init";
    }
    const artifactPatterns = getBootstrapArtifactPatterns();
    if (artifactPatterns.some((pattern) => matchesGlob(normalizedPath, pattern))) {
        return "bootstrap_artifact";
    }
    // Not bootstrap, treat as business
    return "business";
}
export function isMixedBootstrapAndRepair(changedFiles) {
    let hasBootstrap = false;
    let hasBusiness = false;
    for (const file of changedFiles) {
        const fileClass = classifyBootstrapDiffFile(file);
        if (fileClass === "bootstrap_init" || fileClass === "bootstrap_artifact") {
            hasBootstrap = true;
        }
        else if (fileClass === "business") {
            hasBusiness = true;
        }
        if (hasBootstrap && hasBusiness) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=bootstrapScope.js.map
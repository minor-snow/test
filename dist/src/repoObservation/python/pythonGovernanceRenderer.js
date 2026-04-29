/**
 * P25b: Python Governance Renderer
 *
 * Product-quality Markdown renderers that project Python observation sidecar
 * data into actionable governance artifacts.
 *
 * Three outputs:
 *   1. Standalone Python governance report (python_report.md)
 *   2. Python-enhanced task.md sections (sensitive warnings + test mappings)
 *   3. Python-enhanced scope.md sections (risk heatmap + test coverage)
 *
 * NO internal terminology. NO Pantheon internals.
 */
// ---------------------------------------------------------------------------
// 1. Standalone Python Governance Report
// ---------------------------------------------------------------------------
export function renderPythonGovernanceReport(input) {
    const lines = [];
    const { sidecar, scopeFiles } = input;
    const scopeSet = new Set(scopeFiles);
    lines.push("# Python Governance Report");
    lines.push("");
    lines.push(`**Repo:** ${input.repoLabel}`);
    lines.push(`**Intent:** ${input.intent}`);
    lines.push(`**Python files observed:** ${sidecar.quality.python_file_count}`);
    lines.push(`**Authorized scope:** ${scopeFiles.length} files`);
    lines.push("");
    // Risk summary
    const scopeSensitive = computeScopeSensitivity(sidecar.sensitive_zones, scopeSet);
    const scopeTests = computeScopeTestCoverage(sidecar.test_mappings, scopeSet);
    lines.push("## Risk Summary");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|---|---|");
    lines.push(`| Sensitive zones in scope | ${scopeSensitive.zonesInScope} |`);
    lines.push(`| Sensitive files in scope | ${scopeSensitive.filesInScope} |`);
    lines.push(`| Highest severity in scope | ${scopeSensitive.maxSeverity ?? "none"} |`);
    lines.push(`| Source files with test mapping | ${scopeTests.mappedCount} / ${scopeTests.sourceCount} |`);
    lines.push(`| High-confidence test mappings | ${scopeTests.highCount} |`);
    lines.push(`| Medium-confidence test mappings | ${scopeTests.mediumCount} |`);
    lines.push("");
    // Sensitive zones in scope
    if (scopeSensitive.zones.length > 0) {
        lines.push("## Sensitive Zones in Scope");
        lines.push("");
        lines.push("These areas of the authorized scope are flagged as high-risk:");
        lines.push("");
        for (const z of scopeSensitive.zones) {
            const icon = severityIcon(z.zone.severity);
            lines.push(`### ${icon} ${z.zone.category} (${z.zone.severity})`);
            lines.push("");
            lines.push(`- **Files in scope:** ${z.filesInScope.length}`);
            lines.push(`- **Source:** ${z.zone.source === "config_override" ? "custom override" : "keyword detection"}`);
            lines.push("");
            if (z.filesInScope.length <= 10) {
                for (const f of z.filesInScope)
                    lines.push(`  - \`${f}\``);
            }
            else {
                const groups = groupByDir(z.filesInScope);
                for (const g of groups)
                    lines.push(`  - \`${g.dir}/**\` (${g.count} files)`);
            }
            lines.push("");
        }
    }
    // Test coverage for scope
    lines.push("## Test Coverage");
    lines.push("");
    if (scopeTests.mappings.length > 0) {
        lines.push("Source files in your scope and their test mappings:");
        lines.push("");
        lines.push("| Source File | Test File | Confidence |");
        lines.push("|---|---|---|");
        const display = scopeTests.mappings.slice(0, 50);
        for (const m of display) {
            const testFiles = m.existing_test_paths.length > 0
                ? m.existing_test_paths.map(t => `\`${t}\``).join(", ")
                : "_no test found_";
            lines.push(`| \`${m.source_path}\` | ${testFiles} | ${m.confidence} |`);
        }
        if (scopeTests.mappings.length > 50) {
            lines.push(`| ... | _${scopeTests.mappings.length - 50} more_ | |`);
        }
        lines.push("");
    }
    else {
        lines.push("No source files in scope have test mappings.");
        lines.push("");
    }
    // Dependency signals
    if (sidecar.dependency_manifests.length > 0) {
        lines.push("## Dependencies");
        lines.push("");
        for (const m of sidecar.dependency_manifests) {
            lines.push(`### \`${m.source_path}\` (${m.confidence} confidence)`);
            lines.push("");
            if (m.packages.length > 0) {
                lines.push(`**Packages:** ${m.packages.slice(0, 20).map(p => `\`${p}\``).join(", ")}${m.packages.length > 20 ? ` +${m.packages.length - 20} more` : ""}`);
            }
            if (m.dev_packages.length > 0) {
                lines.push(`**Dev packages:** ${m.dev_packages.slice(0, 10).map(p => `\`${p}\``).join(", ")}${m.dev_packages.length > 10 ? ` +${m.dev_packages.length - 10} more` : ""}`);
            }
            if (m.warnings.length > 0) {
                for (const w of m.warnings)
                    lines.push(`> ⚠️ ${w}`);
            }
            lines.push("");
        }
    }
    // Import signals for scope
    const scopeImports = sidecar.import_observations.filter(i => scopeSet.has(i.from_file));
    if (scopeImports.length > 0) {
        const projectImports = scopeImports.filter(i => i.status === "project_import");
        const crossModuleDeps = new Map();
        for (const imp of projectImports) {
            const parts = imp.raw_specifier.replace(/^from\s+/, "").split(/\s+import/)[0].split(".");
            const module = parts.length >= 2 ? parts.slice(0, 2).join(".") : parts[0];
            crossModuleDeps.set(module, (crossModuleDeps.get(module) ?? 0) + 1);
        }
        if (crossModuleDeps.size > 0) {
            lines.push("## Cross-Module Dependencies");
            lines.push("");
            lines.push("Files in your scope import from these project modules:");
            lines.push("");
            lines.push("| Module | Import Count |");
            lines.push("|---|---|");
            for (const [mod, count] of [...crossModuleDeps.entries()].sort((a, b) => b[1] - a[1])) {
                lines.push(`| \`${mod}\` | ${count} |`);
            }
            lines.push("");
            lines.push("> Changes in scope may affect or be affected by these modules.");
            lines.push("");
        }
    }
    // Unknowns
    const actionableUnknowns = sidecar.unknowns.filter(u => u.classification === "actionable" && u.count > 0);
    if (actionableUnknowns.length > 0) {
        lines.push("## Actionable Unknowns");
        lines.push("");
        lines.push("These observations could not be fully resolved:");
        lines.push("");
        for (const u of actionableUnknowns) {
            lines.push(`- **${formatUnknownCategory(u.category)}** (${u.count}): ${u.note}`);
        }
        lines.push("");
    }
    // Limitations
    lines.push("## Observation Limitations");
    lines.push("");
    for (const l of sidecar.limitations) {
        lines.push(`- ${l}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("_Auto-generated by Pantheon. Do not edit._");
    return lines.join("\n");
}
export function computePythonTaskEnhancement(input) {
    const scopeSet = new Set(input.scopeFiles);
    // Sensitive warnings
    const sensitiveWarnings = [];
    const scopeSensitive = computeScopeSensitivity(input.sidecar.sensitive_zones, scopeSet);
    for (const z of scopeSensitive.zones) {
        const icon = severityIcon(z.zone.severity);
        sensitiveWarnings.push(`${icon} **${z.zone.category}** (${z.zone.severity}): ${z.filesInScope.length} files in your scope are in a sensitive zone. Extra care required.`);
    }
    // Test suggestions
    const testSuggestions = [];
    const scopeTests = computeScopeTestCoverage(input.sidecar.test_mappings, scopeSet);
    for (const m of scopeTests.mappings) {
        if (m.existing_test_paths.length > 0 && m.confidence !== "low") {
            for (const t of m.existing_test_paths) {
                testSuggestions.push(t);
            }
        }
    }
    return {
        sensitiveWarnings,
        testSuggestions: [...new Set(testSuggestions)].sort(),
    };
}
/**
 * Render the Python sensitive warnings section for task.md.
 */
export function renderPythonTaskSensitiveWarnings(enhancement) {
    const lines = [];
    if (enhancement.sensitiveWarnings.length > 0) {
        lines.push("## ⚠️ Sensitive zones in your scope");
        lines.push("");
        lines.push("Some files in your authorized scope are in high-risk areas:");
        lines.push("");
        for (const w of enhancement.sensitiveWarnings) {
            lines.push(`- ${w}`);
        }
        lines.push("");
        lines.push("**Extra care required.** Changes to sensitive zones may need manual review.");
        lines.push("");
    }
    return lines.join("\n");
}
/**
 * Render the Python test suggestions section for task.md.
 */
export function renderPythonTaskTestSuggestions(enhancement) {
    const lines = [];
    if (enhancement.testSuggestions.length > 0) {
        lines.push("## Suggested tests to verify");
        lines.push("");
        lines.push("Based on the files in your scope, these tests are likely relevant:");
        lines.push("");
        if (enhancement.testSuggestions.length > 20) {
            const groups = groupByDir(enhancement.testSuggestions);
            for (const g of groups)
                lines.push(`- \`${g.dir}/**\` (${g.count} test files)`);
        }
        else {
            for (const t of enhancement.testSuggestions)
                lines.push(`- \`${t}\``);
        }
        lines.push("");
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// 3. Scope.md Python Enhancement (risk + test coverage)
// ---------------------------------------------------------------------------
export function renderPythonScopeSections(input) {
    const lines = [];
    const scopeSet = new Set(input.scopeFiles);
    const scopeSensitive = computeScopeSensitivity(input.sidecar.sensitive_zones, scopeSet);
    const scopeTests = computeScopeTestCoverage(input.sidecar.test_mappings, scopeSet);
    if (scopeSensitive.zones.length > 0 || scopeTests.mappings.length > 0) {
        lines.push("## Python Governance Signals");
        lines.push("");
    }
    if (scopeSensitive.zones.length > 0) {
        lines.push("### Sensitive zones in scope");
        lines.push("");
        lines.push("| Zone | Severity | Files in Scope |");
        lines.push("|---|---|---|");
        for (const z of scopeSensitive.zones) {
            lines.push(`| ${z.zone.category} | ${z.zone.severity} | ${z.filesInScope.length} |`);
        }
        lines.push("");
    }
    if (scopeTests.mappings.length > 0) {
        lines.push("### Test coverage");
        lines.push("");
        lines.push(`- Source files with tests: **${scopeTests.mappedCount}** / ${scopeTests.sourceCount}`);
        lines.push(`- High confidence: **${scopeTests.highCount}** | Medium: **${scopeTests.mediumCount}**`);
        lines.push("");
    }
    return lines.join("\n");
}
function computeScopeSensitivity(zones, scopeSet) {
    const result = {
        zonesInScope: 0,
        filesInScope: 0,
        maxSeverity: null,
        zones: [],
    };
    const allSensitiveInScope = new Set();
    const severityOrder = { medium: 0, high: 1, critical: 2 };
    for (const zone of zones) {
        const filesInScope = zone.matched_paths.filter(p => scopeSet.has(p));
        if (filesInScope.length > 0) {
            result.zonesInScope++;
            for (const f of filesInScope)
                allSensitiveInScope.add(f);
            result.zones.push({ zone, filesInScope });
            if (result.maxSeverity === null ||
                (severityOrder[zone.severity] ?? 0) > (severityOrder[result.maxSeverity] ?? 0)) {
                result.maxSeverity = zone.severity;
            }
        }
    }
    result.filesInScope = allSensitiveInScope.size;
    // Sort by severity descending
    result.zones.sort((a, b) => (severityOrder[b.zone.severity] ?? 0) - (severityOrder[a.zone.severity] ?? 0));
    return result;
}
function computeScopeTestCoverage(testMappings, scopeSet) {
    const inScope = testMappings.filter(m => scopeSet.has(m.source_path));
    const mapped = inScope.filter(m => m.existing_test_paths.length > 0);
    return {
        sourceCount: inScope.length,
        mappedCount: mapped.length,
        highCount: inScope.filter(m => m.confidence === "high").length,
        mediumCount: inScope.filter(m => m.confidence === "medium").length,
        mappings: [...inScope].sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2, unknown: 3 };
            return (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3);
        }),
    };
}
function severityIcon(severity) {
    switch (severity) {
        case "critical": return "🔴";
        case "high": return "🟠";
        case "medium": return "🟡";
        default: return "⚪";
    }
}
function formatUnknownCategory(category) {
    return category.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
}
function groupByDir(files) {
    const groups = new Map();
    for (const f of files) {
        const parts = f.split("/");
        const dir = parts.length <= 2 ? parts[0] : parts.slice(0, 2).join("/");
        groups.set(dir, (groups.get(dir) ?? 0) + 1);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dir, count]) => ({ dir, count }));
}
//# sourceMappingURL=pythonGovernanceRenderer.js.map
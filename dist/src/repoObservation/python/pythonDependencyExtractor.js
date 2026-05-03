/**
 * P25a: Python Dependency Extractor
 *
 * Conservative extraction from pyproject.toml, requirements*.txt, setup.cfg.
 * NO TOML parser dependency — uses regex-based text extraction.
 *
 * Returns package names (normalized) and confidence levels.
 * Unsupported structures get confidence: "low" + warning.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function extractPythonDependencies(input) {
    const sourceType = detectManifestType(input.filePath);
    switch (sourceType) {
        case "pyproject.toml":
            return extractFromPyproject(input.filePath, input.content);
        case "requirements.txt":
        case "requirements-dev.txt":
            return extractFromRequirements(input.filePath, input.content, sourceType);
        case "setup.cfg":
            return extractFromSetupCfg(input.filePath, input.content);
        case "Pipfile":
            return extractFromPipfile(input.filePath, input.content);
        case "setup.py":
            return extractFromSetupPy(input.filePath, input.content);
        case "uv.lock":
            return extractFromUvLock(input.filePath, input.content);
        case "poetry.lock":
            return extractFromPoetryLock(input.filePath, input.content);
        case "pdm.lock":
            return extractFromPdmLock(input.filePath, input.content);
        case "environment.yml":
            return extractFromEnvironmentYml(input.filePath, input.content);
        case "tox.ini":
            return extractFromToxIni(input.filePath, input.content);
        case "noxfile.py":
            return extractFromNoxfile(input.filePath, input.content);
    }
}
/**
 * Normalize a package name for comparison.
 * PyPI treats - and _ and . as equivalent; lowercase everything.
 */
export function normalizePackageName(name) {
    return name.toLowerCase().replace(/[-_.]+/g, "_").replace(/\[.*\]$/, "");
}
/**
 * Build a lookup set of declared package names from manifests.
 */
export function buildDeclaredPackageSet(manifests) {
    const result = new Set();
    for (const m of manifests) {
        for (const pkg of m.packages)
            result.add(normalizePackageName(pkg));
        for (const pkg of m.dev_packages)
            result.add(normalizePackageName(pkg));
    }
    return result;
}
// ---------------------------------------------------------------------------
// Manifest type detection
// ---------------------------------------------------------------------------
function detectManifestType(filePath) {
    const basename = filePath.split("/").pop()?.toLowerCase() ?? "";
    if (basename === "pyproject.toml")
        return "pyproject.toml";
    if (basename === "setup.cfg")
        return "setup.cfg";
    if (basename === "setup.py")
        return "setup.py";
    if (basename === "pipfile")
        return "Pipfile";
    if (basename === "uv.lock")
        return "uv.lock";
    if (basename === "poetry.lock")
        return "poetry.lock";
    if (basename === "pdm.lock")
        return "pdm.lock";
    if (basename === "environment.yml" || basename === "environment.yaml")
        return "environment.yml";
    if (basename === "tox.ini")
        return "tox.ini";
    if (basename === "noxfile.py")
        return "noxfile.py";
    if (basename.startsWith("requirements") && basename.includes("dev"))
        return "requirements-dev.txt";
    if (basename.startsWith("requirements") && basename.endsWith(".txt"))
        return "requirements.txt";
    return "requirements.txt"; // fallback
}
// ---------------------------------------------------------------------------
// pyproject.toml (regex-based, no TOML parser)
// ---------------------------------------------------------------------------
function extractFromPyproject(filePath, content) {
    const warnings = [];
    const packages = [];
    const devPackages = [];
    let confidence = "high";
    // [project] dependencies = [...]
    const projectDeps = extractTomlArray(content, /^\[project\]\s*$/m, /^dependencies\s*=\s*\[/m);
    if (projectDeps !== null) {
        packages.push(...projectDeps);
    }
    // [project.optional-dependencies] dev = [...]
    const optionalSections = extractTomlOptionalDeps(content);
    for (const [group, deps] of Object.entries(optionalSections)) {
        if (/dev|test|ci|lint/i.test(group)) {
            devPackages.push(...deps);
        }
        else {
            packages.push(...deps);
        }
    }
    // [tool.poetry.dependencies]
    const poetryDeps = extractTomlKeyValueSection(content, /^\[tool\.poetry\.dependencies\]\s*$/m);
    if (poetryDeps) {
        // Skip python itself
        for (const [name] of poetryDeps) {
            if (name !== "python")
                packages.push(name);
        }
    }
    // [tool.poetry.dev-dependencies] or [tool.poetry.group.dev.dependencies]
    const poetryDevDeps = extractTomlKeyValueSection(content, /^\[tool\.poetry\.(?:dev-dependencies|group\.dev\.dependencies)\]\s*$/m);
    if (poetryDevDeps) {
        for (const [name] of poetryDevDeps) {
            devPackages.push(name);
        }
    }
    if (packages.length === 0 && devPackages.length === 0) {
        warnings.push("No dependencies found in pyproject.toml — may use unsupported format");
        confidence = "low";
    }
    return {
        source_path: filePath,
        source_type: "pyproject.toml",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: dedup(devPackages.map(normalizePackageName)),
        confidence,
        warnings,
    };
}
/**
 * Extract array value from TOML content.
 * Handles multi-line arrays like:
 *   dependencies = [
 *     "Django>=4.2",
 *     "graphene-django",
 *   ]
 */
function extractTomlArray(content, sectionRe, keyRe) {
    const sectionMatch = sectionRe.exec(content);
    if (!sectionMatch)
        return null;
    const afterSection = content.slice(sectionMatch.index);
    const keyMatch = keyRe.exec(afterSection);
    if (!keyMatch)
        return null;
    const afterKey = afterSection.slice(keyMatch.index + keyMatch[0].length);
    // Find the closing bracket, handling multi-line
    let depth = 1;
    let i = 0;
    let arrayContent = "";
    for (; i < afterKey.length && depth > 0; i++) {
        if (afterKey[i] === "[")
            depth++;
        if (afterKey[i] === "]")
            depth--;
        if (depth > 0)
            arrayContent += afterKey[i];
    }
    return parsePackageList(arrayContent);
}
function extractTomlOptionalDeps(content) {
    const result = {};
    const sectionRe = /^\[project\.optional-dependencies\]\s*$/m;
    const match = sectionRe.exec(content);
    if (!match)
        return result;
    const afterSection = content.slice(match.index + match[0].length);
    // Parse key = [...] entries until next section
    const lines = afterSection.split("\n");
    let currentKey = null;
    let arrayContent = "";
    let depth = 0;
    for (const line of lines) {
        if (/^\[/.test(line.trim()) && depth === 0)
            break; // next section
        if (depth === 0) {
            const keyMatch = /^(\w+)\s*=\s*\[(.*)$/m.exec(line);
            if (keyMatch) {
                currentKey = keyMatch[1];
                arrayContent = keyMatch[2];
                depth = 1;
                // Check if closes on same line
                if (arrayContent.includes("]")) {
                    result[currentKey] = parsePackageList(arrayContent.split("]")[0]);
                    depth = 0;
                    currentKey = null;
                }
            }
        }
        else {
            if (line.includes("]")) {
                arrayContent += line.split("]")[0];
                if (currentKey)
                    result[currentKey] = parsePackageList(arrayContent);
                depth = 0;
                currentKey = null;
            }
            else {
                arrayContent += line;
            }
        }
    }
    return result;
}
function extractTomlKeyValueSection(content, sectionRe) {
    const match = sectionRe.exec(content);
    if (!match)
        return null;
    const afterSection = content.slice(match.index + match[0].length);
    const pairs = [];
    const lines = afterSection.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("["))
            break; // next section
        if (trimmed.startsWith("#") || trimmed.length === 0)
            continue;
        const kvMatch = /^([\w-]+)\s*=\s*(.+)$/.exec(trimmed);
        if (kvMatch) {
            pairs.push([kvMatch[1], kvMatch[2].replace(/["'{}^~>=<*]/g, "").trim()]);
        }
    }
    return pairs.length > 0 ? pairs : null;
}
function parsePackageList(raw) {
    const results = [];
    // Match quoted strings
    const re = /["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        // Strip version specifiers: "Django>=4.2" → "Django"
        const name = m[1].replace(/[><=~!;].*/g, "").replace(/\[.*\]/, "").trim();
        if (name.length > 0)
            results.push(name);
    }
    return results;
}
// ---------------------------------------------------------------------------
// requirements.txt
// ---------------------------------------------------------------------------
function extractFromRequirements(filePath, content, sourceType) {
    const packages = [];
    const isDev = sourceType === "requirements-dev.txt";
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || trimmed.length === 0)
            continue;
        if (trimmed.startsWith("-r ") || trimmed.startsWith("-c ") || trimmed.startsWith("--"))
            continue;
        if (trimmed.startsWith("-e ") || trimmed.startsWith("git+"))
            continue;
        // Strip version, extras, environment markers
        const name = trimmed
            .replace(/[><=~!=;].*/g, "")
            .replace(/\[.*\]/, "")
            .trim();
        if (name.length > 0 && /^[\w-]+$/.test(name)) {
            packages.push(name);
        }
    }
    return {
        source_path: filePath,
        source_type: sourceType,
        packages: isDev ? [] : dedup(packages.map(normalizePackageName)),
        dev_packages: isDev ? dedup(packages.map(normalizePackageName)) : [],
        confidence: "high",
        warnings: [],
    };
}
// ---------------------------------------------------------------------------
// setup.cfg
// ---------------------------------------------------------------------------
function extractFromSetupCfg(filePath, content) {
    const packages = [];
    const warnings = [];
    // [options] install_requires = ...
    const sectionMatch = /^\[options\]\s*$/m.exec(content);
    if (sectionMatch) {
        const afterSection = content.slice(sectionMatch.index + sectionMatch[0].length);
        const irMatch = /^install_requires\s*=\s*(.*)$/m.exec(afterSection);
        if (irMatch) {
            // Content on same line (if any)
            const sameLine = irMatch[1].trim();
            if (sameLine.length > 0 && !sameLine.startsWith("#")) {
                const name = sameLine.replace(/[><=~!=;].*/g, "").replace(/\[.*\]/, "").trim();
                if (name.length > 0 && /^[\w-]+$/.test(name))
                    packages.push(name);
            }
            // Continuation lines (indented with spaces/tabs)
            const afterKey = afterSection.slice(irMatch.index + irMatch[0].length);
            const lines = afterKey.split("\n");
            for (const line of lines) {
                // Continuation lines must be indented
                if (line.length > 0 && line[0] !== " " && line[0] !== "\t")
                    break;
                const trimmed = line.trim();
                if (trimmed.startsWith("["))
                    break;
                if (trimmed.startsWith("#") || trimmed.length === 0)
                    continue;
                const name = trimmed.replace(/[><=~!=;].*/g, "").replace(/\[.*\]/, "").trim();
                if (name.length > 0 && /^[\w-]+$/.test(name))
                    packages.push(name);
            }
        }
    }
    if (packages.length === 0) {
        warnings.push("No install_requires found in setup.cfg");
    }
    return {
        source_path: filePath,
        source_type: "setup.cfg",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: [],
        confidence: packages.length > 0 ? "medium" : "low",
        warnings,
    };
}
// ---------------------------------------------------------------------------
// setup.py (weak detection only)
// ---------------------------------------------------------------------------
function extractFromSetupPy(filePath, content) {
    const packages = [];
    const warnings = [];
    // Very conservative: look for install_requires=[...]
    const match = /install_requires\s*=\s*\[([\s\S]*?)\]/m.exec(content);
    if (match) {
        packages.push(...parsePackageList(match[1]));
    }
    else {
        warnings.push("Could not extract install_requires from setup.py — weak detection");
    }
    return {
        source_path: filePath,
        source_type: "setup.py",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: [],
        confidence: packages.length > 0 ? "medium" : "low",
        warnings: warnings.length > 0 ? warnings : ["setup.py parsing is weak detection — consider using pyproject.toml"],
    };
}
// ---------------------------------------------------------------------------
// Pipfile (basic)
// ---------------------------------------------------------------------------
function extractFromPipfile(filePath, content) {
    const packages = [];
    const devPackages = [];
    let section = null;
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed === "[packages]") {
            section = "packages";
            continue;
        }
        if (trimmed === "[dev-packages]") {
            section = "dev-packages";
            continue;
        }
        if (trimmed.startsWith("[")) {
            section = null;
            continue;
        }
        if (section && trimmed.length > 0 && !trimmed.startsWith("#")) {
            const name = trimmed.split("=")[0].trim().replace(/["']/g, "");
            if (name.length > 0 && /^[\w-]+$/.test(name)) {
                if (section === "packages")
                    packages.push(name);
                else
                    devPackages.push(name);
            }
        }
    }
    return {
        source_path: filePath,
        source_type: "Pipfile",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: dedup(devPackages.map(normalizePackageName)),
        confidence: "medium",
        warnings: [],
    };
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dedup(arr) {
    return [...new Set(arr)];
}
// ---------------------------------------------------------------------------
// uv.lock
// ---------------------------------------------------------------------------
/**
 * Extract packages from uv.lock.
 * uv.lock uses TOML-like format with [[package]] sections.
 * Each package has `name = "..."` and `version = "..."`.
 * The project's own package (source = { virtual = "." }) is skipped.
 */
function extractFromUvLock(filePath, content) {
    const packages = [];
    const warnings = [];
    // Split by [[package]] sections
    const sections = content.split(/^\[\[package\]\]\s*$/m);
    for (const section of sections) {
        // Skip the project's own virtual package
        if (section.includes('source = { virtual = "." }'))
            continue;
        const nameMatch = /^name\s*=\s*"([^"]+)"/m.exec(section);
        if (nameMatch) {
            packages.push(nameMatch[1]);
        }
    }
    if (packages.length === 0) {
        warnings.push("No packages found in uv.lock — may be empty or use unsupported format");
    }
    return {
        source_path: filePath,
        source_type: "uv.lock",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: [], // uv.lock does not distinguish dev in the lockfile body
        confidence: packages.length > 0 ? "high" : "low",
        warnings,
    };
}
// ---------------------------------------------------------------------------
// poetry.lock
// ---------------------------------------------------------------------------
/**
 * Extract packages from poetry.lock.
 * poetry.lock uses TOML with [[package]] sections.
 * Each has `name = "..."`, `category = "dev"` (poetry v1) or
 * belongs to optional groups (poetry v2).
 */
function extractFromPoetryLock(filePath, content) {
    const packages = [];
    const devPackages = [];
    const warnings = [];
    const sections = content.split(/^\[\[package\]\]\s*$/m);
    for (const section of sections) {
        const nameMatch = /^name\s*=\s*"([^"]+)"/m.exec(section);
        if (!nameMatch)
            continue;
        const name = nameMatch[1];
        // poetry v1: category = "dev" / "main"
        const categoryMatch = /^category\s*=\s*"([^"]+)"/m.exec(section);
        if (categoryMatch && categoryMatch[1] === "dev") {
            devPackages.push(name);
        }
        else {
            packages.push(name);
        }
    }
    if (packages.length === 0 && devPackages.length === 0) {
        warnings.push("No packages found in poetry.lock");
    }
    return {
        source_path: filePath,
        source_type: "poetry.lock",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: dedup(devPackages.map(normalizePackageName)),
        confidence: (packages.length + devPackages.length) > 0 ? "high" : "low",
        warnings,
    };
}
// ---------------------------------------------------------------------------
// pdm.lock
// ---------------------------------------------------------------------------
/**
 * Extract packages from pdm.lock.
 * pdm.lock uses TOML with [[package]] sections, similar to poetry.lock.
 */
function extractFromPdmLock(filePath, content) {
    const packages = [];
    const devPackages = [];
    const warnings = [];
    const sections = content.split(/^\[\[package\]\]\s*$/m);
    for (const section of sections) {
        const nameMatch = /^name\s*=\s*"([^"]+)"/m.exec(section);
        if (!nameMatch)
            continue;
        const name = nameMatch[1];
        // pdm uses groups = ["dev"] to indicate dev dependencies
        const groupsMatch = /^groups\s*=\s*\[([^\]]*)\]/m.exec(section);
        if (groupsMatch && /"dev"|'dev'/.test(groupsMatch[1])) {
            devPackages.push(name);
        }
        else {
            packages.push(name);
        }
    }
    if (packages.length === 0 && devPackages.length === 0) {
        warnings.push("No packages found in pdm.lock");
    }
    return {
        source_path: filePath,
        source_type: "pdm.lock",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: dedup(devPackages.map(normalizePackageName)),
        confidence: (packages.length + devPackages.length) > 0 ? "medium" : "low",
        warnings,
    };
}
// ---------------------------------------------------------------------------
// environment.yml (Conda)
// ---------------------------------------------------------------------------
/**
 * Extract packages from Conda environment.yml.
 * Looks for `dependencies:` section with `- package` or `- pip:` sub-list.
 */
function extractFromEnvironmentYml(filePath, content) {
    const packages = [];
    const warnings = [];
    const lines = content.split("\n");
    let inDeps = false;
    let inPip = false;
    for (const line of lines) {
        const trimmed = line.trim();
        // Detect top-level sections
        if (/^\w/.test(line) && !line.startsWith(" ") && !line.startsWith("\t")) {
            if (trimmed.startsWith("dependencies:")) {
                inDeps = true;
                inPip = false;
                continue;
            }
            if (inDeps && !trimmed.startsWith("-") && !trimmed.startsWith("#")) {
                inDeps = false;
                inPip = false;
                continue;
            }
        }
        if (!inDeps)
            continue;
        if (trimmed === "- pip:") {
            inPip = true;
            continue;
        }
        if (trimmed.startsWith("- ")) {
            const dep = trimmed.slice(2).trim();
            if (dep === "pip:" || dep.startsWith("#"))
                continue;
            // Strip version specifiers
            const name = dep.replace(/[>=<!=~].*/g, "").replace(/\[.*\]/g, "").trim();
            if (name.length > 0 && /^[\w-]+$/.test(name)) {
                packages.push(name);
            }
        }
    }
    if (packages.length === 0) {
        warnings.push("No dependencies found in environment.yml");
    }
    return {
        source_path: filePath,
        source_type: "environment.yml",
        packages: dedup(packages.map(normalizePackageName)),
        dev_packages: [],
        confidence: packages.length > 0 ? "medium" : "low",
        warnings,
    };
}
// ---------------------------------------------------------------------------
// tox.ini (dependency signal extraction)
// ---------------------------------------------------------------------------
/**
 * Extract dependency signals from tox.ini.
 * Looks for `deps =` lines within [testenv] or [testenv:*] sections.
 * These are test/CI dependencies, not project runtime deps.
 */
function extractFromToxIni(filePath, content) {
    const devPackages = [];
    const warnings = [];
    // Find deps = ... in testenv sections
    const depsRe = /^deps\s*=\s*(.*)$/gm;
    let match;
    while ((match = depsRe.exec(content)) !== null) {
        // Handle same-line deps
        const sameLine = match[1].trim();
        if (sameLine.length > 0 && !sameLine.startsWith("#")) {
            const name = sameLine.replace(/[>=<!=~].*/g, "").replace(/\[.*\]/g, "").trim();
            if (name.length > 0 && /^[\w-]+$/.test(name))
                devPackages.push(name);
        }
        // Handle continuation lines
        const afterKey = content.slice(match.index + match[0].length);
        const lines = afterKey.split("\n");
        for (const line of lines) {
            if (line.length > 0 && line[0] !== " " && line[0] !== "\t")
                break;
            const trimmed = line.trim();
            if (trimmed.startsWith("["))
                break;
            if (trimmed.startsWith("#") || trimmed.length === 0)
                continue;
            if (trimmed.startsWith("-r"))
                continue; // requirements file reference
            const name = trimmed.replace(/[>=<!=~].*/g, "").replace(/\[.*\]/g, "").trim();
            if (name.length > 0 && /^[\w-]+$/.test(name))
                devPackages.push(name);
        }
    }
    if (devPackages.length === 0) {
        warnings.push("No deps found in tox.ini — may use requirements file references");
    }
    return {
        source_path: filePath,
        source_type: "tox.ini",
        packages: [],
        dev_packages: dedup(devPackages.map(normalizePackageName)),
        confidence: devPackages.length > 0 ? "medium" : "low",
        warnings,
    };
}
// ---------------------------------------------------------------------------
// noxfile.py (weak signal extraction)
// ---------------------------------------------------------------------------
/**
 * Extract dependency signals from noxfile.py.
 * Very conservative: looks for session.install("...") calls.
 */
function extractFromNoxfile(filePath, content) {
    const devPackages = [];
    const warnings = [];
    // Match session.install("pkg", "pkg2", ...)
    const installRe = /session\.install\(([^)]+)\)/g;
    let match;
    while ((match = installRe.exec(content)) !== null) {
        const args = match[1];
        const pkgRe = /["']([^"']+)["']/g;
        let pkgMatch;
        while ((pkgMatch = pkgRe.exec(args)) !== null) {
            const val = pkgMatch[1];
            // Skip flags, paths, and requirements file refs
            if (val.startsWith("-") || val.startsWith(".") || val.includes("/"))
                continue;
            const name = val.replace(/[>=<!=~].*/g, "").replace(/\[.*\]/g, "").trim();
            if (name.length > 0 && /^[\w-]+$/.test(name))
                devPackages.push(name);
        }
    }
    if (devPackages.length === 0) {
        warnings.push("No session.install() calls found in noxfile.py");
    }
    return {
        source_path: filePath,
        source_type: "noxfile.py",
        packages: [],
        dev_packages: dedup(devPackages.map(normalizePackageName)),
        confidence: devPackages.length > 0 ? "low" : "low",
        warnings: warnings.length > 0 ? warnings : ["noxfile.py parsing is weak detection"],
    };
}
//# sourceMappingURL=pythonDependencyExtractor.js.map
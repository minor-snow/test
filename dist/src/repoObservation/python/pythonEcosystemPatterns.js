/**
 * P25a.1: Shared Python Ecosystem Patterns
 *
 * Single source of truth for Python file detection patterns.
 * Used by both pythonFileClassifier and pythonObservationEnhancer
 * to eliminate duplication.
 */
// ---------------------------------------------------------------------------
// Python file extensions
// ---------------------------------------------------------------------------
export const PYTHON_EXTENSIONS = new Set([".py", ".pyi", ".pyx", ".ipynb"]);
// ---------------------------------------------------------------------------
// Python ecosystem config files (not .py but part of Python projects)
// ---------------------------------------------------------------------------
export const PYTHON_ECOSYSTEM_BASENAMES = new Set([
    "pyproject.toml",
    "setup.cfg",
    "setup.py",
    "pipfile",
    "pipfile.lock",
    "poetry.lock",
    "uv.lock",
    "pdm.lock",
    "tox.ini",
    "noxfile.py",
    "pytest.ini",
    "mypy.ini",
    ".flake8",
    ".pre-commit-config.yaml",
    "environment.yml",
    "environment.yaml",
]);
export const PYTHON_ECOSYSTEM_PREFIXES = [
    "requirements",
];
/**
 * Check if a file path refers to a Python ecosystem file (config/manifest).
 * These are not .py files but are part of the Python project infrastructure.
 */
export function isPythonEcosystemFile(path) {
    const basename = path.split("/").pop()?.toLowerCase() ?? "";
    if (PYTHON_ECOSYSTEM_BASENAMES.has(basename))
        return true;
    for (const prefix of PYTHON_ECOSYSTEM_PREFIXES) {
        if (basename.startsWith(prefix) && basename.endsWith(".txt"))
            return true;
    }
    return false;
}
/**
 * Check if a file path refers to a Python source file (.py/.pyi/.pyx/.ipynb).
 */
export function isPythonSourceExtension(path) {
    const lastDot = path.lastIndexOf(".");
    if (lastDot < 0)
        return false;
    return PYTHON_EXTENSIONS.has(path.slice(lastDot).toLowerCase());
}
/**
 * Check if a file is relevant to Python observation (source or ecosystem).
 */
export function isPythonRelevantFile(path) {
    return isPythonSourceExtension(path) || isPythonEcosystemFile(path);
}
// ---------------------------------------------------------------------------
// Manifest file detection
// ---------------------------------------------------------------------------
export const PYTHON_MANIFEST_BASENAMES = new Set([
    "pyproject.toml",
    "setup.cfg",
    "setup.py",
    "pipfile",
    "uv.lock",
    "poetry.lock",
    "pdm.lock",
    "environment.yml",
    "environment.yaml",
    "tox.ini",
    "noxfile.py",
]);
export function isPythonManifestFile(path) {
    const basename = path.split("/").pop()?.toLowerCase() ?? "";
    if (PYTHON_MANIFEST_BASENAMES.has(basename))
        return true;
    return basename.startsWith("requirements") && basename.endsWith(".txt");
}
// ---------------------------------------------------------------------------
// Heuristic: does this repo look like a Python project?
// ---------------------------------------------------------------------------
/**
 * Detect if a repo likely contains Python code worth analyzing.
 * Cheap heuristic: check if >5% of files are .py or if key ecosystem files exist.
 */
export function hasPythonSignals(filePaths) {
    let pyCount = 0;
    let hasEcosystem = false;
    for (const path of filePaths) {
        if (isPythonSourceExtension(path))
            pyCount++;
        if (!hasEcosystem && isPythonEcosystemFile(path))
            hasEcosystem = true;
    }
    if (hasEcosystem)
        return true;
    return pyCount > 0 && (pyCount / filePaths.length) > 0.05;
}
//# sourceMappingURL=pythonEcosystemPatterns.js.map
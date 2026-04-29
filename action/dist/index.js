import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ var __webpack_modules__ = ({

/***/ 49:
/***/ ((module) => {



module.exports = function (data, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (node) {
        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        if (node === undefined) return;
        if (typeof node == 'number') return isFinite(node) ? '' + node : 'null';
        if (typeof node !== 'object') return JSON.stringify(node);

        var i, out;
        if (Array.isArray(node)) {
            out = '[';
            for (i = 0; i < node.length; i++) {
                if (i) out += ',';
                out += stringify(node[i]) || 'null';
            }
            return out + ']';
        }

        if (node === null) return 'null';

        if (seen.indexOf(node) !== -1) {
            if (cycles) return JSON.stringify('__cycle__');
            throw new TypeError('Converting circular structure to JSON');
        }

        var seenIndex = seen.push(node) - 1;
        var keys = Object.keys(node).sort(cmp && cmp(node));
        out = '';
        for (i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = stringify(node[key]);

            if (!value) continue;
            if (out) out += ',';
            out += JSON.stringify(key) + ':' + value;
        }
        seen.splice(seenIndex, 1);
        return '{' + out + '}';
    })(data);
};


/***/ }),

/***/ 932:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   NJ: () => (/* binding */ resolvePantheonDir),
/* harmony export */   O2: () => (/* binding */ ensurePantheonDirs),
/* harmony export */   gT: () => (/* binding */ publicPaths)
/* harmony export */ });
/* unused harmony exports internalPaths, relativePantheonPath */
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_1__);
/**
 * P24: Artifact Layout
 *
 * Canonical .pantheon/ directory structure.
 * Public artifacts go in .pantheon/ root.
 * Internal machine objects go in .pantheon/internal/.
 */


const PANTHEON_DIR = ".pantheon";
const INTERNAL_DIR = "internal";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function resolvePantheonDir(repoRoot) {
    return (0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(repoRoot, PANTHEON_DIR);
}
function ensurePantheonDirs(repoRoot) {
    const pantheonDir = resolvePantheonDir(repoRoot);
    (0,node_fs__WEBPACK_IMPORTED_MODULE_1__.mkdirSync)(pantheonDir, { recursive: true });
    (0,node_fs__WEBPACK_IMPORTED_MODULE_1__.mkdirSync)((0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(pantheonDir, INTERNAL_DIR), { recursive: true });
}
function publicPaths(repoRoot) {
    const dir = resolvePantheonDir(repoRoot);
    return {
        dir,
        task: (0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(dir, "task.md"),
        scope: (0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(dir, "scope.md"),
        report: (0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(dir, "report.md"),
        feedback: (0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(dir, "feedback.md"),
        check: (0,node_path__WEBPACK_IMPORTED_MODULE_0__.join)(dir, "check.json"),
    };
}
function internalPaths(repoRoot) {
    const dir = join(resolvePantheonDir(repoRoot), INTERNAL_DIR);
    return {
        dir,
        observations: join(dir, "observations.json"),
        contract: join(dir, "change_contract_lite.json"),
        scope: join(dir, "agent_scope.json"),
        verification: join(dir, "diff_verification.json"),
        feedback: join(dir, "agent_feedback.json"),
    };
}
/**
 * Relative path from repo root for display purposes.
 */
function relativePantheonPath(fullPath, repoRoot) {
    let prefix = join(repoRoot, "").replace(/\\/g, "/");
    if (!prefix.endsWith("/"))
        prefix += "/";
    const normalized = fullPath.replace(/\\/g, "/");
    if (normalized.startsWith(prefix)) {
        return normalized.slice(prefix.length);
    }
    return normalized;
}


/***/ }),

/***/ 484:
/***/ ((module, __webpack_exports__, __nccwpck_require__) => {

__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   b: () => (/* binding */ runGitHubAction),
/* harmony export */   s: () => (/* binding */ runGitHubWorkflowAction)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(136);
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__nccwpck_require__.n(node_url__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_3__ = __nccwpck_require__(421);
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__nccwpck_require__.n(node_child_process__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _githubArtifactCollector_js__WEBPACK_IMPORTED_MODULE_4__ = __nccwpck_require__(755);
/* harmony import */ var _githubActionOutputs_js__WEBPACK_IMPORTED_MODULE_5__ = __nccwpck_require__(190);
/* harmony import */ var _githubCommentClient_js__WEBPACK_IMPORTED_MODULE_10__ = __nccwpck_require__(379);
/* harmony import */ var _githubExitPolicy_js__WEBPACK_IMPORTED_MODULE_8__ = __nccwpck_require__(298);
/* harmony import */ var _githubInputParser_js__WEBPACK_IMPORTED_MODULE_6__ = __nccwpck_require__(497);
/* harmony import */ var _githubPrCommentRenderer_js__WEBPACK_IMPORTED_MODULE_9__ = __nccwpck_require__(34);
/* harmony import */ var _githubRepairRunner_js__WEBPACK_IMPORTED_MODULE_7__ = __nccwpck_require__(509);











async function runGitHubAction(env = process.env) {
    const repoRoot = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(env.GITHUB_WORKSPACE ?? process.cwd());
    const config = (0,_githubInputParser_js__WEBPACK_IMPORTED_MODULE_6__/* .parseGitHubActionConfig */ .ZP)(env);
    const event = env.GITHUB_EVENT_PATH && (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(env.GITHUB_EVENT_PATH))
        ? JSON.parse((0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(env.GITHUB_EVENT_PATH), "utf-8"))
        : null;
    const prContext = (0,_githubInputParser_js__WEBPACK_IMPORTED_MODULE_6__/* .extractPullRequestContext */ .Lh)(event);
    const cliEntry = resolveCliEntryPath(env);
    const guardArgs = [
        "guard",
        config.intent,
        "--repo",
        repoRoot,
        "--config",
        config.configPath,
        ...repeatFlag("--scope", config.scopePatterns),
        ...repeatFlag("--review", config.reviewPatterns),
        ...repeatFlag("--forbid", config.forbidPatterns),
    ];
    runCli(cliEntry, guardArgs, repoRoot);
    const checkArgs = [
        "check",
        "--repo",
        repoRoot,
        ...(config.baseSha ? ["--base", config.baseSha] : []),
    ];
    runCli(cliEntry, checkArgs, repoRoot);
    const checkPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(repoRoot, ".pantheon", "check.json");
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(checkPath)) {
        throw new Error(`Pantheon did not produce .pantheon/check.json at ${checkPath}`);
    }
    const check = JSON.parse((0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(checkPath, "utf-8"));
    const exitDecision = (0,_githubExitPolicy_js__WEBPACK_IMPORTED_MODULE_8__/* .decideGitHubActionExit */ .o)({ check, failOn: config.failOn });
    const artifactOutputDir = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(repoRoot, "pantheon-report");
    const artifactCollection = config.uploadArtifacts
        ? (0,_githubArtifactCollector_js__WEBPACK_IMPORTED_MODULE_4__/* .collectGitHubActionArtifacts */ .x)({
            repoRoot,
            outputDir: artifactOutputDir,
            artifactMode: config.artifactMode,
        })
        : prepareActionOutputDir(artifactOutputDir);
    const comment = (0,_githubPrCommentRenderer_js__WEBPACK_IMPORTED_MODULE_9__/* .renderGitHubPrComment */ .z3)(check);
    const summary = (0,_githubPrCommentRenderer_js__WEBPACK_IMPORTED_MODULE_9__/* .renderGitHubStepSummary */ .Qr)(check, {
        baseSha: config.baseSha,
        headSha: config.headSha,
    });
    const commentPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(artifactCollection.outputDir, "pr_comment.md");
    const summaryPath = env.GITHUB_STEP_SUMMARY ? (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(env.GITHUB_STEP_SUMMARY) : null;
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.writeFileSync)(commentPath, comment.markdown);
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.writeFileSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(artifactCollection.outputDir, "step_summary.md"), summary.markdown);
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.writeFileSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(artifactCollection.outputDir, "action_context.json"), JSON.stringify({
        base_sha: config.baseSha ?? null,
        head_sha: config.headSha ?? null,
        diff_mode: config.baseSha ? "github_pr_base_sha" : "working_tree_fallback",
        fail_on: config.failOn,
        artifact_mode: config.artifactMode,
        artifacts_prepared: config.uploadArtifacts,
    }, null, 2));
    if (summaryPath) {
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.dirname)(summaryPath), { recursive: true });
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.writeFileSync)(summaryPath, summary.markdown);
    }
    let commentResult = { status: "skipped", reason: "PR comment disabled." };
    if (config.postComment && config.commentMode !== "off") {
        commentResult = await (0,_githubCommentClient_js__WEBPACK_IMPORTED_MODULE_10__/* .postOrUpdatePantheonComment */ .b)({
            prContext,
            githubToken: env.GITHUB_TOKEN,
            marker: comment.marker,
            markdown: comment.markdown,
            githubApiUrl: env.GITHUB_API_URL,
        });
    }
    return {
        config,
        prContext,
        check,
        exitDecision,
        artifactOutputDir: artifactCollection.outputDir,
        summaryPath,
        commentPath,
        commentResult,
    };
}
async function runGitHubWorkflowAction(env = process.env) {
    return resolveActionMode(env) === "repair"
        ? (0,_githubRepairRunner_js__WEBPACK_IMPORTED_MODULE_7__/* .runGitHubRepairAction */ ._)(env)
        : runGitHubAction(env);
}
async function main() {
    try {
        const result = await runGitHubWorkflowAction(process.env);
        if ("repairId" in result) {
            (0,_githubActionOutputs_js__WEBPACK_IMPORTED_MODULE_5__/* .writeGitHubActionOutputs */ .N)(process.env, {
                repair_id: result.repairId,
                repair_verdict: result.verdict,
                artifact_dir: result.artifactOutputDirRelative,
                repair_feedback_path: result.repairFeedbackPath
                    ? toWorkspaceRelative(process.env.GITHUB_WORKSPACE, result.repairFeedbackPath)
                    : "",
                comment_status: normalizeCommentStatus(result.commentResult.status),
                sanitizer_violations: result.artifactCollection.sanitizerViolations.length,
            });
            logRepairSummary(result);
            process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
            return;
        }
        (0,_githubActionOutputs_js__WEBPACK_IMPORTED_MODULE_5__/* .writeGitHubActionOutputs */ .N)(process.env, {
            repair_id: "",
            repair_verdict: "",
            artifact_dir: relativeArtifactDir(process.env.GITHUB_WORKSPACE, result.artifactOutputDir),
            repair_feedback_path: "",
            comment_status: normalizeCommentStatus(result.commentResult.status),
            sanitizer_violations: 0,
        });
        logSummary(result);
        process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
    }
    catch (error) {
        console.error(`[Pantheon Action] ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
function runCli(cliEntry, args, cwd) {
    const result = (0,node_child_process__WEBPACK_IMPORTED_MODULE_3__.spawnSync)(process.execPath, [cliEntry, ...args], {
        cwd,
        encoding: "utf-8",
        stdio: "pipe",
    });
    if (result.stdout)
        process.stdout.write(result.stdout);
    if (result.stderr)
        process.stderr.write(result.stderr);
    if (result.error) {
        throw new Error(`Failed to execute Pantheon CLI: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`Pantheon CLI exited with status ${result.status}: ${args.join(" ")}`);
    }
}
function prepareActionOutputDir(outputDir) {
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.rmSync)(outputDir, { recursive: true, force: true });
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)(outputDir, { recursive: true });
    return {
        outputDir,
        copiedPublicArtifacts: [],
        copiedDebugArtifacts: [],
    };
}
function resolveCliEntryPath(env) {
    if (env.PANTHEON_CLI_ENTRY)
        return (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(env.PANTHEON_CLI_ENTRY);
    return (0,node_url__WEBPACK_IMPORTED_MODULE_2__.fileURLToPath)(new URL(/* asset import */ __nccwpck_require__(812), __nccwpck_require__.b));
}
function repeatFlag(flag, values) {
    return values.flatMap(value => [flag, value]);
}
function logSummary(result) {
    console.log(`[Pantheon Action] Verdict: ${result.check.verdict}`);
    console.log(`[Pantheon Action] Fail decision: ${result.exitDecision.shouldFail ? "fail" : "pass"}`);
    console.log(`[Pantheon Action] Artifacts: ${result.artifactOutputDir}`);
    console.log(`[Pantheon Action] Comment: ${result.commentResult.status}`);
    if ((result.commentResult.status === "failed" || result.commentResult.status === "skipped") && result.commentResult.reason) {
        console.log(`[Pantheon Action] Comment warning: ${result.commentResult.reason}`);
    }
}
function logRepairSummary(result) {
    console.log(`[Pantheon Repair Action] Verdict: ${result.verdict}`);
    console.log(`[Pantheon Repair Action] Repair ID: ${result.repairId}`);
    console.log(`[Pantheon Repair Action] Phase: ${result.runPhase}`);
    console.log(`[Pantheon Repair Action] Fail decision: ${result.exitDecision.shouldFail ? "fail" : "pass"}`);
    console.log(`[Pantheon Repair Action] Artifacts: ${result.artifactOutputDirRelative}`);
    console.log(`[Pantheon Repair Action] Comment: ${result.commentResult.status}`);
    if ((result.commentResult.status === "failed" || result.commentResult.status === "skipped") && result.commentResult.reason) {
        console.log(`[Pantheon Repair Action] Comment warning: ${result.commentResult.reason}`);
    }
}
function resolveActionMode(env) {
    return env.INPUT_MODE === "repair" ? "repair" : "boundary";
}
function relativeArtifactDir(workspace, outputDir) {
    return toWorkspaceRelative(workspace, outputDir);
}
function toWorkspaceRelative(workspace, targetPath) {
    if (!workspace)
        return targetPath;
    const normalizedWorkspace = `${(0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(workspace).replace(/\\/g, "/")}/`;
    const normalizedTarget = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(targetPath).replace(/\\/g, "/");
    return normalizedTarget.startsWith(normalizedWorkspace)
        ? normalizedTarget.slice(normalizedWorkspace.length)
        : targetPath;
}
function normalizeCommentStatus(status) {
    if (status === "created" || status === "updated")
        return "posted";
    if (status === "failed")
        return "failed";
    return "skipped";
}
const currentFile = (0,node_url__WEBPACK_IMPORTED_MODULE_2__.fileURLToPath)(import.meta.url);
if (process.argv[1] && (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(process.argv[1]) === currentFile) {
    await main();
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 190:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   N: () => (/* binding */ writeGitHubActionOutputs)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);


function writeGitHubActionOutputs(env, outputs) {
    const outputPath = env.GITHUB_OUTPUT;
    if (!outputPath)
        return;
    const resolved = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(outputPath);
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.dirname)(resolved), { recursive: true });
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(resolved)) {
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.appendFileSync)(resolved, "");
    }
    for (const [key, value] of Object.entries(outputs)) {
        const stringValue = value === null || value === undefined ? "" : String(value);
        writeOutputValue(resolved, key, stringValue);
    }
}
function writeOutputValue(outputPath, key, value) {
    if (!value.includes("\n")) {
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.appendFileSync)(outputPath, `${key}=${value}\n`);
        return;
    }
    const delimiter = `PANTHEON_OUTPUT_${Math.random().toString(36).slice(2)}`;
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.appendFileSync)(outputPath, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}


/***/ }),

/***/ 755:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ collectGitHubActionArtifacts)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _cli_artifactLayout_js__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(932);



function collectGitHubActionArtifacts(input) {
    const repoRoot = input.repoRoot;
    const outputDir = input.outputDir;
    const pantheonDir = (0,_cli_artifactLayout_js__WEBPACK_IMPORTED_MODULE_2__/* .resolvePantheonDir */ .NJ)(repoRoot);
    const publicArtifactPaths = (0,_cli_artifactLayout_js__WEBPACK_IMPORTED_MODULE_2__/* .publicPaths */ .gT)(repoRoot);
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.rmSync)(outputDir, { recursive: true, force: true });
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)(outputDir, { recursive: true });
    const copiedPublicArtifacts = [];
    const copiedDebugArtifacts = [];
    if (input.artifactMode === "debug") {
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.cpSync)(pantheonDir, (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(outputDir, ".pantheon"), { recursive: true });
        copiedDebugArtifacts.push(".pantheon/**");
        return { outputDir, copiedPublicArtifacts, copiedDebugArtifacts };
    }
    const publicFiles = [
        [publicArtifactPaths.task, "task.md"],
        [publicArtifactPaths.scope, "scope.md"],
        [publicArtifactPaths.check, "check.json"],
        [publicArtifactPaths.report, "report.md"],
        [publicArtifactPaths.feedback, "feedback.md"],
        [(0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(publicArtifactPaths.dir, "python_report.md"), "python_report.md"],
    ];
    for (const [source, target] of publicFiles) {
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(source))
            continue;
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.cpSync)(source, (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(outputDir, target));
        copiedPublicArtifacts.push(target);
    }
    return { outputDir, copiedPublicArtifacts, copiedDebugArtifacts };
}


/***/ }),

/***/ 379:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   b: () => (/* binding */ postOrUpdatePantheonComment)
/* harmony export */ });
async function postOrUpdatePantheonComment(input) {
    if (!input.prContext) {
        return { status: "skipped", reason: "No pull request context available." };
    }
    if (!input.githubToken) {
        return { status: "skipped", reason: "No GITHUB_TOKEN available." };
    }
    const apiBase = input.githubApiUrl ?? "https://api.github.com";
    const commentsUrl = `${apiBase}/repos/${input.prContext.owner}/${input.prContext.repo}/issues/${input.prContext.prNumber}/comments`;
    const headers = {
        Authorization: `Bearer ${input.githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "pantheon-boundary-check",
    };
    try {
        const listResponse = await fetch(commentsUrl, { headers });
        if (!listResponse.ok) {
            return { status: "failed", reason: `Failed to list PR comments: ${listResponse.status}` };
        }
        const comments = await listResponse.json();
        const existing = comments.find(comment => comment.body?.includes(input.marker) && (comment.user?.login?.endsWith("[bot]") ?? true));
        if (existing) {
            const updateResponse = await fetch(`${apiBase}/repos/${input.prContext.owner}/${input.prContext.repo}/issues/comments/${existing.id}`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ body: input.markdown }),
            });
            if (!updateResponse.ok) {
                return { status: "failed", reason: `Failed to update PR comment: ${updateResponse.status}` };
            }
            return { status: "updated", commentId: existing.id };
        }
        const createResponse = await fetch(commentsUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ body: input.markdown }),
        });
        if (!createResponse.ok) {
            return { status: "failed", reason: `Failed to create PR comment: ${createResponse.status}` };
        }
        const created = await createResponse.json();
        return { status: "created", commentId: created.id };
    }
    catch (error) {
        return {
            status: "failed",
            reason: error instanceof Error ? error.message : String(error),
        };
    }
}


/***/ }),

/***/ 298:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   o: () => (/* binding */ decideGitHubActionExit)
/* harmony export */ });
function decideGitHubActionExit(input) {
    const { check, failOn } = input;
    if (failOn.includes("none")) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No fail conditions enabled.",
        };
    }
    const matched = new Set();
    for (const finding of check.findings) {
        if (failOn.includes("all")) {
            matched.add(classifyFinding(finding.kind, finding.severity));
            continue;
        }
        if (finding.kind === "forbidden_file_modified" && failOn.includes("forbidden")) {
            matched.add("forbidden");
        }
        if (finding.kind === "outside_scope_file" && failOn.includes("outside_scope")) {
            matched.add("outside_scope");
        }
        if (finding.severity === "review_required" && failOn.includes("review_required")) {
            matched.add("review_required");
        }
    }
    if (matched.size === 0) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No configured blocking findings detected.",
        };
    }
    return {
        shouldFail: true,
        matchedConditions: [...matched],
        reason: `Matched fail conditions: ${[...matched].join(", ")}`,
    };
}
function classifyFinding(kind, severity) {
    if (kind === "forbidden_file_modified")
        return "forbidden";
    if (kind === "outside_scope_file")
        return "outside_scope";
    if (severity === "review_required")
        return "review_required";
    return "forbidden";
}


/***/ }),

/***/ 497:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   Lh: () => (/* binding */ extractPullRequestContext),
/* harmony export */   Y6: () => (/* binding */ loadGitHubEvent),
/* harmony export */   ZP: () => (/* binding */ parseGitHubActionConfig),
/* harmony export */   yG: () => (/* binding */ parseBoolean)
/* harmony export */ });
/* unused harmony exports parseMultilinePatterns, parseFailConditions */
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);


function parseGitHubActionConfig(env) {
    const event = loadGitHubEvent(env);
    const prContext = extractPullRequestContext(event);
    const scopePatterns = parseMultilinePatterns(env.INPUT_SCOPE);
    if (scopePatterns.length === 0) {
        throw new Error("GitHub Action input 'scope' is required and must contain at least one non-empty pattern.");
    }
    const intent = firstNonEmpty(env.INPUT_INTENT, prContext?.title, "GitHub PR boundary check");
    const reviewPatterns = parseMultilinePatterns(env.INPUT_REVIEW);
    const forbidPatterns = parseMultilinePatterns(env.INPUT_FORBID);
    return {
        intent,
        scopePatterns,
        reviewPatterns,
        forbidPatterns,
        configPath: firstNonEmpty(env.INPUT_CONFIG_PATH, "pantheon.json"),
        failOn: parseFailConditions(env.INPUT_FAIL_ON),
        postComment: parseBoolean(env.INPUT_POST_COMMENT, true),
        uploadArtifacts: parseBoolean(env.INPUT_UPLOAD_ARTIFACTS, true),
        artifactMode: parseArtifactMode(env.INPUT_ARTIFACT_MODE),
        commentMode: parseCommentMode(env.INPUT_COMMENT_MODE),
        baseSha: prContext?.baseSha,
        headSha: prContext?.headSha,
    };
}
function loadGitHubEvent(env) {
    const eventPath = env.GITHUB_EVENT_PATH;
    if (!eventPath)
        return null;
    const resolved = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(eventPath);
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(resolved))
        return null;
    try {
        return JSON.parse((0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(resolved, "utf-8"));
    }
    catch {
        return null;
    }
}
function extractPullRequestContext(event) {
    if (!event?.repository?.owner?.login || !event.repository.name || !event.number) {
        return null;
    }
    return {
        owner: event.repository.owner.login,
        repo: event.repository.name,
        prNumber: event.number,
        baseSha: event.pull_request?.base?.sha,
        headSha: event.pull_request?.head?.sha,
        title: event.pull_request?.title,
    };
}
function parseMultilinePatterns(raw) {
    if (!raw)
        return [];
    return raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
function parseFailConditions(raw) {
    const normalized = (raw ?? "forbidden,outside_scope")
        .split(",")
        .map(token => token.trim())
        .filter(token => token.length > 0);
    if (normalized.length === 0) {
        return ["forbidden", "outside_scope"];
    }
    if (normalized.includes("all"))
        return ["all"];
    if (normalized.includes("none"))
        return ["none"];
    const allowed = new Set(["forbidden", "outside_scope", "review_required"]);
    const result = normalized.filter(token => allowed.has(token));
    return result.length > 0 ? [...new Set(result)] : ["forbidden", "outside_scope"];
}
function parseBoolean(raw, fallback) {
    if (raw === undefined)
        return fallback;
    const normalized = raw.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized))
        return true;
    if (["false", "0", "no", "off"].includes(normalized))
        return false;
    return fallback;
}
function parseArtifactMode(raw) {
    return raw === "debug" ? "debug" : "public";
}
function parseCommentMode(raw) {
    return raw === "off" ? "off" : "update";
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (value && value.trim().length > 0)
            return value.trim();
    }
    return "";
}


/***/ }),

/***/ 34:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   Qr: () => (/* binding */ renderGitHubStepSummary),
/* harmony export */   z3: () => (/* binding */ renderGitHubPrComment)
/* harmony export */ });
/* unused harmony export PANTHEON_COMMENT_MARKER */
const PANTHEON_COMMENT_MARKER = "<!-- pantheon-boundary-check-v0 -->";
function renderGitHubPrComment(check) {
    const lines = [];
    const reviewFindings = check.findings.filter(f => f.severity === "review_required");
    const blockingFindings = check.findings.filter(f => f.kind === "forbidden_file_modified" || f.kind === "outside_scope_file");
    lines.push(PANTHEON_COMMENT_MARKER);
    lines.push(`## Pantheon Boundary Check [${labelForVerdict(check.verdict)}]`);
    lines.push("");
    lines.push(`**Verdict:** \`${check.verdict}\``);
    lines.push("");
    lines.push(renderSummaryTable(check));
    lines.push("");
    if (blockingFindings.length > 0) {
        lines.push("### Blocking boundary violations");
        lines.push("");
        for (const finding of blockingFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\``);
            lines.push(`  - Reason: ${summarizeReason(finding)}`);
            lines.push(`  - Required action: ${formatAllowedActions(finding.allowed_actions)}`);
        }
        lines.push("");
        lines.push("Use `feedback.md` to instruct the agent to recover.");
        lines.push("");
    }
    else if (reviewFindings.length > 0) {
        lines.push("No blocking boundary violations found.");
        lines.push("");
        lines.push("### Files requiring human review");
        lines.push("");
        for (const finding of reviewFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\``);
            lines.push(`  - Reason: ${summarizeReason(finding)}`);
            lines.push("  - Suggested action: review before merge");
        }
        lines.push("");
    }
    else {
        lines.push("No boundary violations detected.");
        lines.push("");
    }
    lines.push("Artifacts:");
    lines.push("- `report.md`");
    lines.push("- `check.json`");
    if (check.findings.length > 0)
        lines.push("- `feedback.md`");
    return {
        marker: PANTHEON_COMMENT_MARKER,
        markdown: lines.join("\n"),
    };
}
function renderGitHubStepSummary(check, metadata) {
    const lines = [];
    lines.push("# Pantheon Boundary Check");
    lines.push("");
    lines.push(`Verdict: \`${check.verdict}\``);
    lines.push("");
    if (metadata?.baseSha || metadata?.headSha) {
        lines.push("| Diff | Value |");
        lines.push("|---|---|");
        if (metadata.baseSha)
            lines.push(`| Base | \`${metadata.baseSha.slice(0, 12)}\` |`);
        if (metadata.headSha)
            lines.push(`| Head | \`${metadata.headSha.slice(0, 12)}\` |`);
        lines.push("");
    }
    lines.push(renderSummaryTable(check));
    lines.push("");
    const blockingFindings = check.findings.filter(f => f.kind === "forbidden_file_modified" || f.kind === "outside_scope_file");
    const reviewFindings = check.findings.filter(f => f.severity === "review_required");
    if (blockingFindings.length > 0) {
        lines.push("Blocking boundary violations detected.");
        lines.push("");
        for (const finding of blockingFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\` - ${summarizeReason(finding)}`);
        }
        lines.push("");
    }
    else if (reviewFindings.length > 0) {
        lines.push("No blocking boundary violations found.");
        lines.push("");
        lines.push("Files requiring human review:");
        for (const finding of reviewFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\` - ${summarizeReason(finding)}`);
        }
        lines.push("");
    }
    else {
        lines.push("No boundary violations detected.");
        lines.push("");
    }
    lines.push("See `pantheon-report/` for generated artifacts.");
    return { markdown: lines.join("\n") };
}
function renderSummaryTable(check) {
    return [
        "| Category | Count |",
        "|---|---:|",
        `| In allowed scope | ${check.summary.in_scope} |`,
        `| Review required | ${check.summary.review_required} |`,
        `| Forbidden | ${check.summary.forbidden} |`,
        `| Outside scope | ${check.summary.outside_scope} |`,
    ].join("\n");
}
function labelForVerdict(verdict) {
    if (verdict === "pass")
        return "PASS";
    if (verdict === "requires_review")
        return "WARN";
    return "BLOCKED";
}
function summarizeReason(finding) {
    if (finding.kind === "forbidden_file_modified")
        return "forbidden boundary";
    if (finding.kind === "outside_scope_file")
        return "outside authorized scope";
    if (finding.severity === "review_required")
        return "matched review-required boundary";
    return finding.message;
}
function formatAllowedActions(actions) {
    if (actions.length === 0)
        return "review manually";
    return actions.map(action => `\`${action}\``).join(" or ");
}


/***/ }),

/***/ 509:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {


// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  _: () => (/* binding */ runGitHubRepairAction)
});

// NAMESPACE OBJECT: ./node_modules/zod/v4/core/regexes.js
var regexes_namespaceObject = {};
__nccwpck_require__.r(regexes_namespaceObject);
__nccwpck_require__.d(regexes_namespaceObject, {
  base64: () => (base64),
  base64url: () => (base64url),
  bigint: () => (bigint),
  boolean: () => (regexes_boolean),
  browserEmail: () => (browserEmail),
  cidrv4: () => (cidrv4),
  cidrv6: () => (cidrv6),
  cuid: () => (cuid),
  cuid2: () => (cuid2),
  date: () => (date),
  datetime: () => (datetime),
  domain: () => (domain),
  duration: () => (duration),
  e164: () => (e164),
  email: () => (email),
  emoji: () => (emoji),
  extendedDuration: () => (extendedDuration),
  guid: () => (guid),
  hex: () => (hex),
  hostname: () => (hostname),
  html5Email: () => (html5Email),
  idnEmail: () => (idnEmail),
  integer: () => (integer),
  ipv4: () => (ipv4),
  ipv6: () => (ipv6),
  ksuid: () => (ksuid),
  lowercase: () => (lowercase),
  mac: () => (mac),
  md5_base64: () => (md5_base64),
  md5_base64url: () => (md5_base64url),
  md5_hex: () => (md5_hex),
  nanoid: () => (nanoid),
  "null": () => (_null),
  number: () => (number),
  rfc5322Email: () => (rfc5322Email),
  sha1_base64: () => (sha1_base64),
  sha1_base64url: () => (sha1_base64url),
  sha1_hex: () => (sha1_hex),
  sha256_base64: () => (sha256_base64),
  sha256_base64url: () => (sha256_base64url),
  sha256_hex: () => (sha256_hex),
  sha384_base64: () => (sha384_base64),
  sha384_base64url: () => (sha384_base64url),
  sha384_hex: () => (sha384_hex),
  sha512_base64: () => (sha512_base64),
  sha512_base64url: () => (sha512_base64url),
  sha512_hex: () => (sha512_hex),
  string: () => (string),
  time: () => (time),
  ulid: () => (ulid),
  undefined: () => (_undefined),
  unicodeEmail: () => (unicodeEmail),
  uppercase: () => (uppercase),
  uuid: () => (uuid),
  uuid4: () => (uuid4),
  uuid6: () => (uuid6),
  uuid7: () => (uuid7),
  xid: () => (xid)
});

// NAMESPACE OBJECT: ./node_modules/zod/v4/classic/checks.js
var classic_checks_namespaceObject = {};
__nccwpck_require__.r(classic_checks_namespaceObject);
__nccwpck_require__.d(classic_checks_namespaceObject, {
  endsWith: () => (_endsWith),
  gt: () => (_gt),
  gte: () => (_gte),
  includes: () => (_includes),
  length: () => (_length),
  lowercase: () => (_lowercase),
  lt: () => (_lt),
  lte: () => (_lte),
  maxLength: () => (_maxLength),
  maxSize: () => (_maxSize),
  mime: () => (_mime),
  minLength: () => (_minLength),
  minSize: () => (_minSize),
  multipleOf: () => (_multipleOf),
  negative: () => (_negative),
  nonnegative: () => (_nonnegative),
  nonpositive: () => (_nonpositive),
  normalize: () => (_normalize),
  overwrite: () => (_overwrite),
  positive: () => (_positive),
  property: () => (_property),
  regex: () => (_regex),
  size: () => (_size),
  slugify: () => (_slugify),
  startsWith: () => (_startsWith),
  toLowerCase: () => (_toLowerCase),
  toUpperCase: () => (_toUpperCase),
  trim: () => (_trim),
  uppercase: () => (_uppercase)
});

// NAMESPACE OBJECT: ./node_modules/zod/v4/classic/iso.js
var iso_namespaceObject = {};
__nccwpck_require__.r(iso_namespaceObject);
__nccwpck_require__.d(iso_namespaceObject, {
  ZodISODate: () => (ZodISODate),
  ZodISODateTime: () => (ZodISODateTime),
  ZodISODuration: () => (ZodISODuration),
  ZodISOTime: () => (ZodISOTime),
  date: () => (iso_date),
  datetime: () => (iso_datetime),
  duration: () => (iso_duration),
  time: () => (iso_time)
});

// NAMESPACE OBJECT: ./node_modules/zod/v4/classic/schemas.js
var classic_schemas_namespaceObject = {};
__nccwpck_require__.r(classic_schemas_namespaceObject);
__nccwpck_require__.d(classic_schemas_namespaceObject, {
  ZodAny: () => (ZodAny),
  ZodArray: () => (ZodArray),
  ZodBase64: () => (ZodBase64),
  ZodBase64URL: () => (ZodBase64URL),
  ZodBigInt: () => (ZodBigInt),
  ZodBigIntFormat: () => (ZodBigIntFormat),
  ZodBoolean: () => (ZodBoolean),
  ZodCIDRv4: () => (ZodCIDRv4),
  ZodCIDRv6: () => (ZodCIDRv6),
  ZodCUID: () => (ZodCUID),
  ZodCUID2: () => (ZodCUID2),
  ZodCatch: () => (ZodCatch),
  ZodCodec: () => (ZodCodec),
  ZodCustom: () => (ZodCustom),
  ZodCustomStringFormat: () => (ZodCustomStringFormat),
  ZodDate: () => (ZodDate),
  ZodDefault: () => (ZodDefault),
  ZodDiscriminatedUnion: () => (ZodDiscriminatedUnion),
  ZodE164: () => (ZodE164),
  ZodEmail: () => (ZodEmail),
  ZodEmoji: () => (ZodEmoji),
  ZodEnum: () => (ZodEnum),
  ZodExactOptional: () => (ZodExactOptional),
  ZodFile: () => (ZodFile),
  ZodFunction: () => (ZodFunction),
  ZodGUID: () => (ZodGUID),
  ZodIPv4: () => (ZodIPv4),
  ZodIPv6: () => (ZodIPv6),
  ZodIntersection: () => (ZodIntersection),
  ZodJWT: () => (ZodJWT),
  ZodKSUID: () => (ZodKSUID),
  ZodLazy: () => (ZodLazy),
  ZodLiteral: () => (ZodLiteral),
  ZodMAC: () => (ZodMAC),
  ZodMap: () => (ZodMap),
  ZodNaN: () => (ZodNaN),
  ZodNanoID: () => (ZodNanoID),
  ZodNever: () => (ZodNever),
  ZodNonOptional: () => (ZodNonOptional),
  ZodNull: () => (ZodNull),
  ZodNullable: () => (ZodNullable),
  ZodNumber: () => (ZodNumber),
  ZodNumberFormat: () => (ZodNumberFormat),
  ZodObject: () => (ZodObject),
  ZodOptional: () => (ZodOptional),
  ZodPipe: () => (ZodPipe),
  ZodPrefault: () => (ZodPrefault),
  ZodPromise: () => (ZodPromise),
  ZodReadonly: () => (ZodReadonly),
  ZodRecord: () => (ZodRecord),
  ZodSet: () => (ZodSet),
  ZodString: () => (ZodString),
  ZodStringFormat: () => (ZodStringFormat),
  ZodSuccess: () => (ZodSuccess),
  ZodSymbol: () => (ZodSymbol),
  ZodTemplateLiteral: () => (ZodTemplateLiteral),
  ZodTransform: () => (ZodTransform),
  ZodTuple: () => (ZodTuple),
  ZodType: () => (ZodType),
  ZodULID: () => (ZodULID),
  ZodURL: () => (ZodURL),
  ZodUUID: () => (ZodUUID),
  ZodUndefined: () => (ZodUndefined),
  ZodUnion: () => (ZodUnion),
  ZodUnknown: () => (ZodUnknown),
  ZodVoid: () => (ZodVoid),
  ZodXID: () => (ZodXID),
  ZodXor: () => (ZodXor),
  _ZodString: () => (_ZodString),
  _default: () => (schemas_default),
  _function: () => (_function),
  any: () => (any),
  array: () => (array),
  base64: () => (schemas_base64),
  base64url: () => (schemas_base64url),
  bigint: () => (schemas_bigint),
  boolean: () => (schemas_boolean),
  "catch": () => (schemas_catch),
  check: () => (check),
  cidrv4: () => (schemas_cidrv4),
  cidrv6: () => (schemas_cidrv6),
  codec: () => (codec),
  cuid: () => (schemas_cuid),
  cuid2: () => (schemas_cuid2),
  custom: () => (custom),
  date: () => (schemas_date),
  describe: () => (schemas_describe),
  discriminatedUnion: () => (discriminatedUnion),
  e164: () => (schemas_e164),
  email: () => (schemas_email),
  emoji: () => (schemas_emoji),
  "enum": () => (schemas_enum),
  exactOptional: () => (exactOptional),
  file: () => (file),
  float32: () => (float32),
  float64: () => (float64),
  "function": () => (_function),
  guid: () => (schemas_guid),
  hash: () => (hash),
  hex: () => (schemas_hex),
  hostname: () => (schemas_hostname),
  httpUrl: () => (httpUrl),
  "instanceof": () => (_instanceof),
  int: () => (schemas_int),
  int32: () => (int32),
  int64: () => (int64),
  intersection: () => (intersection),
  ipv4: () => (schemas_ipv4),
  ipv6: () => (schemas_ipv6),
  json: () => (json),
  jwt: () => (jwt),
  keyof: () => (keyof),
  ksuid: () => (schemas_ksuid),
  lazy: () => (lazy),
  literal: () => (literal),
  looseObject: () => (looseObject),
  looseRecord: () => (looseRecord),
  mac: () => (schemas_mac),
  map: () => (map),
  meta: () => (schemas_meta),
  nan: () => (nan),
  nanoid: () => (schemas_nanoid),
  nativeEnum: () => (nativeEnum),
  never: () => (never),
  nonoptional: () => (nonoptional),
  "null": () => (schemas_null),
  nullable: () => (nullable),
  nullish: () => (schemas_nullish),
  number: () => (schemas_number),
  object: () => (object),
  optional: () => (optional),
  partialRecord: () => (partialRecord),
  pipe: () => (pipe),
  prefault: () => (prefault),
  preprocess: () => (preprocess),
  promise: () => (promise),
  readonly: () => (readonly),
  record: () => (record),
  refine: () => (refine),
  set: () => (set),
  strictObject: () => (strictObject),
  string: () => (schemas_string),
  stringFormat: () => (stringFormat),
  stringbool: () => (stringbool),
  success: () => (success),
  superRefine: () => (superRefine),
  symbol: () => (symbol),
  templateLiteral: () => (templateLiteral),
  transform: () => (transform),
  tuple: () => (tuple),
  uint32: () => (uint32),
  uint64: () => (uint64),
  ulid: () => (schemas_ulid),
  undefined: () => (schemas_undefined),
  union: () => (union),
  unknown: () => (unknown),
  url: () => (url),
  uuid: () => (schemas_uuid),
  uuidv4: () => (uuidv4),
  uuidv6: () => (uuidv6),
  uuidv7: () => (uuidv7),
  "void": () => (schemas_void),
  xid: () => (schemas_xid),
  xor: () => (xor)
});

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __nccwpck_require__(24);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __nccwpck_require__(760);
// EXTERNAL MODULE: external "node:child_process"
var external_node_child_process_ = __nccwpck_require__(421);
;// CONCATENATED MODULE: ./src/repoObservation/pathUtils.ts
/**
 * P20a: Repo-relative Path Utilities
 *
 * Core invariant: All emitted paths in RepoObservations must be
 * repo-relative, POSIX-style, with no absolute prefix and no
 * escaping `..` segments.
 */
// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
/**
 * Normalize a raw path to a repo-relative POSIX path.
 *
 * Converts backslashes to forward slashes, removes leading `./`,
 * collapses repeated slashes, and rejects invalid paths.
 *
 * @throws Error if path is empty, absolute, or escapes the repo root via `..`
 */
function normalizeRepoRelativePath(input) {
    if (!input || input.trim().length === 0) {
        throw new Error("Path must not be empty");
    }
    // Convert backslashes to forward slashes
    let normalized = input.replace(/\\/g, "/");
    // Collapse repeated slashes
    normalized = normalized.replace(/\/+/g, "/");
    // Remove trailing slash (unless it's the only character)
    if (normalized.length > 1 && normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
    }
    // Remove leading ./
    while (normalized.startsWith("./")) {
        normalized = normalized.slice(2);
    }
    // Reject absolute paths (Unix or Windows-style)
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
        throw new Error(`Path must not be absolute: ${input}`);
    }
    // Reject paths that escape the repo root
    if (pathEscapesRepo(normalized)) {
        throw new Error(`Path must not escape repo root via '..': ${input}`);
    }
    if (normalized.length === 0) {
        throw new Error("Path must not be empty after normalization");
    }
    return normalized;
}
// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
/**
 * Check if a path is a valid repo-relative POSIX path.
 *
 * Returns true if the path:
 *   - is non-empty
 *   - is not absolute
 *   - does not escape the repo root via `..`
 *   - uses forward slashes only
 */
function isRepoRelativePath(input) {
    if (!input || input.trim().length === 0) {
        return false;
    }
    // Contains backslashes
    if (input.includes("\\")) {
        return false;
    }
    // Absolute path
    if (input.startsWith("/") || /^[A-Za-z]:/.test(input)) {
        return false;
    }
    // Escaping ..
    if (pathEscapesRepo(input)) {
        return false;
    }
    // Repeated slashes
    if (/\/\//.test(input)) {
        return false;
    }
    // Leading ./
    if (input.startsWith("./")) {
        return false;
    }
    return input.length > 0;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Determine if a forward-slash path escapes the repo root via `..`.
 *
 * A path escapes if at any point the depth goes negative when
 * walking segments left-to-right. Handles both `../foo` and
 * `foo/../../bar` patterns.
 */
function pathEscapesRepo(normalized) {
    const segments = normalized.split("/");
    let depth = 0;
    for (const seg of segments) {
        if (seg === "..") {
            depth--;
            if (depth < 0)
                return true;
        }
        else if (seg !== "" && seg !== ".") {
            depth++;
        }
    }
    return false;
}

;// CONCATENATED MODULE: ./src/diffWorkflow/gitDiffReader.ts
/**
 * P21: Git Diff Reader
 *
 * Reads changed files from git diff + untracked files.
 * Falls back gracefully when not in a git repo.
 *
 * Does NOT parse patch content — only file paths and status.
 */


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Read changed files from git diff + untracked files.
 *
 * If `changedFilesOverride` is provided, it takes precedence over git.
 */
function readGitDiffSummary(input) {
    const { repoRoot, baseRef, changedFilesOverride } = input;
    // Override takes precedence
    if (changedFilesOverride && changedFilesOverride.length > 0) {
        return {
            base_ref: baseRef,
            changed_files: changedFilesOverride.map(p => ({
                path: normalizePath(p),
                status: "modified",
            })),
            warnings: [],
        };
    }
    const warnings = [];
    const files = [];
    // 1. Read name-status diff
    try {
        const nameStatus = (0,external_node_child_process_.execSync)(`git diff --name-status ${baseRef}`, {
            cwd: repoRoot,
            encoding: "utf-8",
            timeout: 10_000,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (nameStatus) {
            for (const line of nameStatus.split("\n")) {
                const parsed = parseNameStatusLine(line.trim());
                if (parsed) {
                    files.push(parsed);
                }
                else if (line.trim()) {
                    warnings.push(`Could not parse git diff line: ${line.trim()}`);
                }
            }
        }
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("not a git repository") || msg.includes("Not a git repository")) {
            warnings.push(`Not a git repository. Use --changed to specify files manually.`);
        }
        else {
            warnings.push(`git diff failed: ${msg}`);
        }
        return { base_ref: baseRef, changed_files: [], warnings };
    }
    // 2. Read untracked files only for working-tree mode.
    // In CI / PR mode with an explicit base ref, the diff must reflect base..HEAD
    // only and should not be polluted by local bootstrap artifacts like node_modules/.
    if (!baseRef) {
        try {
            const untracked = (0,external_node_child_process_.execSync)("git ls-files --others --exclude-standard", {
                cwd: repoRoot,
                encoding: "utf-8",
                timeout: 10_000,
                stdio: ["pipe", "pipe", "pipe"],
            }).trim();
            if (untracked) {
                for (const path of untracked.split("\n")) {
                    const trimmed = path.trim();
                    if (trimmed) {
                        files.push({ path: normalizePath(trimmed), status: "untracked" });
                    }
                }
            }
        }
        catch (e) {
            warnings.push(`git ls-files failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return { base_ref: baseRef, changed_files: files, warnings };
}
/**
 * Extract just the file paths from a GitDiffSummary.
 */
function extractChangedFilePaths(diff) {
    return diff.changed_files.map(f => f.path);
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
const STATUS_MAP = {
    A: "added",
    M: "modified",
    D: "deleted",
    R: "renamed",
    C: "modified", // copied — treat as modified
    T: "modified", // type change
};
function parseNameStatusLine(line) {
    if (!line)
        return null;
    // Format: "M\tpath" or "R100\told_path\tnew_path"
    const parts = line.split("\t");
    if (parts.length < 2)
        return null;
    const statusCode = parts[0].charAt(0).toUpperCase();
    const status = STATUS_MAP[statusCode] ?? "unknown";
    if (statusCode === "R" && parts.length >= 3) {
        return {
            path: normalizePath(parts[2]),
            status: "renamed",
            old_path: normalizePath(parts[1]),
        };
    }
    return { path: normalizePath(parts[1]), status };
}
function normalizePath(p) {
    try {
        return normalizeRepoRelativePath(p);
    }
    catch {
        return p.replace(/\\/g, "/");
    }
}

;// CONCATENATED MODULE: ./src/cli/types.ts
/**
 * P24: Public Interface Types
 *
 * Stable public-facing types for the Pantheon CLI.
 * These types form the external contract — do not expose internal objects.
 */
const DEFAULT_PANTHEON_CONFIG = {
    version: 1,
    protected: [".pantheon/**", ".cursor/**", ".git/**", "node_modules/**"],
    review_required: [],
    generated: [],
    path_roles: {},
    python: undefined,
};

;// CONCATENATED MODULE: ./src/cli/pantheonConfig.ts
/**
 * P24: Pantheon Config Loader
 *
 * Extends existing pantheon.json with P24 public interface fields:
 * protected, review_required, generated, path_roles.
 *
 * Reuses existing repoObservationConfigLoader for path_roles/excluded_dirs.
 * Does NOT use YAML — pantheon.json is the v1 public config.
 */



function loadPantheonConfig(repoRoot, configPathInput = "pantheon.json") {
    const configPath = (0,external_node_path_.join)(repoRoot, configPathInput);
    const warnings = [];
    if (!(0,external_node_fs_.existsSync)(configPath)) {
        return { config: DEFAULT_PANTHEON_CONFIG, warnings: [], loaded_from: null };
    }
    let raw;
    try {
        raw = JSON.parse((0,external_node_fs_.readFileSync)(configPath, "utf-8"));
    }
    catch (e) {
        warnings.push(`Failed to parse pantheon.json: ${e.message}`);
        return { config: DEFAULT_PANTHEON_CONFIG, warnings, loaded_from: configPathInput };
    }
    if (typeof raw !== "object" || raw === null) {
        warnings.push("pantheon.json must be a JSON object");
        return { config: DEFAULT_PANTHEON_CONFIG, warnings, loaded_from: configPathInput };
    }
    return parseConfigJson(raw, warnings, configPathInput);
}
/**
 * Generate default pantheon.json content for `pantheon init`.
 */
function generateDefaultConfigJson() {
    return JSON.stringify({
        version: 1,
        protected: [
            ".pantheon/**",
            ".cursor/**",
            ".git/**",
            "node_modules/**",
        ],
        review_required: [],
        generated: [],
        path_roles: {},
        repo_observation: {},
    }, null, 2) + "\n";
}
// ---------------------------------------------------------------------------
// JSON parser
// ---------------------------------------------------------------------------
function parseConfigJson(root, warnings, loadedFrom = "pantheon.json") {
    const version = typeof root.version === "number" ? root.version : 1;
    if (version !== 1) {
        warnings.push(`pantheon.json: unsupported version ${version}, using 1`);
    }
    const protectedList = parseStringArray(root, "protected", warnings);
    const reviewRequired = parseStringArray(root, "review_required", warnings);
    const generated = parseStringArray(root, "generated", warnings);
    const pathRoles = parseStringMap(root, "path_roles", warnings);
    // Python observation config (optional)
    const pythonConfig = parsePythonConfig(root, warnings);
    // Warn on unknown top-level keys
    const knownKeys = new Set([
        "version", "protected", "review_required", "generated",
        "path_roles", "repo_observation", "python",
    ]);
    for (const key of Object.keys(root)) {
        if (!knownKeys.has(key)) {
            warnings.push(`pantheon.json: unknown key "${key}" (ignored)`);
        }
    }
    const finalProtected = protectedList.length > 0
        ? protectedList
        : [...DEFAULT_PANTHEON_CONFIG.protected];
    return {
        config: {
            version: 1,
            protected: finalProtected,
            review_required: reviewRequired,
            generated,
            path_roles: pathRoles,
            python: pythonConfig,
        },
        warnings,
        loaded_from: loadedFrom,
    };
}
function parseStringArray(root, key, warnings) {
    const val = root[key];
    if (val === undefined)
        return [];
    if (!Array.isArray(val)) {
        warnings.push(`pantheon.json: "${key}" must be an array`);
        return [];
    }
    const result = [];
    for (const item of val) {
        if (typeof item === "string" && item.length > 0) {
            result.push(item);
        }
        else {
            warnings.push(`pantheon.json: ${key} contains invalid entry: ${JSON.stringify(item)}`);
        }
    }
    return result;
}
function parseStringMap(root, key, warnings) {
    const val = root[key];
    if (val === undefined)
        return {};
    if (typeof val !== "object" || val === null || Array.isArray(val)) {
        warnings.push(`pantheon.json: "${key}" must be an object`);
        return {};
    }
    const result = {};
    for (const [k, v] of Object.entries(val)) {
        if (typeof v === "string") {
            result[k] = v;
        }
        else {
            warnings.push(`pantheon.json: ${key}["${k}"] must be a string`);
        }
    }
    return result;
}
function parsePythonConfig(root, warnings) {
    const section = root.python;
    if (section === undefined)
        return undefined;
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
        warnings.push('pantheon.json: "python" must be an object');
        return undefined;
    }
    const pyObj = section;
    const result = {};
    // project_packages: string[]
    if (pyObj.project_packages !== undefined) {
        if (Array.isArray(pyObj.project_packages)) {
            const valid = [];
            for (const item of pyObj.project_packages) {
                if (typeof item === "string" && item.length > 0)
                    valid.push(item);
            }
            result.project_packages = valid;
        }
        else {
            warnings.push('pantheon.json: python.project_packages must be an array of strings');
        }
    }
    // sensitive_overrides: Record<string, string>
    if (pyObj.sensitive_overrides !== undefined) {
        if (typeof pyObj.sensitive_overrides === "object" && pyObj.sensitive_overrides !== null && !Array.isArray(pyObj.sensitive_overrides)) {
            const map = {};
            for (const [k, v] of Object.entries(pyObj.sensitive_overrides)) {
                if (typeof v === "string")
                    map[k] = v;
                else
                    warnings.push(`pantheon.json: python.sensitive_overrides["${k}"] must be a string`);
            }
            result.sensitive_overrides = map;
        }
        else {
            warnings.push('pantheon.json: python.sensitive_overrides must be an object');
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

;// CONCATENATED MODULE: ./src/repoObservation/repoObservationConfigLoader.ts
/**
 * P20a.2: Repo Observation Config Loader
 *
 * Loads `pantheon.json` from repo root and extracts `repo_observation` config.
 * Only supports exact-match patterns — no globs, no regex.
 *
 * Config schema:
 * {
 *   "repo_observation": {
 *     "excluded_dirs": ["dir1", "dir2"],
 *     "path_roles": { "prefix/path": "generated" },
 *     "test_mapping_overrides": { "src/file.ts": ["test/file.test.ts"] }
 *   }
 * }
 */


const VALID_BUCKETS = new Set([
    "src", "test", "config", "generated", "docs", "script", "asset", "unknown",
]);
function loadRepoObservationConfig(repoRoot) {
    const warnings = [];
    const configPath = (0,external_node_path_.join)(repoRoot, "pantheon.json");
    if (!(0,external_node_fs_.existsSync)(configPath)) {
        return {
            config: {},
            warnings: [],
            loaded_from: null,
        };
    }
    let raw;
    try {
        raw = JSON.parse((0,external_node_fs_.readFileSync)(configPath, "utf-8"));
    }
    catch (e) {
        warnings.push(`Failed to parse pantheon.json: ${e.message}`);
        return { config: {}, warnings, loaded_from: "pantheon.json" };
    }
    if (typeof raw !== "object" || raw === null) {
        warnings.push("pantheon.json must be a JSON object");
        return { config: {}, warnings, loaded_from: "pantheon.json" };
    }
    const root = raw;
    const repoObs = root["repo_observation"];
    if (repoObs === undefined) {
        return { config: {}, warnings: [], loaded_from: "pantheon.json" };
    }
    if (typeof repoObs !== "object" || repoObs === null) {
        warnings.push("pantheon.json: repo_observation must be an object");
        return { config: {}, warnings, loaded_from: "pantheon.json" };
    }
    const section = repoObs;
    // Parse excluded_dirs
    let excluded_dirs;
    if (section["excluded_dirs"] !== undefined) {
        if (Array.isArray(section["excluded_dirs"])) {
            excluded_dirs = [];
            for (const item of section["excluded_dirs"]) {
                if (typeof item === "string" && item.length > 0) {
                    excluded_dirs.push(item);
                }
                else {
                    warnings.push(`pantheon.json: excluded_dirs contains invalid entry: ${JSON.stringify(item)}`);
                }
            }
        }
        else {
            warnings.push("pantheon.json: excluded_dirs must be an array");
        }
    }
    // Parse path_roles
    let path_roles;
    if (section["path_roles"] !== undefined) {
        if (typeof section["path_roles"] === "object" && section["path_roles"] !== null && !Array.isArray(section["path_roles"])) {
            path_roles = {};
            for (const [key, value] of Object.entries(section["path_roles"])) {
                if (typeof value === "string" && VALID_BUCKETS.has(value)) {
                    path_roles[key] = value;
                }
                else {
                    warnings.push(`pantheon.json: path_roles["${key}"] has invalid bucket: ${JSON.stringify(value)}`);
                }
            }
        }
        else {
            warnings.push("pantheon.json: path_roles must be an object");
        }
    }
    // Parse test_mapping_overrides
    let test_mapping_overrides;
    if (section["test_mapping_overrides"] !== undefined) {
        if (typeof section["test_mapping_overrides"] === "object" && section["test_mapping_overrides"] !== null && !Array.isArray(section["test_mapping_overrides"])) {
            test_mapping_overrides = {};
            for (const [key, value] of Object.entries(section["test_mapping_overrides"])) {
                if (Array.isArray(value) && value.every(v => typeof v === "string")) {
                    test_mapping_overrides[key] = value;
                }
                else {
                    warnings.push(`pantheon.json: test_mapping_overrides["${key}"] must be an array of strings`);
                }
            }
        }
        else {
            warnings.push("pantheon.json: test_mapping_overrides must be an object");
        }
    }
    return {
        config: {
            ...(excluded_dirs !== undefined ? { excluded_dirs } : {}),
            ...(path_roles !== undefined ? { path_roles } : {}),
            ...(test_mapping_overrides !== undefined ? { test_mapping_overrides } : {}),
        },
        warnings,
        loaded_from: "pantheon.json",
    };
}

;// CONCATENATED MODULE: ./src/repoObservation/types.ts
/**
 * P20a: Deterministic Repo Observations — Domain Types
 *
 * Core invariants:
 *   - All paths are repo-relative POSIX (no absolute, no escaping ..)
 *   - observation_hash is deterministic: same repo state → same hash
 *   - scanner.llm_used is always false in P20a
 *   - RepoObservations is an observed index, NOT canonical architecture truth
 */
const DEFAULT_EXCLUDED_DIRS = [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".git",
    ".next",
    "out",
    ".cache",
    "tmp",
    ".tmp-pet-build",
];
const DEFAULT_SCAN_LIMITS = {
    max_file_bytes: 512 * 1024, // 512 KB
    max_total_files: 10_000,
    max_import_edges: 50_000,
    scan_timeout_ms: 60_000, // 60 seconds
    excluded_dirs: DEFAULT_EXCLUDED_DIRS,
};

;// CONCATENATED MODULE: ./src/repoObservation/fileClassifier.ts
/**
 * P20a: File Classification
 *
 * Classifies files by path into buckets and languages.
 * Uses only path-based rules — no content inspection.
 */
// ---------------------------------------------------------------------------
// Bucket classification
// ---------------------------------------------------------------------------
const BUCKET_RULES = [
    // Test files (must come before src to catch test files inside src/)
    { test: p => /\.(test|spec)\.[tj]sx?$/.test(p), bucket: "test" },
    { test: p => p.startsWith("test/") || p.startsWith("tests/"), bucket: "test" },
    { test: p => p.includes("__tests__/"), bucket: "test" },
    // Generated / data (pipeline outputs, trial data, dogfood artifacts)
    { test: p => p.startsWith("generated/"), bucket: "generated" },
    { test: p => p.includes("build/generated/"), bucket: "generated" },
    { test: p => /\.generated\.[tj]sx?$/.test(p), bucket: "generated" },
    { test: p => p.startsWith("data/"), bucket: "generated" },
    { test: p => p.startsWith(".pantheon/"), bucket: "generated" },
    // Config
    { test: p => /^tsconfig(\..+)?\.json$/.test(p), bucket: "config" },
    { test: p => p === "package.json", bucket: "config" },
    { test: p => p === "package-lock.json", bucket: "config" },
    { test: p => /^vite\.config\.[tj]sx?$/.test(p), bucket: "config" },
    { test: p => /^vitest\.config\.[tj]sx?$/.test(p), bucket: "config" },
    { test: p => /^webpack\.config\.[tj]sx?$/.test(p), bucket: "config" },
    { test: p => /^jest\.config\.[tj]sx?$/.test(p), bucket: "config" },
    { test: p => /^pantheon(\..+)?\.json$/.test(p), bucket: "config" },
    { test: p => p.startsWith(".github/"), bucket: "config" },
    { test: p => /^\.?eslint/.test(p), bucket: "config" },
    { test: p => p.startsWith("config/"), bucket: "config" },
    { test: p => p.startsWith("action/"), bucket: "config" },
    // Docs
    { test: p => p.startsWith("docs/"), bucket: "docs" },
    { test: p => p.startsWith("examples/"), bucket: "docs" },
    { test: p => /\.md$/i.test(p) && !p.startsWith("src/"), bucket: "docs" },
    // Scripts
    { test: p => p.startsWith("scripts/"), bucket: "script" },
    { test: p => p.startsWith("bin/"), bucket: "script" },
    // Assets (cockpit UI, static files)
    { test: p => p.startsWith("cockpit/"), bucket: "asset" },
    { test: p => p.startsWith("cockpit-mock/"), bucket: "asset" },
    // Source (catch-all for src/, lib/, app/)
    { test: p => p.startsWith("src/"), bucket: "src" },
    { test: p => p.startsWith("lib/"), bucket: "src" },
    { test: p => p.startsWith("app/"), bucket: "src" },
];
/**
 * Classify a repo-relative path into a bucket.
 */
function classifyFile(path) {
    const lower = path.toLowerCase();
    for (const rule of BUCKET_RULES) {
        if (rule.test(lower)) {
            return rule.bucket;
        }
    }
    // Asset detection by extension
    if (/\.(png|jpe?g|gif|svg|ico|webp|mp4|webm|woff2?|ttf|eot|pdf)$/i.test(path)) {
        return "asset";
    }
    return "unknown";
}
// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------
const LANGUAGE_MAP = [
    { test: /\.tsx?$/, language: "typescript" },
    { test: /\.jsx?$/, language: "javascript" },
    { test: /\.json$/, language: "json" },
    { test: /\.md$/i, language: "markdown" },
    { test: /\.(ya?ml)$/i, language: "yaml" },
];
/**
 * Detect the language of a file by its extension.
 */
function detectLanguage(path) {
    for (const rule of LANGUAGE_MAP) {
        if (rule.test.test(path)) {
            return rule.language;
        }
    }
    return "other";
}

;// CONCATENATED MODULE: ./src/repoObservation/importExtractor.ts
/**
 * P20a: Import Extractor
 *
 * Extracts literal import/export/require specifiers from TS/JS files.
 * Uses deterministic regex — no TypeScript parser dependency.
 * Records resolution_status for each edge. Dynamic imports → unknown.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function extractImportsFromFile(input) {
    const edges = [];
    const dynamicImports = [];
    const unresolvedImports = [];
    // Static imports: import x from "..."  /  import { x } from "..."  /  import "..."
    for (const m of input.content.matchAll(/import\s+(?:(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?\s+from\s+)?["']([^"']+)["']/g)) {
        const edge = buildEdge(input.path, m[1], "static");
        edges.push(edge);
        if (edge.resolution_status === "unresolved_package" || edge.resolution_status === "unresolved_alias") {
            unresolvedImports.push(`${input.path}:${m[1]}`);
        }
    }
    // Export-from: export { x } from "..."  /  export * from "..."
    for (const m of input.content.matchAll(/export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+["']([^"']+)["']/g)) {
        const edge = buildEdge(input.path, m[1], "export_from");
        edges.push(edge);
        if (edge.resolution_status === "unresolved_package" || edge.resolution_status === "unresolved_alias") {
            unresolvedImports.push(`${input.path}:${m[1]}`);
        }
    }
    // Require: const x = require("...")  /  require("...")
    for (const m of input.content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)) {
        const edge = buildEdge(input.path, m[1], "require");
        edges.push(edge);
        if (edge.resolution_status === "unresolved_package" || edge.resolution_status === "unresolved_alias") {
            unresolvedImports.push(`${input.path}:${m[1]}`);
        }
    }
    // Dynamic imports: import(...)
    for (const m of input.content.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
        edges.push(buildEdge(input.path, m[1], "dynamic"));
        dynamicImports.push(`${input.path}:${m[1]}`);
    }
    // Dynamic imports with non-literal: import(expr)
    for (const m of input.content.matchAll(/import\s*\(\s*(?!["'])([^)]+)\s*\)/g)) {
        dynamicImports.push(`${input.path}:<dynamic expression>`);
        edges.push({
            from_file: input.path,
            raw_specifier: `<dynamic:${m[1].trim().slice(0, 50)}>`,
            import_kind: "dynamic",
            resolution_status: "dynamic_unknown",
            evidence: [{ type: "import_literal", source_path: input.path, value: `dynamic import expression: ${m[1].trim().slice(0, 100)}` }],
        });
    }
    return {
        import_edges: edges,
        unknowns: { dynamic_imports: dynamicImports, unresolved_imports: unresolvedImports },
    };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function buildEdge(fromFile, specifier, kind) {
    const resolution = resolveSpecifier(specifier);
    return {
        from_file: fromFile,
        raw_specifier: specifier,
        import_kind: kind,
        ...(resolution.targetHint ? { target_hint: resolution.targetHint } : {}),
        resolution_status: kind === "dynamic" ? "dynamic_unknown" : resolution.status,
        evidence: [{ type: "import_literal", source_path: fromFile, value: specifier }],
    };
}
function resolveSpecifier(specifier) {
    // Relative path
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return { status: "resolved_relative", targetHint: specifier };
    }
    // Node builtins (node:fs, node:path, etc.) — handled here for early classification
    if (specifier.startsWith("node:")) {
        return { status: "builtin_node_package" };
    }
    // Scoped package (@org/pkg)
    if (specifier.startsWith("@")) {
        return { status: "unresolved_package" };
    }
    // Bare specifier — could be package or alias
    // Package classification (declared/undeclared/builtin) is done later by packageDependencyClassifier
    if (!specifier.includes("/") || specifier.split("/").length <= 2) {
        if (/^[a-z@]/.test(specifier)) {
            return { status: "unresolved_package" };
        }
        return { status: "unresolved_alias" };
    }
    // Anything else
    return { status: "literal_extracted" };
}

;// CONCATENATED MODULE: ./src/repoObservation/testMapper.ts
/**
 * P20a: Test Mapper
 *
 * Maps source files to test files by path convention.
 * Does NOT do coverage analysis or content inspection.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function inferTestMappings(input) {
    const srcFiles = input.files.filter(f => f.bucket === "src");
    const testFiles = input.files.filter(f => f.bucket === "test");
    const overrides = input.overrides ?? {};
    const testPaths = new Set(testFiles.map(f => f.path));
    const mappedTests = new Set();
    const mappings = [];
    const unmappedSources = [];
    const ambiguous = [];
    for (const src of srcFiles) {
        // Config overrides take priority
        const overrideTests = overrides[src.path];
        if (overrideTests && overrideTests.length > 0) {
            for (const testPath of overrideTests) {
                mappings.push({
                    source_path: src.path,
                    test_path: testPath,
                    mapping_kind: "config_override",
                    confidence: "high",
                    evidence: [{ type: "config", source_path: "pantheon.json", value: `test_mapping_override: ${src.path} → ${testPath}` }],
                });
                mappedTests.add(testPath);
            }
            continue;
        }
        const candidates = findTestCandidates(src.path, testPaths);
        if (candidates.length === 0) {
            unmappedSources.push(src.path);
        }
        else if (candidates.length === 1) {
            const c = candidates[0];
            mappings.push({
                source_path: src.path,
                test_path: c.testPath,
                mapping_kind: c.kind,
                confidence: c.confidence,
                evidence: [{ type: "test_convention", source_path: src.path, value: `Matched by ${c.kind}: ${c.testPath}` }],
            });
            mappedTests.add(c.testPath);
        }
        else {
            // Multiple candidates — record first but mark ambiguous
            const c = candidates[0];
            mappings.push({
                source_path: src.path,
                test_path: c.testPath,
                mapping_kind: c.kind,
                confidence: "low",
                evidence: [{ type: "test_convention", source_path: src.path, value: `Ambiguous: ${candidates.length} candidates` }],
            });
            mappedTests.add(c.testPath);
            ambiguous.push(src.path);
        }
    }
    const unmappedTests = testFiles
        .filter(f => !mappedTests.has(f.path))
        .map(f => f.path);
    return { test_mappings: mappings, unmapped_sources: unmappedSources, unmapped_tests: unmappedTests, ambiguous_test_mappings: ambiguous };
}
function findTestCandidates(srcPath, testPaths) {
    const candidates = [];
    const basename = getBasename(srcPath);
    const dirParts = srcPath.split("/").slice(1, -1); // remove bucket prefix and filename
    const subPath = dirParts.join("/");
    // Convention 1: test/<subpath>/<basename>.test.ts
    tryCandidate(candidates, testPaths, `test/${subPath ? subPath + "/" : ""}${basename}.test.ts`, "parallel_test_dir", "high");
    // Convention 2: tests/<subpath>/<basename>.test.ts
    tryCandidate(candidates, testPaths, `tests/${subPath ? subPath + "/" : ""}${basename}.test.ts`, "parallel_test_dir", "high");
    // Convention 3: src/<subpath>/<basename>.test.ts (co-located)
    tryCandidate(candidates, testPaths, `src/${subPath ? subPath + "/" : ""}${basename}.test.ts`, "same_basename", "high");
    // Convention 4: __tests__/<subpath>/<basename>.test.ts
    tryCandidate(candidates, testPaths, `__tests__/${subPath ? subPath + "/" : ""}${basename}.test.ts`, "parallel_test_dir", "medium");
    // Convention 5: test/<subpath>/<basename>.spec.ts
    tryCandidate(candidates, testPaths, `test/${subPath ? subPath + "/" : ""}${basename}.spec.ts`, "suffix_spec", "medium");
    // Convention 6: tests/<subpath>/<basename>.spec.ts
    tryCandidate(candidates, testPaths, `tests/${subPath ? subPath + "/" : ""}${basename}.spec.ts`, "suffix_spec", "medium");
    // Convention 7: src/<subpath>/<basename>.spec.ts (co-located)
    tryCandidate(candidates, testPaths, `src/${subPath ? subPath + "/" : ""}${basename}.spec.ts`, "suffix_spec", "medium");
    return candidates;
}
function tryCandidate(out, testPaths, testPath, kind, confidence) {
    if (testPaths.has(testPath)) {
        out.push({ testPath, kind, confidence });
    }
}
function getBasename(filePath) {
    const fileName = filePath.split("/").pop() ?? "";
    // Strip extension (.ts, .tsx, .js, .jsx)
    return fileName.replace(/\.[tj]sx?$/, "");
}

;// CONCATENATED MODULE: ./src/repoObservation/sensitivePathDetector.ts
/**
 * P20a: Sensitive Path Detector
 *
 * Detects sensitive paths by keyword matching in path segments.
 * No content inspection — path-only analysis.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const SENSITIVE_KEYWORDS = [
    { keyword: "auth", reason: "auth_keyword" },
    { keyword: "payment", reason: "payment_keyword" },
    { keyword: "billing", reason: "payment_keyword" },
    { keyword: "admin", reason: "admin_keyword" },
    { keyword: "secret", reason: "secret_keyword" },
    { keyword: "secrets", reason: "secret_keyword" },
    { keyword: "infra", reason: "infra_keyword" },
    { keyword: "migration", reason: "migration_keyword" },
    { keyword: "migrations", reason: "migration_keyword" },
    { keyword: "prod", reason: "config_keyword" },
    { keyword: "production", reason: "config_keyword" },
];
/**
 * Detect sensitive paths by keyword matching in path segments.
 */
function detectSensitivePaths(files) {
    const results = [];
    const seen = new Set();
    for (const file of files) {
        const segments = file.path.toLowerCase().split("/");
        for (const { keyword, reason } of SENSITIVE_KEYWORDS) {
            if (segments.some(seg => seg === keyword)) {
                const key = `${file.path}:${reason}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({
                        path: file.path,
                        reason,
                        review_required: true,
                        evidence: [{ type: "keyword", source_path: file.path, value: `Path contains sensitive segment: ${keyword}` }],
                    });
                }
            }
        }
    }
    return results;
}

;// CONCATENATED MODULE: ./src/repoObservation/codeownersParser.ts
/**
 * P20a: CODEOWNERS Parser
 *
 * Conservative CODEOWNERS parsing.
 * Supports root, .github/, docs/ locations.
 * Complex patterns marked as unresolved.
 */


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function parseCodeowners(repoRoot) {
    const hints = [];
    const unresolved = [];
    const locations = [
        (0,external_node_path_.join)(repoRoot, "CODEOWNERS"),
        (0,external_node_path_.join)(repoRoot, ".github", "CODEOWNERS"),
        (0,external_node_path_.join)(repoRoot, "docs", "CODEOWNERS"),
    ];
    for (const loc of locations) {
        if (!(0,external_node_fs_.existsSync)(loc))
            continue;
        const content = (0,external_node_fs_.readFileSync)(loc, "utf-8");
        const lines = content.split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#"))
                continue;
            const parts = line.split(/\s+/);
            if (parts.length < 2)
                continue;
            const pattern = parts[0];
            const owners = parts.slice(1).filter(p => p.startsWith("@"));
            if (owners.length === 0)
                continue;
            const isComplex = isComplexPattern(pattern);
            const source = loc.includes(".github")
                ? "CODEOWNERS:.github"
                : loc.includes("docs")
                    ? "CODEOWNERS:docs"
                    : "CODEOWNERS";
            if (isComplex) {
                unresolved.push(pattern);
            }
            hints.push({
                path_pattern: pattern,
                owners,
                source,
                match_status: isComplex ? "unresolved_complex_pattern" : "simple_pattern",
                evidence: [{ type: "codeowners", source_path: loc.replace(repoRoot, "").replace(/\\/g, "/").replace(/^\//, ""), value: line }],
            });
        }
    }
    return { owner_hints: hints, unresolved_patterns: unresolved };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
/**
 * Determine if a CODEOWNERS pattern is "complex" and cannot be
 * confidently interpreted by simple prefix matching.
 *
 * Complex patterns include: **, *, ?, [, !
 * Simple patterns: path/ or path/file
 */
function isComplexPattern(pattern) {
    // Double star glob
    if (pattern.includes("**"))
        return true;
    // Single star or question mark wildcard
    if (pattern.includes("*") || pattern.includes("?"))
        return true;
    // Character class
    if (pattern.includes("["))
        return true;
    // Negation
    if (pattern.startsWith("!"))
        return true;
    return false;
}

;// CONCATENATED MODULE: external "node:crypto"
const external_node_crypto_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:crypto");
// EXTERNAL MODULE: ./node_modules/fast-json-stable-stringify/index.js
var fast_json_stable_stringify = __nccwpck_require__(49);
var fast_json_stable_stringify_default = /*#__PURE__*/__nccwpck_require__.n(fast_json_stable_stringify);
;// CONCATENATED MODULE: ./src/stableSerialize.ts
/**
 * Stable Serialization
 *
 * ref: H-01 – Prohibits JSON.stringify for hash computation.
 * ref: H-04 – Serialization version must be tracked.
 *
 * Uses deterministic key-ordering serialization so that:
 *   { a: 1, b: 2 }  and  { b: 2, a: 1 }
 * produce the identical byte string.
 */

/**
 * Current serialization version identifier.
 * ref: H-04 – every revision records this alongside the hash.
 */
const stableSerialize_SERIALIZATION_VERSION = "stable_json_v1";
/**
 * Deterministic JSON serialization.
 *
 * Contract:
 *   1. Keys are sorted lexicographically (deep).
 *   2. No trailing whitespace or newlines.
 *   3. Identical logical values always produce identical byte strings.
 *   4. undefined values are omitted (same as JSON.stringify behaviour).
 *
 * @param value – any JSON-serializable value
 * @returns deterministic string representation
 */
function stableSerialize_stableSerialize(value) {
    return fast_json_stable_stringify_default()(value);
}

;// CONCATENATED MODULE: ./src/hash.ts
/**
 * Hash Module
 *
 * Implements the four core hash functions required by Day 1:
 *   1. computeBlockContentHash()   – ref: H-02
 *   2. computeArtifactHash()       – ref: H-03
 *   3. computeRevisionId()         – derives a revision identifier
 *   4. computeHash()               – low-level sha256 helper
 *
 * Design decisions:
 *   - content_hash includes ONLY semantic fields: { type, text, rationale, terms }
 *     (ref: H-02). Metadata, status, timestamps are excluded.
 *   - revision_hash includes the artifact's canonical representation:
 *     { artifact_id, artifact_type, schema_version, parent_revision_id, sections }
 *     where each block contributes its content_hash (ref: H-03).
 *     ArtifactMetadata is explicitly excluded (ref: §4.1.1).
 *   - All hashing uses stableSerialize (ref: H-01) then SHA-256.
 *   - Hash strings are prefixed with "sha256:" (ref: H-04).
 */


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const HASH_ALGORITHM = "sha256";
const HASH_PREFIX = "sha256:";
// ---------------------------------------------------------------------------
// Low-level helper
// ---------------------------------------------------------------------------
/**
 * Compute SHA-256 of an arbitrary string and return the prefixed hex digest.
 */
function computeHash(input) {
    const digest = (0,external_node_crypto_namespaceObject.createHash)(HASH_ALGORITHM).update(input, "utf8").digest("hex");
    return `${HASH_PREFIX}${digest}`;
}
// ---------------------------------------------------------------------------
// Block content hash  – ref: H-02
// ---------------------------------------------------------------------------
/**
 * Extract the semantic-only fields from a CommitmentBlock.
 *
 * ref: H-02 – content_hash input is { type, text, rationale, terms }.
 * Everything else (block_id, status, content_hash itself, timestamps) is excluded.
 */
function extractContentHashInput(block) {
    const input = {
        type: block.type,
        text: block.text,
    };
    // Only include optional fields when they are defined.
    // undefined values are omitted by stableSerialize, but being explicit
    // makes the hash boundary clear and testable.
    if (block.rationale !== undefined) {
        input.rationale = block.rationale;
    }
    if (block.terms !== undefined) {
        input.terms = block.terms;
    }
    return input;
}
/**
 * Compute the content_hash for a CommitmentBlock.
 *
 * ref: H-02
 * This hash changes if and only if { type, text, rationale, terms } changes.
 */
function computeBlockContentHash(block) {
    const semanticPayload = extractContentHashInput(block);
    return computeHash(stableSerialize(semanticPayload));
}
// ---------------------------------------------------------------------------
// Artifact / revision hash  – ref: H-03
// ---------------------------------------------------------------------------
/**
 * Build the canonical representation of an artifact for revision hashing.
 *
 * ref: H-03 – includes artifact_id, artifact_type, schema_version,
 * parent_revision_id, and sections with blocks (using content_hashes).
 * ArtifactMetadata is excluded (ref: §4.1.1).
 */
function extractRevisionHashInput(artifact) {
    return {
        artifact_id: artifact.artifact_id,
        artifact_type: artifact.artifact_type,
        schema_version: artifact.schema_version,
        parent_revision_id: artifact.parent_revision_id ?? null,
        sections: artifact.sections.map((s) => ({
            section_id: s.section_id,
            title: s.title,
            commitments: s.commitments.map((b) => ({
                block_id: b.block_id,
                content_hash: b.content_hash,
            })),
        })),
    };
}
/**
 * Compute the artifact-level hash for a given revision state.
 *
 * ref: H-03
 * This hash changes if any structural or semantic content changes,
 * but is immune to metadata, timestamps, and UI state.
 */
function computeArtifactHash(artifact) {
    const payload = extractRevisionHashInput(artifact);
    return computeHash(stableSerialize(payload));
}
/**
 * Compute a revision_id for a given artifact state.
 *
 * The revision_id is derived from the artifact hash so that identical
 * artifact content always yields the same revision identifier.
 *
 * Format: "rev_<first12chars_of_hex_digest>"
 */
function computeRevisionId(artifact) {
    const artifactHash = computeArtifactHash(artifact);
    // Strip the "sha256:" prefix, take first 12 hex characters.
    const hexDigest = artifactHash.slice(HASH_PREFIX.length);
    return `rev_${hexDigest.slice(0, 12)}`;
}
// ---------------------------------------------------------------------------
// Hash metadata helper  – ref: H-04
// ---------------------------------------------------------------------------
/**
 * Returns the hash metadata record that must be stored with every revision.
 * ref: H-04
 */
function getHashMeta() {
    return {
        hash_algorithm: HASH_ALGORITHM,
        serialization_version: SERIALIZATION_VERSION,
    };
}

;// CONCATENATED MODULE: ./src/repoObservation/observationHasher.ts
/**
 * P20a: Observation Hash
 *
 * Computes a deterministic hash over the full observation content.
 * Excludes: scanned_at, absolute repo_root, meta.observation_hash.
 * Includes: scanner_version, limits, observations, unknowns, excluded,
 *           meta.partial_scan, meta.file_count, meta.unknown_count,
 *           meta.excluded_count, repo_state, head_commit_hash,
 *           has_uncommitted_changes, uncommitted_file_count.
 *
 * All arrays sorted before hash for order-independence.
 */


/**
 * Compute the observation hash for a set of repo observations.
 *
 * The hash is deterministic: identical observations produce identical hashes
 * regardless of array ordering, absolute repo root, or scan timestamp.
 */
function computeObservationHash(obs) {
    const payload = buildHashPayload(obs);
    return computeHash(stableSerialize_stableSerialize(payload));
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function buildHashPayload(obs) {
    return {
        schema_version: obs.schema_version,
        // Repo identity (without absolute path or timestamp)
        repo_state: obs.repo.repo_state,
        head_commit_hash: obs.repo.head_commit_hash,
        has_uncommitted_changes: obs.repo.has_uncommitted_changes,
        uncommitted_file_count: obs.repo.uncommitted_file_count,
        // Scanner config
        scanner_version: obs.scanner.scanner_version,
        limits: obs.limits,
        // Observations (all arrays sorted)
        files: sortBy([...obs.observations.files], f => f.path),
        path_buckets: sortBy([...obs.observations.path_buckets].map(b => ({
            ...b,
            paths: [...b.paths].sort(),
        })), b => b.bucket),
        import_edges: sortBy([...obs.observations.import_edges], e => `${e.from_file}\0${e.raw_specifier}\0${e.import_kind}`),
        test_mappings: sortBy([...obs.observations.test_mappings], m => `${m.source_path}\0${m.test_path}`),
        sensitive_paths: sortBy([...obs.observations.sensitive_paths], s => `${s.path}\0${s.reason}`),
        owner_hints: sortBy([...obs.observations.owner_hints], h => `${h.path_pattern}\0${h.owners.join(",")}`),
        config_hints: sortBy([...obs.observations.config_hints], c => c.config_path),
        package_manifests: sortBy([...obs.observations.package_manifests], m => m.package_json_path),
        // Unknowns (all arrays sorted)
        unknowns: sortUnknowns(obs.unknowns),
        // Excluded (sorted)
        excluded: sortBy([...obs.excluded], e => `${e.path}\0${e.reason}`),
        // Quality
        quality: obs.quality,
        // Meta (excluding observation_hash itself)
        partial_scan: obs.meta.partial_scan,
        file_count: obs.meta.file_count,
        unknown_count: obs.meta.unknown_count,
        excluded_count: obs.meta.excluded_count,
    };
}
function sortUnknowns(u) {
    return {
        skipped_large_files: [...u.skipped_large_files].sort(),
        unsupported_files: [...u.unsupported_files].sort(),
        dynamic_imports: [...u.dynamic_imports].sort(),
        unresolved_imports: [...u.unresolved_imports].sort(),
        unmapped_sources: [...u.unmapped_sources].sort(),
        unmapped_tests: [...u.unmapped_tests].sort(),
        ambiguous_test_mappings: [...u.ambiguous_test_mappings].sort(),
        scan_limit_exceeded: [...u.scan_limit_exceeded].sort(),
        owner_patterns_unresolved: [...u.owner_patterns_unresolved].sort(),
        changed_files_not_observed: [...u.changed_files_not_observed].sort(),
    };
}
function sortBy(arr, keyFn) {
    return arr.sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

;// CONCATENATED MODULE: external "node:module"
const external_node_module_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:module");
;// CONCATENATED MODULE: ./src/repoObservation/packageDependencyClassifier.ts
/**
 * P20a.2: Package Dependency Classifier
 *
 * Classifies package imports using package.json manifests and Node builtins.
 * Replaces the brittle WELLKNOWN_PACKAGES list with ground-truth resolution.
 *
 * Resolution order:
 *   1. node: prefix or builtin module → builtin_node_package
 *   2. Declared in any package.json dep group → declared_package
 *   3. package.json exists but not declared → undeclared_package
 *   4. No package.json found → unknown_package
 */

// ---------------------------------------------------------------------------
// Node builtins set (includes both "fs" and "node:fs" forms)
// ---------------------------------------------------------------------------
const NODE_BUILTINS = new Set([
    ...external_node_module_namespaceObject.builtinModules,
    ...external_node_module_namespaceObject.builtinModules.map(m => `node:${m}`),
]);
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Classify a package import specifier against known package manifests.
 *
 * Only call this for non-relative, non-dynamic specifiers.
 */
function classifyPackageImport(input) {
    const { rawSpecifier, packageManifests } = input;
    // 1. Node builtin
    if (isNodeBuiltin(rawSpecifier)) {
        return "builtin_node_package";
    }
    // 2. Extract package name root
    const packageName = extractPackageName(rawSpecifier);
    if (!packageName) {
        return "unknown_package";
    }
    // 3. No manifests → unknown
    if (packageManifests.length === 0) {
        return "unknown_package";
    }
    // 4. Check all manifests
    for (const manifest of packageManifests) {
        if (isDeclaredIn(packageName, manifest)) {
            return "declared_package";
        }
    }
    // 5. Manifests exist but package not declared
    return "undeclared_package";
}
/**
 * Check if a specifier is a Node.js builtin module.
 */
function isNodeBuiltin(specifier) {
    // node: prefix
    if (specifier.startsWith("node:"))
        return true;
    // Bare builtin name
    return NODE_BUILTINS.has(specifier);
}
/**
 * Extract the root package name from an import specifier.
 *
 * Examples:
 *   "lodash/fp"           → "lodash"
 *   "@scope/pkg/sub"      → "@scope/pkg"
 *   "zod"                 → "zod"
 *   "@scope/pkg"          → "@scope/pkg"
 *   "./relative"          → null (not a package)
 */
function extractPackageName(specifier) {
    // Relative path — not a package
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return null;
    }
    // node: prefix — builtin, not a package
    if (specifier.startsWith("node:")) {
        return null;
    }
    // Scoped package: @scope/pkg or @scope/pkg/subpath
    if (specifier.startsWith("@")) {
        const parts = specifier.split("/");
        if (parts.length >= 2) {
            return `${parts[0]}/${parts[1]}`;
        }
        return null; // Malformed scoped package
    }
    // Bare package: pkg or pkg/subpath
    const slashIdx = specifier.indexOf("/");
    if (slashIdx === -1) {
        return specifier;
    }
    return specifier.substring(0, slashIdx);
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function isDeclaredIn(packageName, manifest) {
    return (manifest.dependencies.includes(packageName) ||
        manifest.dev_dependencies.includes(packageName) ||
        manifest.peer_dependencies.includes(packageName) ||
        manifest.optional_dependencies.includes(packageName));
}

;// CONCATENATED MODULE: ./src/repoObservation/observationQuality.ts
/**
 * P20a.2: Observation Quality Metrics
 *
 * Computes quality metrics and unknown taxonomy from repo observations.
 * Splits unknowns into three categories:
 *   - out_of_scope: unsupported files/languages (scanner can't help)
 *   - actionable: unmapped sources, undeclared packages (user can fix)
 *   - intrinsic: dynamic imports, large files (deterministic scanner limit)
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Compute quality metrics from observations.
 * Call after unknowns are populated but before hash computation.
 */
function computeObservationQuality(obs) {
    const taxonomy = computeUnknownTaxonomy(obs);
    const fileCount = obs.meta.file_count || 1; // avoid division by zero
    const outOfScopeCount = taxonomy.out_of_scope.unsupported_files.length;
    const actionableCount = taxonomy.actionable.unmapped_sources.length +
        taxonomy.actionable.unmapped_tests.length +
        taxonomy.actionable.undeclared_packages.length +
        taxonomy.actionable.unresolved_aliases.length +
        taxonomy.actionable.unknown_packages.length +
        taxonomy.actionable.owner_patterns_unresolved.length;
    const intrinsicCount = taxonomy.intrinsic.dynamic_imports.length +
        taxonomy.intrinsic.skipped_large_files.length +
        taxonomy.intrinsic.scan_limit_exceeded.length;
    const rawUnknownCount = obs.meta.unknown_count;
    // Undeclared packages: count import edges with undeclared_package status
    const undeclaredPackageCount = obs.observations.import_edges.filter(e => e.resolution_status === "undeclared_package").length;
    // Unknown bucket files
    const unknownBucketFileCount = obs.observations.files.filter(f => f.bucket === "unknown").length;
    return {
        raw_unknown_count: rawUnknownCount,
        raw_unknown_ratio: rawUnknownCount / fileCount,
        out_of_scope_count: outOfScopeCount,
        out_of_scope_ratio: outOfScopeCount / fileCount,
        actionable_count: actionableCount,
        actionable_ratio: actionableCount / fileCount,
        intrinsic_count: intrinsicCount,
        intrinsic_ratio: intrinsicCount / fileCount,
        unknown_bucket_file_count: unknownBucketFileCount,
        undeclared_package_count: undeclaredPackageCount,
        taxonomy,
    };
}
/**
 * Generate operator-facing recommendations based on quality metrics.
 */
function generateObservationRecommendations(input) {
    const { quality } = input;
    const recs = [];
    if (quality.taxonomy.actionable.unmapped_sources.length > 0) {
        recs.push(`Add test_mapping_overrides in pantheon.json for ${quality.taxonomy.actionable.unmapped_sources.length} unmapped source file(s).`);
    }
    if (quality.taxonomy.actionable.unmapped_tests.length > 0) {
        recs.push(`Review ${quality.taxonomy.actionable.unmapped_tests.length} unmapped test file(s): rename to follow convention or add test_mapping_overrides.`);
    }
    if (quality.taxonomy.actionable.undeclared_packages.length > 0) {
        recs.push(`Add ${quality.taxonomy.actionable.undeclared_packages.length} undeclared package(s) to package.json or review import usage.`);
    }
    if (quality.taxonomy.actionable.unknown_packages.length > 0) {
        recs.push(`${quality.taxonomy.actionable.unknown_packages.length} package(s) could not be classified (no package.json found). Ensure package.json exists.`);
    }
    if (quality.unknown_bucket_file_count > 0) {
        recs.push(`Add path_roles in pantheon.json for ${quality.unknown_bucket_file_count} file(s) in the 'unknown' bucket.`);
    }
    if (quality.taxonomy.out_of_scope.unsupported_files.length > 0) {
        recs.push(`${quality.taxonomy.out_of_scope.unsupported_files.length} file(s) use unsupported languages. Add language support only if they are in governance scope.`);
    }
    if (quality.taxonomy.intrinsic.dynamic_imports.length > 0) {
        recs.push(`Review ${quality.taxonomy.intrinsic.dynamic_imports.length} dynamic import(s) manually; deterministic scanner cannot resolve them.`);
    }
    return recs;
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function computeUnknownTaxonomy(obs) {
    // Undeclared packages from import edges
    const undeclaredPackages = new Set();
    const unknownPackages = new Set();
    for (const edge of obs.observations.import_edges) {
        if (edge.resolution_status === "undeclared_package") {
            undeclaredPackages.add(`${edge.from_file}:${edge.raw_specifier}`);
        }
        if (edge.resolution_status === "unknown_package") {
            unknownPackages.add(`${edge.from_file}:${edge.raw_specifier}`);
        }
    }
    // Unresolved aliases from import edges
    const unresolvedAliases = obs.observations.import_edges
        .filter(e => e.resolution_status === "unresolved_alias")
        .map(e => `${e.from_file}:${e.raw_specifier}`);
    return {
        out_of_scope: {
            unsupported_files: [...obs.unknowns.unsupported_files],
        },
        actionable: {
            unmapped_sources: [...obs.unknowns.unmapped_sources],
            unmapped_tests: [...obs.unknowns.unmapped_tests],
            undeclared_packages: [...undeclaredPackages],
            unresolved_aliases: unresolvedAliases,
            unknown_packages: [...unknownPackages],
            owner_patterns_unresolved: [...obs.unknowns.owner_patterns_unresolved],
        },
        intrinsic: {
            dynamic_imports: [...obs.unknowns.dynamic_imports],
            skipped_large_files: [...obs.unknowns.skipped_large_files],
            scan_limit_exceeded: [...obs.unknowns.scan_limit_exceeded],
        },
    };
}

;// CONCATENATED MODULE: ./src/repoObservation/repoScanner.ts
/**
 * P20a.2: Repo Scanner Orchestrator
 *
 * Enumerates files, applies limits/exclusions, calls all sub-modules,
 * classifies package imports via manifests, computes quality metrics,
 * collects git status, computes observation hash.
 */













const SCANNER_VERSION = "0.2.0";
const ANALYZABLE_LANGUAGES = new Set(["typescript", "javascript"]);
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function scanRepo(input) {
    const limits = resolveLimits(input.config?.limits);
    // Merge config excluded_dirs with default
    const configExcludedDirs = input.config?.excluded_dirs ?? [];
    const allExcludedDirs = [...limits.excluded_dirs, ...configExcludedDirs];
    const excludedDirSet = new Set(allExcludedDirs.map(d => d.toLowerCase()));
    // Config path roles (exact prefix match)
    const pathRoles = input.config?.path_roles ?? {};
    // 1. Enumerate files
    const { observedFiles, excludedPaths } = enumerateFiles(input.repoRoot, input.repoRoot, excludedDirSet, limits);
    // 2. Classify + detect language (with config path_roles override)
    const files = observedFiles.map(f => classifyObservedFile(f, limits, pathRoles));
    // 3. Extract package manifests
    const packageManifests = collectPackageManifests(input.repoRoot, files);
    // 4. Extract imports from analyzable files
    const rawImportEdges = [];
    const dynamicImports = [];
    for (const file of files) {
        if (file.analysis_status !== "analyzed" || !ANALYZABLE_LANGUAGES.has(file.language))
            continue;
        try {
            const content = (0,external_node_fs_.readFileSync)((0,external_node_path_.join)(input.repoRoot, file.path), "utf-8");
            const extracted = extractImportsFromFile({ path: file.path, content });
            rawImportEdges.push(...extracted.import_edges);
            dynamicImports.push(...extracted.unknowns.dynamic_imports);
        }
        catch {
            // File read error — skip silently, still recorded in files
        }
    }
    // 5. Reclassify import edges through package dependency classifier
    const allImportEdges = reclassifyImportEdges(rawImportEdges, packageManifests);
    // Compute unresolved imports after reclassification
    const unresolvedImports = allImportEdges
        .filter(e => e.resolution_status === "unresolved_package" || e.resolution_status === "unresolved_alias")
        .map(e => `${e.from_file}:${e.raw_specifier}`);
    // 6. Test mappings (with config overrides)
    const testMappingOverrides = input.config?.test_mapping_overrides ?? {};
    const testResult = inferTestMappings({ files, overrides: testMappingOverrides });
    // 7. Sensitive paths
    const sensitivePaths = detectSensitivePaths(files);
    // 8. CODEOWNERS
    const codeownersResult = parseCodeowners(input.repoRoot);
    // 9. Config hints
    const configHints = collectConfigHints(input.repoRoot, files);
    // 10. Path buckets
    const pathBuckets = buildPathBuckets(files);
    // 11. Git status
    const repoMeta = detectGitStatus(input.repoRoot);
    // 12. Build unknowns
    const unknowns = {
        skipped_large_files: files.filter(f => f.analysis_status === "skipped_large_file").map(f => f.path),
        unsupported_files: files.filter(f => f.analysis_status === "unsupported_language").map(f => f.path),
        dynamic_imports: dynamicImports,
        unresolved_imports: unresolvedImports,
        unmapped_sources: testResult.unmapped_sources,
        unmapped_tests: testResult.unmapped_tests,
        ambiguous_test_mappings: testResult.ambiguous_test_mappings,
        scan_limit_exceeded: excludedPaths
            .filter(e => e.reason === "max_file_limit" || e.reason === "scanner_timeout")
            .map(e => e.path),
        owner_patterns_unresolved: codeownersResult.unresolved_patterns,
        changed_files_not_observed: [],
    };
    const unknownCount = unknowns.skipped_large_files.length + unknowns.unsupported_files.length +
        unknowns.dynamic_imports.length + unknowns.unresolved_imports.length +
        unknowns.unmapped_sources.length + unknowns.unmapped_tests.length +
        unknowns.ambiguous_test_mappings.length + unknowns.scan_limit_exceeded.length +
        unknowns.owner_patterns_unresolved.length;
    const partialScan = excludedPaths.some(e => e.reason === "max_file_limit" || e.reason === "scanner_timeout");
    // 13. Build observations (without hash and quality)
    const preQualityObs = {
        schema_version: "repo_observations.v1",
        repo: repoMeta,
        scanner: {
            scanner_version: SCANNER_VERSION,
            mode: "deterministic",
            language_targets: ["typescript", "javascript"],
            llm_used: false,
        },
        limits,
        observations: {
            files,
            path_buckets: pathBuckets,
            import_edges: allImportEdges,
            test_mappings: testResult.test_mappings,
            sensitive_paths: sensitivePaths,
            owner_hints: codeownersResult.owner_hints,
            config_hints: configHints,
            package_manifests: packageManifests,
        },
        unknowns,
        excluded: excludedPaths,
        quality: null, // placeholder
        meta: {
            observation_hash: "", // computed below
            partial_scan: partialScan,
            file_count: files.length,
            unknown_count: unknownCount,
            excluded_count: excludedPaths.length,
        },
    };
    // 14. Compute quality
    const quality = computeObservationQuality(preQualityObs);
    const withQuality = { ...preQualityObs, quality };
    // 15. Compute hash
    const hash = computeObservationHash(withQuality);
    return { ...withQuality, meta: { ...withQuality.meta, observation_hash: hash } };
}
function enumerateFiles(dir, repoRoot, excludedDirs, limits) {
    const observed = [];
    const excluded = [];
    function walk(current) {
        if (observed.length >= limits.max_total_files)
            return;
        let entries;
        try {
            entries = (0,external_node_fs_.readdirSync)(current);
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (observed.length >= limits.max_total_files) {
                excluded.push({
                    path: normalizeRepoRelativePath((0,external_node_path_.relative)(repoRoot, (0,external_node_path_.join)(current, entry))),
                    reason: "max_file_limit",
                    evidence: [{ type: "scanner_limit", source_path: "", value: `max_total_files=${limits.max_total_files}` }],
                });
                break;
            }
            const fullPath = (0,external_node_path_.join)(current, entry);
            let stat;
            try {
                stat = (0,external_node_fs_.statSync)(fullPath);
            }
            catch {
                continue;
            }
            if (stat.isDirectory()) {
                if (excludedDirs.has(entry.toLowerCase())) {
                    excluded.push({
                        path: normalizeRepoRelativePath((0,external_node_path_.relative)(repoRoot, fullPath)),
                        reason: "excluded_dir",
                        evidence: [{ type: "path", source_path: (0,external_node_path_.relative)(repoRoot, fullPath).replace(/\\/g, "/"), value: `excluded dir: ${entry}` }],
                    });
                    continue;
                }
                walk(fullPath);
            }
            else if (stat.isFile()) {
                const relPath = normalizeRepoRelativePath((0,external_node_path_.relative)(repoRoot, fullPath));
                observed.push({ path: relPath, size_bytes: stat.size });
            }
        }
    }
    walk(repoRoot);
    return { observedFiles: observed, excludedPaths: excluded };
}
function classifyObservedFile(raw, limits, pathRoles = {}) {
    // Config path_roles override: exact prefix match
    let bucket;
    let overridePrefix;
    for (const [prefix, role] of Object.entries(pathRoles)) {
        if (raw.path.startsWith(prefix + "/") || raw.path === prefix) {
            bucket = role;
            overridePrefix = prefix;
            break;
        }
    }
    if (!bucket) {
        bucket = classifyFile(raw.path);
    }
    const language = detectLanguage(raw.path);
    let analysisStatus;
    const evidence = [{ type: "path", source_path: raw.path, value: `bucket=${bucket}` }];
    // Record config provenance when a path_roles override changed the bucket
    if (overridePrefix !== undefined) {
        evidence.push({ type: "config", source_path: "pantheon.json", value: `path_roles.${overridePrefix}=${bucket}` });
    }
    if (raw.size_bytes > limits.max_file_bytes) {
        analysisStatus = "skipped_large_file";
        evidence.push({ type: "scanner_limit", source_path: raw.path, value: `size=${raw.size_bytes} > max=${limits.max_file_bytes}` });
    }
    else if (!ANALYZABLE_LANGUAGES.has(language) && language !== "json" && language !== "yaml" && language !== "markdown") {
        analysisStatus = "unsupported_language";
    }
    else {
        analysisStatus = "analyzed";
    }
    return { path: raw.path, bucket, language, size_bytes: raw.size_bytes, analysis_status: analysisStatus, evidence };
}
function reclassifyImportEdges(edges, packageManifests) {
    return edges.map(edge => {
        // Only reclassify unresolved_package edges — leave relative, builtin, dynamic, alias untouched
        if (edge.resolution_status !== "unresolved_package") {
            return edge;
        }
        const newStatus = classifyPackageImport({
            rawSpecifier: edge.raw_specifier,
            packageManifests,
        });
        return { ...edge, resolution_status: newStatus };
    });
}
function collectPackageManifests(repoRoot, _files) {
    const manifests = [];
    // Root package.json
    const rootPkgPath = (0,external_node_path_.join)(repoRoot, "package.json");
    if ((0,external_node_fs_.existsSync)(rootPkgPath)) {
        try {
            const content = JSON.parse((0,external_node_fs_.readFileSync)(rootPkgPath, "utf-8"));
            manifests.push({
                package_json_path: "package.json",
                package_name: content.name ?? undefined,
                dependencies: Object.keys(content.dependencies ?? {}),
                dev_dependencies: Object.keys(content.devDependencies ?? {}),
                peer_dependencies: Object.keys(content.peerDependencies ?? {}),
                optional_dependencies: Object.keys(content.optionalDependencies ?? {}),
                evidence: [{ type: "config", source_path: "package.json", value: "root package manifest" }],
            });
        }
        catch {
            // JSON parse error — skip
        }
    }
    return manifests;
}
function buildPathBuckets(files) {
    const map = new Map();
    for (const f of files) {
        if (!map.has(f.bucket))
            map.set(f.bucket, []);
        map.get(f.bucket).push(f.path);
    }
    return Array.from(map.entries()).map(([bucket, paths]) => ({
        bucket,
        paths: paths.sort(),
        count: paths.length,
    }));
}
function detectGitStatus(repoRoot) {
    const gitDir = (0,external_node_path_.join)(repoRoot, ".git");
    const isGit = (0,external_node_fs_.existsSync)(gitDir);
    if (!isGit) {
        return {
            repo_root_label: repoRoot.split(/[/\\]/).pop() ?? "repo",
            repo_state: "working_tree_only",
            head_commit_hash: null,
            has_uncommitted_changes: null,
            uncommitted_file_count: null,
            scanned_at: new Date().toISOString(),
        };
    }
    try {
        const headHash = (0,external_node_child_process_.execSync)("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        const statusOutput = (0,external_node_child_process_.execSync)("git status --porcelain", { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        const dirtyFiles = statusOutput ? statusOutput.split("\n").length : 0;
        return {
            repo_root_label: repoRoot.split(/[/\\]/).pop() ?? "repo",
            repo_state: dirtyFiles > 0 ? "git_dirty" : "git_clean",
            head_commit_hash: headHash,
            has_uncommitted_changes: dirtyFiles > 0,
            uncommitted_file_count: dirtyFiles,
            scanned_at: new Date().toISOString(),
        };
    }
    catch {
        return {
            repo_root_label: repoRoot.split(/[/\\]/).pop() ?? "repo",
            repo_state: "working_tree_only",
            head_commit_hash: null,
            has_uncommitted_changes: null,
            uncommitted_file_count: null,
            scanned_at: new Date().toISOString(),
        };
    }
}
function collectConfigHints(repoRoot, files) {
    const hints = [];
    // JSON-based configs
    const JSON_CONFIGS = [
        { path: "package.json", kind: "package_json", fields: ["name", "type", "main", "module"] },
        { path: "tsconfig.json", kind: "tsconfig", fields: ["compilerOptions.target", "compilerOptions.module", "compilerOptions.strict"] },
        { path: "jest.config.json", kind: "jest", fields: ["testEnvironment", "transform", "preset"] },
    ];
    for (const cfg of JSON_CONFIGS) {
        const fullPath = (0,external_node_path_.join)(repoRoot, cfg.path);
        if (!(0,external_node_fs_.existsSync)(fullPath))
            continue;
        try {
            const content = JSON.parse((0,external_node_fs_.readFileSync)(fullPath, "utf-8"));
            const detectedFields = extractJsonFields(content, cfg.fields);
            hints.push({
                config_path: cfg.path,
                kind: cfg.kind,
                detected_fields: detectedFields,
                evidence: [{ type: "config", source_path: cfg.path, value: `config file: ${cfg.kind}` }],
            });
        }
        catch {
            // JSON parse error — skip
        }
    }
    // JS/TS-based configs (presence detection only, no content parsing)
    const SCRIPT_CONFIGS = [
        { paths: ["vitest.config.ts", "vitest.config.js", "vitest.config.mts"], kind: "vitest" },
        { paths: ["jest.config.ts", "jest.config.js", "jest.config.mjs"], kind: "jest" },
        { paths: [".eslintrc.js", ".eslintrc.cjs", "eslint.config.js", "eslint.config.mjs", ".eslintrc.json", ".eslintrc.yml"], kind: "eslint" },
    ];
    for (const cfg of SCRIPT_CONFIGS) {
        for (const p of cfg.paths) {
            const fullPath = (0,external_node_path_.join)(repoRoot, p);
            if (!(0,external_node_fs_.existsSync)(fullPath))
                continue;
            // Already covered by JSON configs?
            if (hints.some(h => h.kind === cfg.kind))
                break;
            hints.push({
                config_path: p,
                kind: cfg.kind,
                detected_fields: [{ field_name: "config_detected", field_value_preview: `${p} exists` }],
                evidence: [{ type: "config", source_path: p, value: `config file: ${cfg.kind}` }],
            });
            break; // only first match
        }
    }
    // GitHub Actions (directory-based)
    const ghActionsDir = (0,external_node_path_.join)(repoRoot, ".github", "workflows");
    if ((0,external_node_fs_.existsSync)(ghActionsDir)) {
        try {
            const workflows = (0,external_node_fs_.readdirSync)(ghActionsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
            if (workflows.length > 0) {
                hints.push({
                    config_path: ".github/workflows",
                    kind: "github_actions",
                    detected_fields: workflows.slice(0, 10).map(w => ({
                        field_name: "workflow",
                        field_value_preview: w.slice(0, 200),
                    })),
                    evidence: [{ type: "config", source_path: ".github/workflows", value: `${workflows.length} workflow(s) detected` }],
                });
            }
        }
        catch {
            // directory read error — skip
        }
    }
    return hints;
}
function extractJsonFields(content, fields) {
    const result = [];
    for (const field of fields) {
        const parts = field.split(".");
        let val = content;
        for (const p of parts) {
            if (val && typeof val === "object" && p in val) {
                val = val[p];
            }
            else {
                val = undefined;
                break;
            }
        }
        if (val !== undefined) {
            const preview = String(val).slice(0, 200);
            result.push({ field_name: field, field_value_preview: preview });
        }
    }
    return result;
}
function resolveLimits(overrides) {
    if (!overrides)
        return { ...DEFAULT_SCAN_LIMITS };
    return {
        max_file_bytes: overrides.max_file_bytes ?? DEFAULT_SCAN_LIMITS.max_file_bytes,
        max_total_files: overrides.max_total_files ?? DEFAULT_SCAN_LIMITS.max_total_files,
        max_import_edges: overrides.max_import_edges ?? DEFAULT_SCAN_LIMITS.max_import_edges,
        scan_timeout_ms: overrides.scan_timeout_ms ?? DEFAULT_SCAN_LIMITS.scan_timeout_ms,
        excluded_dirs: overrides.excluded_dirs ?? [...DEFAULT_SCAN_LIMITS.excluded_dirs],
    };
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonEcosystemPatterns.ts
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
const PYTHON_EXTENSIONS = new Set([".py", ".pyi", ".pyx", ".ipynb"]);
// ---------------------------------------------------------------------------
// Python ecosystem config files (not .py but part of Python projects)
// ---------------------------------------------------------------------------
const PYTHON_ECOSYSTEM_BASENAMES = new Set([
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
const PYTHON_ECOSYSTEM_PREFIXES = [
    "requirements",
];
/**
 * Check if a file path refers to a Python ecosystem file (config/manifest).
 * These are not .py files but are part of the Python project infrastructure.
 */
function isPythonEcosystemFile(path) {
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
function isPythonSourceExtension(path) {
    const lastDot = path.lastIndexOf(".");
    if (lastDot < 0)
        return false;
    return PYTHON_EXTENSIONS.has(path.slice(lastDot).toLowerCase());
}
/**
 * Check if a file is relevant to Python observation (source or ecosystem).
 */
function isPythonRelevantFile(path) {
    return isPythonSourceExtension(path) || isPythonEcosystemFile(path);
}
// ---------------------------------------------------------------------------
// Manifest file detection
// ---------------------------------------------------------------------------
const PYTHON_MANIFEST_BASENAMES = new Set([
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
function isPythonManifestFile(path) {
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
function hasPythonSignals(filePaths) {
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

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonFileClassifier.ts
/**
 * P25a: Python File Classifier
 *
 * Path-based classification for Python files.
 * No content inspection — uses only path patterns and extensions.
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function classifyPythonFile(path, sizeBytes) {
    const ext = extractExtension(path);
    const bucket = classifyPythonBucket(path, ext);
    const evidence = explainClassification(path, ext, bucket);
    return {
        path,
        bucket,
        extension: ext,
        size_bytes: sizeBytes,
        evidence,
    };
}
function isPythonFile(path) {
    return isPythonSourceExtension(path);
}
const PYTHON_BUCKET_RULES = [
    // Generated / excluded (must be early to catch __pycache__ etc)
    { test: p => p.includes("__pycache__/"), bucket: "generated", reason: "Python bytecode cache" },
    { test: p => p.includes(".pytest_cache/"), bucket: "generated", reason: "pytest cache" },
    { test: p => p.includes(".mypy_cache/"), bucket: "generated", reason: "mypy cache" },
    { test: p => p.startsWith("dist/"), bucket: "generated", reason: "Distribution output" },
    { test: p => p.startsWith("build/"), bucket: "generated", reason: "Build output" },
    { test: p => p.includes(".egg-info/"), bucket: "generated", reason: "Egg metadata" },
    // Test files
    { test: p => p.startsWith("tests/") || p.startsWith("test/"), bucket: "test", reason: "Top-level test directory" },
    { test: p => p.includes("/tests/"), bucket: "test", reason: "Nested test directory" },
    { test: p => /\/test_[^/]+\.py$/.test(p), bucket: "test", reason: "test_ prefix convention" },
    { test: p => /_test\.py$/.test(p), bucket: "test", reason: "_test suffix convention" },
    { test: p => /\/conftest\.py$/.test(p) || p === "conftest.py", bucket: "test", reason: "pytest conftest" },
    // Migration
    { test: p => p.includes("/migrations/"), bucket: "migration", reason: "Django/Alembic migration directory" },
    { test: p => p.startsWith("alembic/versions/"), bucket: "migration", reason: "Alembic versions" },
    // Script
    { test: p => p === "manage.py", bucket: "script", reason: "Django manage.py" },
    { test: p => p.startsWith("scripts/"), bucket: "script", reason: "Scripts directory" },
    { test: p => p.startsWith("tools/"), bucket: "script", reason: "Tools directory" },
    { test: p => p.startsWith("bin/"), bucket: "script", reason: "Bin directory" },
    // Config
    { test: p => p === "pyproject.toml" || p === "setup.cfg" || p === "setup.py", bucket: "config", reason: "Project config" },
    { test: p => /^requirements.*\.txt$/.test(p), bucket: "config", reason: "Requirements file" },
    { test: p => p === "tox.ini" || p === "pytest.ini" || p === ".flake8", bucket: "config", reason: "Tool config" },
    { test: p => p === "Pipfile" || p === "Pipfile.lock" || p === "poetry.lock", bucket: "config", reason: "Lock/manifest" },
    { test: p => /settings\.py$/.test(p), bucket: "config", reason: "Settings module" },
    { test: p => p.includes("/settings/") && p.endsWith(".py"), bucket: "config", reason: "Settings package" },
    { test: p => p === ".pre-commit-config.yaml" || p === "mypy.ini", bucket: "config", reason: "Tool config" },
    // Docs
    { test: p => p.startsWith("docs/"), bucket: "docs", reason: "Documentation directory" },
    { test: p => p.endsWith(".rst"), bucket: "docs", reason: "reStructuredText" },
];
function classifyPythonBucket(path, ext) {
    // Special extensions first
    if (ext === ".ipynb")
        return "notebook";
    if (ext === ".pyx")
        return "unsupported";
    // Apply path-based rules for ALL files (catches .toml, .txt, .cfg, .pyc, etc.)
    for (const rule of PYTHON_BUCKET_RULES) {
        if (rule.test(path))
            return rule.bucket;
    }
    // Type stubs default to source
    if (ext === ".pyi")
        return "source";
    // Regular .py files default to source
    if (ext === ".py")
        return "source";
    return "unknown";
}
function explainClassification(path, ext, bucket) {
    if (ext === ".ipynb")
        return ["Jupyter notebook — unsupported for import analysis"];
    if (ext === ".pyx")
        return ["Cython extension — unsupported for import analysis"];
    for (const rule of PYTHON_BUCKET_RULES) {
        if (rule.test(path))
            return [rule.reason];
    }
    if (ext === ".py" && bucket === "source") {
        return ["Default classification: .py file not matching test/config/migration/script patterns"];
    }
    return [];
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractExtension(path) {
    const lastDot = path.lastIndexOf(".");
    if (lastDot < 0)
        return "";
    return path.slice(lastDot).toLowerCase();
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonImportObserver.ts
/**
 * P25a: Python Import Observer
 *
 * Regex-based extraction of Python import statements.
 * Produces syntax-level observations, NOT full runtime import resolution.
 *
 * Supported:
 *   import os
 *   import saleor.checkout
 *   from saleor.checkout import calculations
 *   from .models import Checkout
 *   from ..core import permissions
 *   __import__("x")
 *   importlib.import_module("x")
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function observePythonImports(input) {
    const results = [];
    // Pre-process: join multiline imports into single lines
    const preprocessed = joinMultilineImports(input.content);
    const lines = preprocessed.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (trimmed.startsWith("#") || trimmed.length === 0)
            continue;
        // Dynamic imports
        const dynamicMatch = matchDynamicImport(trimmed);
        if (dynamicMatch) {
            results.push({
                from_file: input.filePath,
                raw_specifier: dynamicMatch.specifier,
                import_kind: "dynamic_import",
                status: "dynamic_or_unresolved",
                top_level_module: dynamicMatch.specifier,
                confidence: "low",
                note: `Dynamic import detected: ${dynamicMatch.pattern}`,
            });
            continue;
        }
        // from X import Y
        const fromMatch = matchFromImport(trimmed);
        if (fromMatch) {
            const status = classifyImport(fromMatch.module, input.projectPackages, input.declaredPackages);
            const topLevel = extractTopLevelModule(fromMatch.module);
            results.push({
                from_file: input.filePath,
                raw_specifier: fromMatch.full,
                import_kind: "from_import",
                status: status.status,
                top_level_module: topLevel,
                confidence: status.confidence,
                note: status.note,
            });
            continue;
        }
        // import X [, Y, Z]
        const importMatch = matchPlainImport(trimmed);
        if (importMatch) {
            for (const mod of importMatch.modules) {
                const status = classifyImport(mod, input.projectPackages, input.declaredPackages);
                const topLevel = extractTopLevelModule(mod);
                results.push({
                    from_file: input.filePath,
                    raw_specifier: mod,
                    import_kind: "import",
                    status: status.status,
                    top_level_module: topLevel,
                    confidence: status.confidence,
                    note: status.note,
                });
            }
        }
    }
    return results;
}
/**
 * Pre-process Python source to join multiline import statements.
 * Handles:
 *   from x import (
 *     a,
 *     b,
 *   )
 * Joins them into: from x import (a, b)
 */
function joinMultilineImports(content) {
    const lines = content.split("\n");
    const result = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        // Detect "from x import (" or "import (" opening
        if (/^(?:from\s+[\w.]+\s+import|import)\s+.*\(\s*$/.test(trimmed)) {
            // Accumulate until closing paren
            let joined = trimmed.replace(/\(\s*$/, "(");
            i++;
            while (i < lines.length) {
                const continuation = lines[i].trim();
                if (continuation.includes(")")) {
                    joined += " " + continuation.replace(/\)\s*$/, ")");
                    break;
                }
                if (continuation.length > 0 && !continuation.startsWith("#")) {
                    joined += " " + continuation;
                }
                i++;
            }
            result.push(joined);
        }
        else {
            result.push(line);
        }
        i++;
    }
    return result.join("\n");
}
/**
 * Detect top-level project package directories by finding dirs with __init__.py.
 */
function detectProjectPackages(observedPaths) {
    const initFiles = new Set();
    for (const p of observedPaths) {
        if (p.endsWith("__init__.py")) {
            const parts = p.split("/");
            if (parts.length === 2) {
                // top-level-dir/__init__.py
                initFiles.add(parts[0]);
            }
        }
    }
    return [...initFiles].sort();
}
// ---------------------------------------------------------------------------
// Import pattern matching
// ---------------------------------------------------------------------------
const FROM_IMPORT_RE = /^from\s+(\.{0,3}[\w.]*)\s+import\s+/;
const PLAIN_IMPORT_RE = /^import\s+([\w.,\s]+)/;
const DUNDER_IMPORT_RE = /__import__\s*\(\s*['"]([^'"]+)['"]\s*\)/;
const IMPORTLIB_RE = /importlib\.import_module\s*\(\s*['"]([^'"]+)['"]\s*\)/;
function matchFromImport(line) {
    const m = FROM_IMPORT_RE.exec(line);
    if (!m)
        return null;
    return { module: m[1], full: line };
}
function matchPlainImport(line) {
    const m = PLAIN_IMPORT_RE.exec(line);
    if (!m)
        return null;
    // Handle "import os, sys, json" and "import saleor.checkout as checkout"
    const raw = m[1];
    const modules = raw.split(",").map(s => {
        // Remove "as alias" suffix
        const asIdx = s.indexOf(" as ");
        return (asIdx >= 0 ? s.slice(0, asIdx) : s).trim();
    }).filter(s => s.length > 0 && /^[\w.]+$/.test(s));
    return modules.length > 0 ? { modules } : null;
}
function matchDynamicImport(line) {
    const d = DUNDER_IMPORT_RE.exec(line);
    if (d)
        return { specifier: d[1], pattern: "__import__" };
    const i = IMPORTLIB_RE.exec(line);
    if (i)
        return { specifier: i[1], pattern: "importlib.import_module" };
    return null;
}
// ---------------------------------------------------------------------------
// Import classification
// ---------------------------------------------------------------------------
function classifyImport(module, projectPackages, declaredPackages) {
    // Relative import
    if (module.startsWith(".")) {
        return {
            status: "relative_import",
            confidence: "medium",
            note: "Relative import observed; full package resolution not attempted",
        };
    }
    const topLevel = extractTopLevelModule(module);
    // Builtin
    if (PYTHON_STDLIB.has(topLevel)) {
        return { status: "builtin_python_package", confidence: "high" };
    }
    // Project package
    for (const pkg of projectPackages) {
        if (topLevel === pkg) {
            return { status: "project_import", confidence: "high" };
        }
    }
    // Declared third-party
    // Normalize: packages use underscores in imports but hyphens in manifests
    const normalized = topLevel.replace(/-/g, "_").toLowerCase();
    if (declaredPackages.has(topLevel) || declaredPackages.has(normalized)) {
        return { status: "declared_package", confidence: "high" };
    }
    // Check if it's a common alias (django → django, graphene → graphene, etc)
    // that might be declared under a different name
    if (declaredPackages.has(topLevel.toLowerCase())) {
        return { status: "declared_package", confidence: "medium" };
    }
    return { status: "undeclared_package", confidence: "low" };
}
function extractTopLevelModule(module) {
    // "saleor.checkout.calculations" → "saleor"
    // ".models" → "."
    if (module.startsWith("."))
        return module;
    const dot = module.indexOf(".");
    return dot >= 0 ? module.slice(0, dot) : module;
}
// ---------------------------------------------------------------------------
// Python standard library (3.10+, ~200 modules)
// ---------------------------------------------------------------------------
const PYTHON_STDLIB = new Set([
    // Core
    "abc", "ast", "asyncio", "atexit", "base64", "bisect", "builtins",
    "calendar", "cgi", "cgitb", "chunk", "cmath", "cmd", "code", "codecs",
    "codeop", "collections", "colorsys", "compileall", "concurrent",
    "configparser", "contextlib", "contextvars", "copy", "copyreg",
    "cProfile", "crypt", "csv", "ctypes", "curses",
    // D-F
    "dataclasses", "datetime", "dbm", "decimal", "difflib", "dis",
    "distutils", "doctest", "email", "encodings", "enum", "errno",
    "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch",
    "formatter", "fractions", "ftplib", "functools",
    // G-I
    "gc", "getopt", "getpass", "gettext", "glob", "grp", "gzip",
    "hashlib", "heapq", "hmac", "html", "http",
    "idlelib", "imaplib", "imghdr", "imp", "importlib", "inspect",
    "io", "ipaddress", "itertools",
    // J-L
    "json", "keyword", "lib2to3", "linecache", "locale", "logging",
    "lzma",
    // M-O
    "mailbox", "mailcap", "marshal", "math", "mimetypes", "mmap",
    "modulefinder", "multiprocessing", "netrc", "nis", "nntplib",
    "numbers", "operator", "optparse", "os", "ossaudiodev",
    // P
    "parser", "pathlib", "pdb", "pickle", "pickletools", "pipes",
    "pkgutil", "platform", "plistlib", "poplib", "posix", "posixpath",
    "pprint", "profile", "pstats", "pty", "pwd", "py_compile",
    "pyclbr", "pydoc",
    // Q-S
    "queue", "quopri", "random", "re", "readline", "reprlib",
    "resource", "rlcompleter", "runpy", "sched", "secrets", "select",
    "selectors", "shelve", "shlex", "shutil", "signal", "site",
    "smtpd", "smtplib", "sndhdr", "socket", "socketserver",
    "sqlite3", "ssl", "stat", "statistics", "string", "stringprep",
    "struct", "subprocess", "sunau", "symtable", "sys", "sysconfig",
    "syslog",
    // T
    "tabnanny", "tarfile", "telnetlib", "tempfile", "termios", "test",
    "textwrap", "threading", "time", "timeit", "tkinter", "token",
    "tokenize", "tomllib", "trace", "traceback", "tracemalloc", "tty",
    "turtle", "turtledemo", "types", "typing",
    // U-Z
    "unicodedata", "unittest", "urllib", "uu", "uuid",
    "venv", "warnings", "wave", "weakref", "webbrowser",
    "winreg", "winsound", "wsgiref",
    "xdrlib", "xml", "xmlrpc",
    "zipapp", "zipfile", "zipimport", "zlib",
    // Common aliases / sub-packages often imported directly
    "_thread", "__future__", "_collections_abc",
]);

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonDependencyExtractor.ts
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
function extractPythonDependencies(input) {
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
function normalizePackageName(name) {
    return name.toLowerCase().replace(/[-_.]+/g, "_").replace(/\[.*\]$/, "");
}
/**
 * Build a lookup set of declared package names from manifests.
 */
function buildDeclaredPackageSet(manifests) {
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

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonTestMapper.ts
/**
 * P25a + P27-1d: Python Test Mapper
 *
 * Maps Python source files to candidate test files using Python conventions.
 * P27-1d: Enhanced with framework-aware candidate generation using
 * layout, framework, and project-role context from P27-1b/1c.
 *
 * Hard rules:
 *   - Does NOT execute tests
 *   - Does NOT generate tests
 *   - Does NOT claim suggested tests are sufficient
 *   - All mappings carry confidence + reason
 *   - High confidence requires path convention + framework context evidence
 */
function mapPythonTests(input) {
    const results = [];
    const context = buildMappingContext(input);
    for (const source of input.sourcePaths) {
        if (!source.endsWith(".py"))
            continue;
        // Skip __init__.py, conftest.py, and non-source
        const basename = source.split("/").pop();
        if (basename === "__init__.py" || basename === "conftest.py")
            continue;
        if (basename.startsWith("test_") || basename.endsWith("_test.py"))
            continue;
        const candidates = generateCandidates(source, context);
        const existing = candidates.filter(c => input.observedPaths.has(c));
        const confidence = assessConfidence(source, candidates, existing, context);
        results.push({
            source_path: source,
            candidate_test_paths: candidates,
            existing_test_paths: existing,
            confidence: confidence.level,
            reason: confidence.reason,
        });
    }
    return results;
}
function buildMappingContext(input) {
    const frameworks = input.frameworkProfile?.framework_signals ?? [];
    const roles = input.frameworkProfile?.project_role_signals ?? [];
    const layout = input.layout;
    const hasFw = (name) => frameworks.some(f => f.name === name);
    const hasRole = (role) => roles.some(r => r.role === role);
    // Detect observed test directory patterns from existing paths
    const testDirPatterns = [];
    const paths = [...input.observedPaths];
    if (paths.some(p => /^tests\/test_[^/]+\.py$/.test(p))) {
        testDirPatterns.push("top_level_tests");
    }
    if (paths.some(p => /^tests\/[^/]+\/[^/]+\/test_[^/]+\.py$/.test(p))) {
        testDirPatterns.push("top_level_tests_domain");
    }
    if (paths.some(p => /^[^/]+\/[^/]+\/tests\/test_[^/]+\.py$/.test(p) || /^[^/]+\/tests\/test_[^/]+\.py$/.test(p))) {
        testDirPatterns.push("sibling_tests");
    }
    if (paths.some(p => /^tests\/[^/]+\/test_[^/]+\.py$/.test(p))) {
        testDirPatterns.push("test_subdirectory");
    }
    return {
        isDjango: hasFw("django"),
        isFastApiService: hasFw("fastapi") || hasRole("service_backend"),
        isLibrary: hasRole("python_sdk_library") || hasRole("http_client_library") || layout?.primary_layout === "library_package",
        isCliApp: hasRole("cli_application") || layout?.primary_layout === "cli_app",
        primaryLayout: layout?.primary_layout ?? "unknown",
        packageLayout: layout?.package_layout ?? "unknown",
        testDirPatterns,
    };
}
// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------
function generateCandidates(sourcePath, ctx) {
    const candidates = [];
    const parts = sourcePath.split("/");
    const filename = parts[parts.length - 1];
    const nameNoExt = filename.replace(/\.py$/, "");
    // Strip leading underscore for library private modules (httpx/_auth.py → auth)
    const cleanName = nameNoExt.startsWith("_") && nameNoExt !== "__init__" && nameNoExt !== "__main__"
        ? nameNoExt.slice(1)
        : nameNoExt;
    // === Django-style patterns (always included for backward compat) ===
    // Pattern 1: Sibling tests/ directory — Django app convention
    // saleor/checkout/actions.py → saleor/checkout/tests/test_actions.py
    if (parts.length >= 2) {
        const dirParts = parts.slice(0, -1);
        candidates.push([...dirParts, "tests", `test_${nameNoExt}.py`].join("/"));
    }
    // Pattern 2: Top-level tests/ mirror
    // saleor/checkout/actions.py → tests/checkout/test_actions.py
    if (parts.length >= 2) {
        const relativeParts = parts.slice(1, -1); // skip top-level package
        candidates.push(["tests", ...relativeParts, `test_${nameNoExt}.py`].join("/"));
    }
    // Pattern 3: Module-level test file
    // saleor/checkout/actions.py → saleor/checkout/tests/test_checkout.py
    if (parts.length >= 2) {
        const dirParts = parts.slice(0, -1);
        const moduleName = dirParts[dirParts.length - 1];
        candidates.push([...dirParts, "tests", `test_${moduleName}.py`].join("/"));
    }
    // Pattern 4: Root test mirror with test_ prefix
    candidates.push(`test/test_${nameNoExt}.py`);
    candidates.push(`tests/test_${nameNoExt}.py`);
    // === P27-1d: Library/SDK patterns ===
    if (ctx.isLibrary) {
        // Library pattern: <package>/_module.py → tests/test_module.py
        // httpx/_auth.py → tests/test_auth.py
        if (cleanName !== nameNoExt) {
            candidates.push(`tests/test_${cleanName}.py`);
            candidates.push(`test/test_${cleanName}.py`);
        }
        // Library pattern: <package>/_module.py → tests/<related>/test_<module>.py
        // httpx/_models.py → tests/models/test_*.py
        if (parts.length >= 2) {
            candidates.push(`tests/${cleanName}/test_${cleanName}.py`);
            // Also try plural/singular
            if (!cleanName.endsWith("s")) {
                candidates.push(`tests/${cleanName}s/test_${cleanName}.py`);
            }
        }
        // Library pattern: <package>/<subpackage>/<module>.py → tests/<subpackage>/test_<module>.py
        // httpx/_transports/asgi.py → tests/test_asgi.py
        if (parts.length >= 3) {
            const subpackage = parts[parts.length - 2];
            const cleanSub = subpackage.startsWith("_") ? subpackage.slice(1) : subpackage;
            candidates.push(`tests/test_${nameNoExt}.py`);
            candidates.push(`tests/${cleanSub}/test_${nameNoExt}.py`);
        }
    }
    // === P27-1d: FastAPI/service patterns ===
    if (ctx.isFastApiService) {
        // Service pattern: app/api/routes/<domain>.py → tests/api/<domain>/test_<domain>_*.py
        // app/api/routes/articles.py → tests/api/articles/test_article_*.py
        if (parts.includes("routes") || parts.includes("api")) {
            const domainName = nameNoExt;
            // Try singular form for test directory
            const singularDomain = domainName.endsWith("s") ? domainName.slice(0, -1) : domainName;
            // tests/api/<domain>/test_<domain>_<action>.py pattern
            candidates.push(`tests/api/${domainName}/test_${singularDomain}_create.py`);
            candidates.push(`tests/api/${domainName}/test_${singularDomain}_get.py`);
            candidates.push(`tests/api/${domainName}/test_${singularDomain}_list.py`);
            candidates.push(`tests/api/${domainName}/test_${singularDomain}_update.py`);
            candidates.push(`tests/api/${domainName}/test_${singularDomain}_delete.py`);
            // Generic test file
            candidates.push(`tests/api/${domainName}/test_${domainName}.py`);
            candidates.push(`tests/api/test_${domainName}.py`);
            candidates.push(`tests/test_${domainName}.py`);
        }
        // Service pattern: app/crud/crud_<entity>.py → tests/test_crud_<entity>.py
        if (parts.includes("crud")) {
            candidates.push(`tests/test_${nameNoExt}.py`);
            candidates.push(`tests/crud/test_${nameNoExt}.py`);
        }
        // Service pattern: app/models/<entity>.py → tests/test_<entity>.py
        if (parts.includes("models") || parts.includes("schemas")) {
            candidates.push(`tests/test_${nameNoExt}.py`);
            candidates.push(`tests/models/test_${nameNoExt}.py`);
            candidates.push(`tests/schemas/test_${nameNoExt}.py`);
        }
        // Service pattern: app/core/<module>.py → tests/test_<module>.py
        if (parts.includes("core") || parts.includes("services")) {
            candidates.push(`tests/test_${nameNoExt}.py`);
            candidates.push(`tests/core/test_${nameNoExt}.py`);
        }
    }
    // === P27-1d: CLI app patterns ===
    if (ctx.isCliApp) {
        candidates.push(`tests/test_cli.py`);
        candidates.push(`tests/test_${nameNoExt}.py`);
    }
    // Deduplicate
    return [...new Set(candidates)];
}
// ---------------------------------------------------------------------------
// Confidence assessment (P27-1d enhanced)
// ---------------------------------------------------------------------------
function assessConfidence(source, candidates, existing, ctx) {
    if (existing.length === 0) {
        if (candidates.length > 0) {
            return { level: "low", reason: "Candidate test paths generated but none exist" };
        }
        return { level: "unknown", reason: "No reasonable test path could be derived" };
    }
    const sourceFilename = source.split("/").pop().replace(/\.py$/, "");
    const cleanSourceName = sourceFilename.startsWith("_") && sourceFilename !== "__init__" && sourceFilename !== "__main__"
        ? sourceFilename.slice(1)
        : sourceFilename;
    for (const ex of existing) {
        const testFilename = ex.split("/").pop().replace(/\.py$/, "");
        // === High confidence: exact match in expected location ===
        // Django/traditional: sibling tests/ dir
        if (testFilename === `test_${sourceFilename}`) {
            const sourceDirParts = source.split("/").slice(0, -1);
            const testDirParts = ex.split("/").slice(0, -1);
            const expectedTestDir = [...sourceDirParts, "tests"].join("/");
            if (testDirParts.join("/") === expectedTestDir) {
                return { level: "high", reason: `Exact match in sibling tests/: ${ex}` };
            }
        }
        // Library: _module → tests/test_module (strip underscore match)
        if (ctx.isLibrary && testFilename === `test_${cleanSourceName}` && ex.startsWith("tests/")) {
            const contextNote = ctx.primaryLayout === "library_package" ? " [library_package layout]" : "";
            return { level: "high", reason: `Library module match: ${ex}${contextNote}` };
        }
        // Service: route domain → tests/api/<domain>/test_<singular>_*.py
        if (ctx.isFastApiService && ex.includes("/api/") && ex.startsWith("tests/")) {
            return { level: "high", reason: `API route domain test match: ${ex} [service_backend context]` };
        }
        // Standard: test_<name> in tests/ root
        if (testFilename === `test_${sourceFilename}` || testFilename === `test_${cleanSourceName}`) {
            if (ex.startsWith("tests/") || ex.startsWith("test/")) {
                const contextNote = ctx.isLibrary ? " [library context]" : ctx.isFastApiService ? " [service context]" : "";
                return { level: "medium", reason: `Name match in tests/ directory: ${ex}${contextNote}` };
            }
            return { level: "medium", reason: `Name match but different directory: ${ex}` };
        }
    }
    // Domain-level match (test_article_create for articles route)
    for (const ex of existing) {
        const testFilename = ex.split("/").pop().replace(/\.py$/, "");
        // Check if test name contains the source module name (partial domain match)
        const singularSource = sourceFilename.endsWith("s") ? sourceFilename.slice(0, -1) : sourceFilename;
        if (testFilename.includes(singularSource) && ex.startsWith("tests/")) {
            return { level: "medium", reason: `Domain test match: ${ex} (contains ${singularSource})` };
        }
    }
    // Module-level match
    return { level: "medium", reason: `Module-level test file found: ${existing[0]}` };
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonSensitiveZoneDetector.ts
/**
 * P25a: Python Sensitive Zone Detector
 *
 * Keyword matching + config overrides for identifying high-risk code areas.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function detectPythonSensitiveZones(input) {
    const results = [];
    // 1. Keyword-based detection
    for (const kw of pythonSensitiveZoneDetector_SENSITIVE_KEYWORDS) {
        const matched = input.pythonPaths.filter(p => matchesKeyword(p, kw.keyword));
        if (matched.length > 0) {
            results.push({
                path_pattern: `**/${kw.keyword}/**`,
                matched_paths: matched,
                category: kw.category,
                severity: kw.severity,
                source: "keyword",
                evidence: [`Keyword "${kw.keyword}" found in ${matched.length} paths`],
            });
        }
    }
    // 2. Config overrides
    if (input.sensitiveOverrides) {
        for (const [pattern, category] of Object.entries(input.sensitiveOverrides)) {
            const matched = input.pythonPaths.filter(p => matchGlob(p, pattern));
            if (matched.length > 0) {
                results.push({
                    path_pattern: pattern,
                    matched_paths: matched,
                    category,
                    severity: "high",
                    source: "config_override",
                    evidence: [`Config override: ${pattern} → ${category}`],
                });
            }
        }
    }
    return deduplicateZones(results);
}
const pythonSensitiveZoneDetector_SENSITIVE_KEYWORDS = [
    // Critical
    { keyword: "payment", category: "financial_transactions", severity: "critical" },
    { keyword: "billing", category: "financial_transactions", severity: "critical" },
    { keyword: "invoice", category: "financial_transactions", severity: "critical" },
    { keyword: "refund", category: "financial_transactions", severity: "critical" },
    // High
    { keyword: "checkout", category: "purchase_flow", severity: "high" },
    { keyword: "order", category: "order_lifecycle", severity: "high" },
    { keyword: "account", category: "identity", severity: "high" },
    { keyword: "auth", category: "authentication", severity: "high" },
    { keyword: "permission", category: "authorization", severity: "high" },
    { keyword: "security", category: "security", severity: "high" },
    { keyword: "admin", category: "administration", severity: "high" },
    { keyword: "migration", category: "schema_migration", severity: "high" },
    // Medium
    { keyword: "discount", category: "pricing_adjustment", severity: "medium" },
    { keyword: "tax", category: "regulatory_calculation", severity: "medium" },
    { keyword: "plugin", category: "runtime_extension", severity: "medium" },
    { keyword: "webhook", category: "external_integration", severity: "medium" },
    { keyword: "settings", category: "infrastructure_config", severity: "medium" },
];
// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------
function matchesKeyword(path, keyword) {
    const lower = path.toLowerCase();
    // Match as directory segment or filename segment
    const segments = lower.split("/");
    return segments.some(seg => seg.includes(keyword));
}
function matchGlob(path, pattern) {
    const regex = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "___DOUBLESTAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/___DOUBLESTAR___/g, ".*");
    return new RegExp(`^${regex}$`).test(path);
}
// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------
function deduplicateZones(zones) {
    // Remove zones whose matched_paths are fully subsumed by a higher-severity zone
    // This prevents "auth" and "account" from producing overlapping results
    const seen = new Map();
    for (const zone of zones) {
        const key = zone.category;
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, zone);
        }
        else {
            // Merge paths
            const mergedPaths = [...new Set([...existing.matched_paths, ...zone.matched_paths])];
            const mergedEvidence = [...existing.evidence, ...zone.evidence];
            seen.set(key, {
                ...existing,
                matched_paths: mergedPaths,
                evidence: mergedEvidence,
                severity: higherSeverity(existing.severity, zone.severity),
            });
        }
    }
    return [...seen.values()];
}
function higherSeverity(a, b) {
    const order = { medium: 0, high: 1, critical: 2 };
    return order[a] >= order[b] ? a : b;
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonUnknownTaxonomy.ts
/**
 * P25a: Python Unknown Taxonomy
 *
 * Classifies Python observation unknowns into specific categories,
 * each tagged as out_of_scope, actionable, or intrinsic.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function buildPythonUnknownTaxonomy(input) {
    const unknowns = [];
    // 1. Unclassified Python files
    const unclassified = input.files.filter(f => f.bucket === "unknown");
    if (unclassified.length > 0) {
        unknowns.push({
            category: "unclassified_python_file",
            classification: "actionable",
            paths: unclassified.map(f => f.path),
            count: unclassified.length,
            note: "Python files that could not be classified into source/test/config/migration/script buckets. May need custom path_roles in pantheon.json.",
        });
    }
    // 2. Dynamic / unresolved imports
    const dynamicImports = input.imports.filter(i => i.status === "dynamic_or_unresolved");
    if (dynamicImports.length > 0) {
        unknowns.push({
            category: "dynamic_or_unresolved_import",
            classification: "intrinsic",
            paths: [...new Set(dynamicImports.map(i => i.from_file))],
            count: dynamicImports.length,
            note: "Imports using __import__(), importlib.import_module(), or computed paths. Cannot be statically resolved — this is inherent to Python.",
        });
    }
    // 3. Unsupported Python artifacts
    const unsupported = input.files.filter(f => f.bucket === "unsupported" || f.bucket === "notebook");
    if (unsupported.length > 0) {
        unknowns.push({
            category: "unsupported_python_artifact",
            classification: "out_of_scope",
            paths: unsupported.map(f => f.path),
            count: unsupported.length,
            note: "Cython (.pyx) and Jupyter notebooks (.ipynb) — import analysis not supported.",
        });
    }
    // 4. Low confidence manifests
    const lowConfManifests = input.manifests.filter(m => m.confidence === "low");
    if (lowConfManifests.length > 0) {
        unknowns.push({
            category: "low_confidence_manifest",
            classification: "actionable",
            paths: lowConfManifests.map(m => m.source_path),
            count: lowConfManifests.length,
            note: "Dependency manifests parsed with low confidence. Package declarations may be incomplete.",
        });
    }
    // 5. Test mapping unknowns
    const unmappedTests = input.testMappings.filter(m => m.confidence === "unknown");
    if (unmappedTests.length > 0) {
        unknowns.push({
            category: "test_mapping_unknown",
            classification: "actionable",
            paths: unmappedTests.map(m => m.source_path),
            count: unmappedTests.length,
            note: "Source files for which no test file could be derived using Python conventions.",
        });
    }
    // 6. Scope granularity limit (always present)
    unknowns.push({
        category: "scope_granularity_limit",
        classification: "intrinsic",
        paths: [],
        count: 0,
        note: "Scope granularity in P25 is file/path-level. Function-level and semantic delta constraints are future work.",
    });
    return unknowns;
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonLayoutClassifier.ts
/**
 * P27-1b: Python Layout Classifier
 *
 * Classifies the physical organization (layout) of a Python repository
 * into two orthogonal dimensions:
 *
 *   1. primary_layout — project form (django_project, api_service, library_package, etc.)
 *   2. package_layout — Python packaging structure (src_layout, flat_package, etc.)
 *
 * Uses only paths, file buckets, and manifest presence — NOT framework role inference.
 * Framework/project-role detection is deferred to P27-1c.
 */
function classifyPythonLayout(input) {
    const signals = [];
    const unknowns = [];
    // Build bucket summary
    const bucketSummary = {};
    for (const f of input.files) {
        bucketSummary[f.bucket] = (bucketSummary[f.bucket] ?? 0) + 1;
    }
    // Collect structural facts
    const facts = extractStructuralFacts(input.allPaths, input.files, input.manifests);
    // Classify package layout (independent of primary layout)
    const { packageLayout, packageSignals, packageUnknowns } = classifyPackageLayout(facts);
    signals.push(...packageSignals);
    unknowns.push(...packageUnknowns);
    // Classify primary layout
    const { primaryLayout, primarySignals, primaryUnknowns } = classifyPrimaryLayout(facts, packageLayout);
    signals.push(...primarySignals);
    unknowns.push(...primaryUnknowns);
    // Compute confidence
    const strongCount = signals.filter(s => s.weight === "strong").length;
    const moderateCount = signals.filter(s => s.weight === "moderate").length;
    const confidence = strongCount >= 2 ? "high" :
        strongCount >= 1 || moderateCount >= 2 ? "medium" :
            "low";
    return {
        primary_layout: primaryLayout,
        package_layout: packageLayout,
        confidence,
        signals,
        unknowns,
        bucket_summary: bucketSummary,
    };
}
function extractStructuralFacts(allPaths, files, manifests) {
    const pathSet = new Set(allPaths);
    // Detect root-level __init__.py packages (flat_package indicator)
    const rootInitPyPackages = [];
    const srcInitPyPackages = [];
    for (const p of allPaths) {
        const match = /^([^/]+)\/__init__\.py$/.exec(p);
        if (match && match[1] !== "tests" && match[1] !== "test" && match[1] !== "docs") {
            rootInitPyPackages.push(match[1]);
        }
        const srcMatch = /^src\/([^/]+)\/__init__\.py$/.exec(p);
        if (srcMatch) {
            srcInitPyPackages.push(srcMatch[1]);
        }
    }
    // Top-level .py files (not inside any subdirectory)
    const topLevelPyFiles = allPaths.filter(p => !p.includes("/") && p.endsWith(".py"));
    // Bucket counts
    const migrationCount = files.filter(f => f.bucket === "migration").length;
    const testCount = files.filter(f => f.bucket === "test").length;
    const sourceCount = files.filter(f => f.bucket === "source").length;
    const totalPyFiles = files.filter(f => f.extension === ".py" || f.extension === ".pyi").length;
    // Test directory pattern
    const hasTopTests = allPaths.some(p => p.startsWith("tests/") || p.startsWith("test/"));
    const hasNestedTests = allPaths.some(p => /^[^/]+\/tests\//.test(p) || /^[^/]+\/test\//.test(p));
    const testDirPattern = hasTopTests && hasNestedTests ? "mixed" :
        hasTopTests ? "top_level" :
            hasNestedTests ? "nested" :
                "none";
    // CLI signals
    const hasCli = allPaths.some(p => p === "cli.py" || p.includes("/cli.py") || p.includes("/cli/") ||
        p === "__main__.py" || p.includes("/__main__.py") ||
        topLevelPyFiles.includes("__main__.py"));
    // Data pipeline signals (paths only, not imports)
    const hasDataPipeline = allPaths.some(p => p.includes("/pipelines/") || p.includes("/pipeline/") ||
        p.includes("/dags/") || p.includes("/etl/") ||
        p.includes("/data/") && p.endsWith(".py"));
    // ML signals (paths only)
    const hasMLSignals = allPaths.some(p => p.includes("/models/") && (p.includes("train") || p.includes("predict") || p.includes("infer")) ||
        p.includes("/notebooks/") || p.includes("/experiments/"));
    return {
        hasSrcDir: allPaths.some(p => p.startsWith("src/")),
        hasManagePy: pathSet.has("manage.py"),
        hasAppDir: allPaths.some(p => p.startsWith("app/") && p.endsWith(".py")),
        hasAlembicDir: allPaths.some(p => p.startsWith("alembic/")),
        hasDjangoMigrations: allPaths.some(p => p.includes("/migrations/") && p.endsWith(".py")),
        hasSetupPyOrCfg: pathSet.has("setup.py") || pathSet.has("setup.cfg"),
        hasPyprojectToml: pathSet.has("pyproject.toml"),
        hasPyTyped: allPaths.some(p => p.endsWith("/py.typed") || p === "py.typed"),
        hasDocDir: allPaths.some(p => p.startsWith("docs/")),
        hasNotebooks: files.some(f => f.bucket === "notebook" || f.extension === ".ipynb"),
        hasConftest: pathSet.has("conftest.py") || allPaths.some(p => p.endsWith("/conftest.py")),
        rootInitPyPackages,
        srcInitPyPackages,
        topLevelPyFiles,
        migrationCount,
        testCount,
        sourceCount,
        totalPyFiles,
        testDirPattern,
        hasMultipleTopPackages: rootInitPyPackages.length > 1,
        hasCli,
        hasDataPipeline,
        hasMLSignals,
    };
}
// ---------------------------------------------------------------------------
// Package layout classification
// ---------------------------------------------------------------------------
function classifyPackageLayout(facts) {
    const signals = [];
    const unknowns = [];
    // src layout: src/<package>/__init__.py
    if (facts.hasSrcDir && facts.srcInitPyPackages.length > 0) {
        signals.push({
            signal: "src_layout_detected",
            weight: "strong",
            evidence: `src/ directory with package(s): ${facts.srcInitPyPackages.join(", ")}`,
        });
        return { packageLayout: "src_layout", packageSignals: signals, packageUnknowns: unknowns };
    }
    // Django app layout: multiple top-level packages with migrations
    if (facts.hasDjangoMigrations && facts.hasManagePy && facts.rootInitPyPackages.length >= 1) {
        signals.push({
            signal: "django_app_layout_detected",
            weight: "strong",
            evidence: `Django manage.py + migrations + packages: ${facts.rootInitPyPackages.join(", ")}`,
        });
        return { packageLayout: "django_app_layout", packageSignals: signals, packageUnknowns: unknowns };
    }
    // Flat package: single or multiple top-level __init__.py packages
    if (facts.rootInitPyPackages.length >= 1) {
        signals.push({
            signal: "flat_package_detected",
            weight: "strong",
            evidence: `Root-level package(s) with __init__.py: ${facts.rootInitPyPackages.join(", ")}`,
        });
        return { packageLayout: "flat_package", packageSignals: signals, packageUnknowns: unknowns };
    }
    // app/ directory without __init__.py at root — common in FastAPI/Flask service layouts
    if (facts.hasAppDir) {
        signals.push({
            signal: "app_directory_layout",
            weight: "moderate",
            evidence: "app/ directory with Python files (service-style layout)",
        });
        return { packageLayout: "flat_package", packageSignals: signals, packageUnknowns: unknowns };
    }
    // Only top-level .py files, no package structure
    if (facts.topLevelPyFiles.length > 0 && facts.rootInitPyPackages.length === 0) {
        signals.push({
            signal: "loose_scripts_only",
            weight: "weak",
            evidence: `${facts.topLevelPyFiles.length} top-level .py files without package __init__.py`,
        });
        unknowns.push({
            aspect: "package_layout",
            reason: "No package structure detected; only loose scripts",
        });
        return { packageLayout: "unknown", packageSignals: signals, packageUnknowns: unknowns };
    }
    unknowns.push({
        aspect: "package_layout",
        reason: "Unable to determine package layout from file paths",
    });
    return { packageLayout: "unknown", packageSignals: signals, packageUnknowns: unknowns };
}
// ---------------------------------------------------------------------------
// Primary layout classification
// ---------------------------------------------------------------------------
function classifyPrimaryLayout(facts, packageLayout) {
    const signals = [];
    const unknowns = [];
    // Score-based: accumulate evidence for each candidate
    const scores = {
        django_project: 0,
        api_service: 0,
        library_package: 0,
        cli_app: 0,
        data_pipeline: 0,
        ml_project: 0,
        monorepo: 0,
        mixed: 0,
        unknown: 0,
    };
    // --- Django project signals ---
    if (facts.hasManagePy) {
        scores.django_project += 3;
        signals.push({ signal: "manage_py_found", weight: "strong", evidence: "manage.py in repo root" });
    }
    if (facts.hasDjangoMigrations) {
        scores.django_project += 2;
        signals.push({ signal: "django_migrations_found", weight: "moderate", evidence: `${facts.migrationCount} migration files` });
    }
    if (packageLayout === "django_app_layout") {
        scores.django_project += 2;
    }
    // --- API service signals ---
    if (facts.hasAppDir && !facts.hasManagePy) {
        scores.api_service += 2;
        signals.push({ signal: "app_dir_without_manage_py", weight: "moderate", evidence: "app/ directory without Django manage.py" });
    }
    if (facts.hasAlembicDir) {
        scores.api_service += 1;
        signals.push({ signal: "alembic_dir_found", weight: "moderate", evidence: "alembic/ migration directory (non-Django)" });
    }
    // --- Library package signals ---
    if (facts.hasPyTyped) {
        scores.library_package += 2;
        signals.push({ signal: "py_typed_marker", weight: "strong", evidence: "py.typed marker file (PEP 561 typed package)" });
    }
    if (facts.hasSetupPyOrCfg || facts.hasPyprojectToml) {
        // Having packaging config is necessary but not sufficient for library
        if (!facts.hasManagePy && !facts.hasAppDir && !facts.hasDjangoMigrations) {
            scores.library_package += 1;
            signals.push({ signal: "packaging_config_no_framework", weight: "weak", evidence: "Packaging config present without framework indicators" });
        }
    }
    if (facts.hasDocDir && !facts.hasManagePy) {
        scores.library_package += 1;
        signals.push({ signal: "docs_directory", weight: "weak", evidence: "docs/ directory suggests library documentation" });
    }
    if (facts.testDirPattern === "top_level" && !facts.hasManagePy && !facts.hasAppDir) {
        scores.library_package += 1;
        signals.push({ signal: "top_level_tests_pattern", weight: "weak", evidence: "Top-level tests/ directory typical of library packages" });
    }
    // Single root package with py.typed = very likely library
    if (facts.rootInitPyPackages.length === 1 && facts.hasPyTyped) {
        scores.library_package += 2;
    }
    // --- CLI app signals ---
    if (facts.hasCli) {
        scores.cli_app += 2;
        signals.push({ signal: "cli_entry_point", weight: "moderate", evidence: "CLI entry point detected (__main__.py or cli.py)" });
    }
    // --- Data pipeline signals ---
    if (facts.hasDataPipeline) {
        scores.data_pipeline += 2;
        signals.push({ signal: "pipeline_structure", weight: "moderate", evidence: "Pipeline/DAG/ETL directory structure" });
    }
    // --- ML project signals ---
    if (facts.hasMLSignals) {
        scores.ml_project += 2;
        signals.push({ signal: "ml_project_structure", weight: "moderate", evidence: "ML-related paths (train/predict/experiments)" });
    }
    if (facts.hasNotebooks) {
        scores.ml_project += 1;
        signals.push({ signal: "jupyter_notebooks", weight: "weak", evidence: "Jupyter notebooks present" });
    }
    // --- Monorepo signals ---
    if (facts.hasMultipleTopPackages && facts.rootInitPyPackages.length >= 3) {
        scores.monorepo += 2;
        signals.push({ signal: "multiple_top_packages", weight: "moderate", evidence: `${facts.rootInitPyPackages.length} top-level packages: ${facts.rootInitPyPackages.join(", ")}` });
    }
    // Find winner
    const candidates = Object.entries(scores)
        .filter(([key]) => key !== "unknown" && key !== "mixed")
        .sort(([, a], [, b]) => b - a);
    if (candidates.length === 0 || candidates[0][1] === 0) {
        unknowns.push({
            aspect: "primary_layout",
            reason: "No structural signals matched known project forms",
        });
        return { primaryLayout: "unknown", primarySignals: signals, primaryUnknowns: unknowns };
    }
    const [topName, topScore] = candidates[0];
    const [, secondScore] = candidates.length > 1 ? candidates[1] : ["", 0];
    // If top two are close, consider "mixed"
    if (topScore > 0 && secondScore > 0 && topScore - secondScore <= 1) {
        signals.push({
            signal: "ambiguous_layout",
            weight: "weak",
            evidence: `Close scores: ${candidates[0][0]}=${topScore}, ${candidates[1]?.[0]}=${secondScore}`,
        });
        // Still pick the winner unless truly tied
        if (topScore === secondScore) {
            unknowns.push({
                aspect: "primary_layout",
                reason: `Tied between ${candidates[0][0]} and ${candidates[1][0]}`,
            });
            return { primaryLayout: "mixed", primarySignals: signals, primaryUnknowns: unknowns };
        }
    }
    return { primaryLayout: topName, primarySignals: signals, primaryUnknowns: unknowns };
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonFrameworkDetector.ts
/**
 * P27-1c: Python Framework & Project-Role Detector
 *
 * Detects frameworks and project roles from multiple evidence dimensions:
 *   1. dependency_manifest — packages declared in manifests
 *   2. layout_classification — primary_layout / package_layout from P27-1b
 *   3. path_pattern — structural path patterns (manage.py, migrations/, etc.)
 *   4. import_pattern — what top-level modules are imported
 *
 * Hard rules:
 *   - At least 2 evidence dimensions required for "high" confidence
 *   - Dependency-only evidence caps at "medium"
 *   - pytest is "test_framework" kind, never a project role
 *   - Unknown outputs when no framework/role can be determined
 *   - Does NOT modify layout, test mapping, or risk presets
 */
function detectPythonFrameworkProfile(input) {
    // Collect all available evidence
    const evidence = collectEvidence(input);
    // Detect frameworks
    const frameworkSignals = detectFrameworks(evidence);
    // Detect project roles
    const projectRoleSignals = detectProjectRoles(evidence, input.layout);
    // Build unknowns
    const unknowns = [];
    if (frameworkSignals.length === 0) {
        unknowns.push({
            kind: "unknown_framework_or_domain_role",
            reason: "No framework could be detected from dependencies, paths, or imports",
        });
    }
    if (projectRoleSignals.length === 0) {
        unknowns.push({
            kind: "unknown_framework_or_domain_role",
            reason: "No project role could be inferred from layout, dependencies, or path families",
        });
    }
    return {
        framework_signals: frameworkSignals,
        project_role_signals: projectRoleSignals,
        unknowns,
    };
}
function collectEvidence(input) {
    // Declared packages (main + dev, normalized to lowercase)
    const declaredPackages = new Set();
    const devPackages = new Set();
    for (const m of input.manifests) {
        for (const p of m.packages)
            declaredPackages.add(p.toLowerCase());
        for (const p of m.dev_packages)
            devPackages.add(p.toLowerCase());
    }
    // Imported top-level modules
    const importedModules = new Set();
    for (const imp of input.imports) {
        if (imp.status === "declared_package" || imp.status === "undeclared_package") {
            importedModules.add(imp.top_level_module.toLowerCase());
        }
    }
    // Path-based facts
    const pathSet = new Set(input.allPaths);
    const pathFamilies = new Set();
    // Detect commerce/domain path families
    const domainFamilyPatterns = [
        { pattern: /\bcheckout\b/i, family: "checkout" },
        { pattern: /\bpayment\b/i, family: "payment" },
        { pattern: /\border\b/i, family: "order" },
        { pattern: /\bcart\b/i, family: "cart" },
        { pattern: /\bdiscount\b/i, family: "discount" },
        { pattern: /\binvoice\b/i, family: "invoice" },
        { pattern: /\bshipping\b/i, family: "shipping" },
        { pattern: /\bwarehouse\b/i, family: "warehouse" },
        { pattern: /\baccount\b/i, family: "account" },
        { pattern: /\bauth\b/i, family: "auth" },
        { pattern: /\bgraphql\b/i, family: "graphql" },
        { pattern: /\bapi\b/i, family: "api" },
    ];
    for (const p of input.allPaths) {
        for (const { pattern, family } of domainFamilyPatterns) {
            if (pattern.test(p))
                pathFamilies.add(family);
        }
    }
    const pathFacts = {
        hasManagePy: pathSet.has("manage.py"),
        hasMigrations: input.allPaths.some(p => p.includes("/migrations/") && p.endsWith(".py")),
        hasAlembicDir: input.allPaths.some(p => p.startsWith("alembic/")),
        hasAppDir: input.allPaths.some(p => p.startsWith("app/") && p.endsWith(".py")),
        hasCli: input.allPaths.some(p => p === "cli.py" || p.includes("/cli.py") || p.includes("/cli/") ||
            p === "__main__.py" || p.includes("/__main__.py")),
        hasMainPy: pathSet.has("__main__.py") || input.allPaths.some(p => p.includes("/__main__.py")),
        hasPyTyped: input.allPaths.some(p => p.endsWith("/py.typed") || p === "py.typed"),
        hasDocsDir: input.allPaths.some(p => p.startsWith("docs/")),
        hasSetupPy: pathSet.has("setup.py"),
        hasPyprojectToml: pathSet.has("pyproject.toml"),
        hasGraphqlDir: input.allPaths.some(p => p.includes("/graphql/")),
        hasApiDir: input.allPaths.some(p => p.startsWith("api/") || p.includes("/api/")),
        pathFamilies,
    };
    return { declaredPackages, devPackages, importedModules, pathFacts };
}
function detectFrameworks(ev) {
    const candidates = [];
    // --- Django ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("django"))
            evidence.push({ dimension: "dependency_manifest", detail: "django found in dependency manifests" });
        if (ev.pathFacts.hasManagePy)
            evidence.push({ dimension: "path_pattern", detail: "manage.py found in repo root" });
        if (ev.pathFacts.hasMigrations)
            evidence.push({ dimension: "path_pattern", detail: "Django-style migrations/ directories found" });
        if (ev.importedModules.has("django"))
            evidence.push({ dimension: "import_pattern", detail: "django imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "django", kind: "web_framework", evidence });
    }
    // --- FastAPI ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("fastapi"))
            evidence.push({ dimension: "dependency_manifest", detail: "fastapi found in dependency manifests" });
        if (ev.importedModules.has("fastapi"))
            evidence.push({ dimension: "import_pattern", detail: "fastapi imported in source files" });
        if (ev.pathFacts.hasAppDir && !ev.pathFacts.hasManagePy)
            evidence.push({ dimension: "path_pattern", detail: "app/ directory without manage.py (service pattern)" });
        if (evidence.length > 0)
            candidates.push({ name: "fastapi", kind: "web_framework", evidence });
    }
    // --- Flask ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("flask"))
            evidence.push({ dimension: "dependency_manifest", detail: "flask found in dependency manifests" });
        if (ev.importedModules.has("flask"))
            evidence.push({ dimension: "import_pattern", detail: "flask imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "flask", kind: "web_framework", evidence });
    }
    // --- pytest ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("pytest") || ev.devPackages.has("pytest")) {
            evidence.push({ dimension: "dependency_manifest", detail: "pytest found in dependency manifests" });
        }
        if (ev.importedModules.has("pytest"))
            evidence.push({ dimension: "import_pattern", detail: "pytest imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "pytest", kind: "test_framework", evidence });
    }
    // --- click ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("click"))
            evidence.push({ dimension: "dependency_manifest", detail: "click found in dependency manifests" });
        if (ev.importedModules.has("click"))
            evidence.push({ dimension: "import_pattern", detail: "click imported in source files" });
        if (ev.pathFacts.hasCli)
            evidence.push({ dimension: "path_pattern", detail: "CLI entry points detected" });
        if (evidence.length > 0)
            candidates.push({ name: "click", kind: "cli_framework", evidence });
    }
    // --- typer ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("typer"))
            evidence.push({ dimension: "dependency_manifest", detail: "typer found in dependency manifests" });
        if (ev.importedModules.has("typer"))
            evidence.push({ dimension: "import_pattern", detail: "typer imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "typer", kind: "cli_framework", evidence });
    }
    // --- SQLAlchemy ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("sqlalchemy"))
            evidence.push({ dimension: "dependency_manifest", detail: "sqlalchemy found in dependency manifests" });
        if (ev.importedModules.has("sqlalchemy"))
            evidence.push({ dimension: "import_pattern", detail: "sqlalchemy imported in source files" });
        if (ev.pathFacts.hasAlembicDir)
            evidence.push({ dimension: "path_pattern", detail: "alembic/ migration directory present" });
        if (evidence.length > 0)
            candidates.push({ name: "sqlalchemy", kind: "orm", evidence });
    }
    // --- Celery ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("celery"))
            evidence.push({ dimension: "dependency_manifest", detail: "celery found in dependency manifests" });
        if (ev.importedModules.has("celery"))
            evidence.push({ dimension: "import_pattern", detail: "celery imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "celery", kind: "task_queue", evidence });
    }
    // --- httpx (as framework/library, not role) ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("httpx"))
            evidence.push({ dimension: "dependency_manifest", detail: "httpx found in dependency manifests" });
        if (ev.importedModules.has("httpx"))
            evidence.push({ dimension: "import_pattern", detail: "httpx imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "httpx", kind: "http_client", evidence });
    }
    // --- Airflow ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("apache-airflow") || ev.declaredPackages.has("airflow")) {
            evidence.push({ dimension: "dependency_manifest", detail: "airflow found in dependency manifests" });
        }
        if (ev.importedModules.has("airflow"))
            evidence.push({ dimension: "import_pattern", detail: "airflow imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "airflow", kind: "async_framework", evidence });
    }
    // --- Prefect ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("prefect"))
            evidence.push({ dimension: "dependency_manifest", detail: "prefect found in dependency manifests" });
        if (ev.importedModules.has("prefect"))
            evidence.push({ dimension: "import_pattern", detail: "prefect imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "prefect", kind: "async_framework", evidence });
    }
    // Apply confidence rules
    return candidates.map(c => ({
        name: c.name,
        kind: c.kind,
        confidence: computeFrameworkConfidence(c.evidence),
        evidence: c.evidence,
    }));
}
/**
 * Confidence rules:
 *   - 2+ distinct dimensions → "high"
 *   - 1 dimension only (dependency-only, path-only, or import-only) → "medium"
 *   - This ensures dependency-only never exceeds "medium" per hard rule
 */
function computeFrameworkConfidence(evidence) {
    const dimensions = new Set(evidence.map(e => e.dimension));
    if (dimensions.size >= 2)
        return "high";
    if (dimensions.size === 1)
        return "medium";
    return "low";
}
// ---------------------------------------------------------------------------
// Project role detection
// ---------------------------------------------------------------------------
function detectProjectRoles(ev, layout) {
    const roles = [];
    // Commerce backend detection
    {
        const evidence = [];
        const commerceFamilies = ["checkout", "payment", "order", "cart", "discount", "invoice", "shipping", "warehouse"];
        const matchedFamilies = commerceFamilies.filter(f => ev.pathFacts.pathFamilies.has(f));
        if (matchedFamilies.length >= 3) {
            evidence.push({ dimension: "path_pattern", detail: `Commerce path families: ${matchedFamilies.join(", ")}` });
        }
        if (layout.primary_layout === "django_project") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as django_project" });
        }
        if (ev.declaredPackages.has("django") && matchedFamilies.length >= 2) {
            evidence.push({ dimension: "dependency_manifest", detail: "Django with commerce-domain directories" });
        }
        if (evidence.length > 0) {
            roles.push({
                role: "commerce_backend",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // API/Service backend detection
    {
        const evidence = [];
        if (layout.primary_layout === "api_service") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as api_service" });
        }
        if (ev.declaredPackages.has("fastapi") || ev.declaredPackages.has("flask") || ev.declaredPackages.has("starlette")) {
            evidence.push({ dimension: "dependency_manifest", detail: "API framework found in dependencies" });
        }
        if (ev.pathFacts.hasAppDir && !ev.pathFacts.hasManagePy) {
            evidence.push({ dimension: "path_pattern", detail: "app/ directory without manage.py (service layout)" });
        }
        if (ev.pathFacts.hasAlembicDir) {
            evidence.push({ dimension: "path_pattern", detail: "Alembic migrations (service DB pattern)" });
        }
        if (ev.pathFacts.hasApiDir) {
            evidence.push({ dimension: "path_pattern", detail: "api/ directory present" });
        }
        // Avoid double-counting: don't label as service_backend if already strong commerce_backend
        const commerceEvDims = new Set(roles.find(r => r.role === "commerce_backend")?.evidence.map(e => e.dimension) ?? []);
        const isStrongCommerce = commerceEvDims.size >= 2;
        if (evidence.length > 0 && !isStrongCommerce) {
            roles.push({
                role: "service_backend",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // Python SDK / Library detection
    {
        const evidence = [];
        if (layout.primary_layout === "library_package") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as library_package" });
        }
        if (ev.pathFacts.hasPyTyped) {
            evidence.push({ dimension: "path_pattern", detail: "py.typed marker (PEP 561 typed package)" });
        }
        if (ev.pathFacts.hasDocsDir && !ev.pathFacts.hasManagePy && !ev.pathFacts.hasAppDir) {
            evidence.push({ dimension: "path_pattern", detail: "docs/ directory without web framework signals" });
        }
        if ((ev.pathFacts.hasSetupPy || ev.pathFacts.hasPyprojectToml) && !ev.pathFacts.hasManagePy) {
            evidence.push({ dimension: "dependency_manifest", detail: "Packaging config without web framework" });
        }
        if (evidence.length > 0) {
            roles.push({
                role: "python_sdk_library",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // HTTP client library detection (specific sub-role of sdk_library)
    {
        const evidence = [];
        // Check if the project's own package is an HTTP client
        if (ev.declaredPackages.has("httpx") || ev.declaredPackages.has("httpcore")) {
            // This is httpx as a dependency, but for httpx itself, check path patterns
        }
        if (ev.importedModules.has("httpcore") || ev.declaredPackages.has("httpcore")) {
            evidence.push({ dimension: "dependency_manifest", detail: "httpcore dependency (HTTP transport layer)" });
        }
        if (ev.pathFacts.pathFamilies.has("api") && layout.primary_layout === "library_package") {
            evidence.push({ dimension: "path_pattern", detail: "API-related paths in library package" });
        }
        // Check for HTTP-specific path patterns
        const httpPaths = ["_transports", "_client", "_models", "_urls", "_content"];
        const hasHttpPaths = httpPaths.some(p => ev.pathFacts.pathFamilies.has(p) || // unlikely via families
            // fallback: check raw paths
            false);
        // Use layout + dependency as dimensions for HTTP client role
        if (layout.primary_layout === "library_package" && ev.declaredPackages.has("httpcore")) {
            evidence.push({ dimension: "layout_classification", detail: "Library package with HTTP core dependency" });
        }
        if (evidence.length >= 2) {
            roles.push({
                role: "http_client_library",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // CLI app detection
    {
        const evidence = [];
        if (layout.primary_layout === "cli_app") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as cli_app" });
        }
        if (ev.pathFacts.hasCli || ev.pathFacts.hasMainPy) {
            evidence.push({ dimension: "path_pattern", detail: "CLI entry points (__main__.py or cli.py)" });
        }
        if (ev.declaredPackages.has("click") || ev.declaredPackages.has("typer") || ev.declaredPackages.has("argparse")) {
            evidence.push({ dimension: "dependency_manifest", detail: "CLI framework in dependencies" });
        }
        if (evidence.length >= 2) {
            roles.push({
                role: "cli_application",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    return roles;
}
/**
 * Role confidence rules (same as framework):
 *   - 2+ distinct dimensions → "high"
 *   - 1 dimension only → "medium"
 */
function computeRoleConfidence(evidence) {
    const dimensions = new Set(evidence.map(e => e.dimension));
    if (dimensions.size >= 2)
        return "high";
    if (dimensions.size === 1)
        return "medium";
    return "low";
}

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonRiskPresetValidator.ts
/**
 * P27-1e: Python Risk Preset Validator
 *
 * Produces suggested review/forbid boundary candidates based on observed
 * layout, framework, project-role, sensitive zones, and path signals.
 *
 * Hard rules:
 *   - Does NOT auto-decide allowed/review/forbid
 *   - Only outputs suggestions with matched_signals + reason
 *   - Unobserved paths go to dormant_patterns
 *   - SDK/library defaults to review, not forbid
 *   - Unvalidated presets cannot produce strong recommendations
 *   - Does NOT modify test mapper, layout, or framework detector
 */
function validatePythonRiskPreset(input) {
    // 1. Select preset based on project role + layout
    const presetName = selectPreset(input);
    // 2. Collect observed evidence
    const matchedSignals = collectMatchedSignals(input);
    // 3. Generate suggestions from matching preset rules
    const presetRules = getPresetRules(presetName);
    const suggestedReview = [];
    const suggestedForbidden = [];
    const dormantPatterns = [];
    const pathSet = new Set(input.allPaths);
    for (const rule of presetRules) {
        // Count how many paths match this rule's pattern
        const matchedPaths = input.allPaths.filter(p => matchPattern(p, rule.pattern));
        const matchedCount = matchedPaths.length;
        // Also check if sensitive zones corroborate
        const corroboratingZone = input.sensitiveZones.find(z => z.category === rule.sensitiveCategory || matchedPaths.some(mp => z.matched_paths.includes(mp)));
        if (matchedCount === 0) {
            // Unobserved — goes to dormant
            dormantPatterns.push({
                pattern: rule.pattern,
                reason: rule.dormantReason,
            });
            continue;
        }
        // Build evidence
        const evidence = [];
        evidence.push(`${matchedCount} paths match pattern ${rule.pattern}`);
        if (corroboratingZone) {
            evidence.push(`Sensitive zone "${corroboratingZone.category}" (${corroboratingZone.severity}) corroborates`);
        }
        if (rule.frameworkEvidence) {
            evidence.push(rule.frameworkEvidence);
        }
        const suggestion = {
            pattern: rule.pattern,
            reason: rule.reason,
            severity: rule.severity,
            matched_path_count: matchedCount,
            evidence,
        };
        if (rule.suggestedLevel === "forbidden") {
            suggestedForbidden.push(suggestion);
        }
        else {
            suggestedReview.push(suggestion);
        }
    }
    // 4. Determine validation status
    const totalRules = presetRules.length;
    const activeRules = totalRules - dormantPatterns.length;
    const validation = activeRules >= totalRules * 0.6 ? "validated" :
        activeRules > 0 ? "partial" :
            "unvalidated";
    // 5. Confidence from matched signals
    const confidence = matchedSignals.length >= 3 && validation === "validated" ? "high" :
        matchedSignals.length >= 2 || validation === "partial" ? "medium" :
            "low";
    return {
        preset: presetName,
        validation,
        confidence,
        matched_signals: matchedSignals,
        suggested_review: suggestedReview,
        suggested_forbidden: suggestedForbidden,
        dormant_patterns: dormantPatterns,
    };
}
// ---------------------------------------------------------------------------
// Preset selection
// ---------------------------------------------------------------------------
function selectPreset(input) {
    const roles = input.frameworkProfile.project_role_signals;
    const frameworks = input.frameworkProfile.framework_signals;
    const layout = input.layout;
    // Priority order: most specific role first
    const roleNames = roles.map(r => r.role);
    if (roleNames.includes("commerce_backend") && frameworks.some(f => f.name === "django")) {
        return "django_commerce";
    }
    if (roleNames.includes("service_backend")) {
        const fw = frameworks.find(f => f.kind === "web_framework");
        if (fw?.name === "fastapi")
            return "fastapi_service";
        if (fw?.name === "flask")
            return "flask_service";
        return "generic_service";
    }
    if (roleNames.includes("http_client_library") || roleNames.includes("python_sdk_library")) {
        return "python_sdk_library";
    }
    if (roleNames.includes("cli_application")) {
        return "cli_application";
    }
    if (layout.primary_layout === "django_project")
        return "django_generic";
    if (layout.primary_layout === "library_package")
        return "python_sdk_library";
    if (layout.primary_layout === "api_service")
        return "generic_service";
    return "unknown";
}
// ---------------------------------------------------------------------------
// Signal collection
// ---------------------------------------------------------------------------
function collectMatchedSignals(input) {
    const signals = [];
    // Layout signals
    signals.push(`layout: ${input.layout.primary_layout} / ${input.layout.package_layout} (${input.layout.confidence})`);
    // Framework signals
    for (const fw of input.frameworkProfile.framework_signals) {
        if (fw.confidence === "high" || fw.confidence === "medium") {
            signals.push(`framework: ${fw.name} / ${fw.kind} (${fw.confidence})`);
        }
    }
    // Project role signals
    for (const role of input.frameworkProfile.project_role_signals) {
        signals.push(`project_role: ${role.role} (${role.confidence})`);
    }
    // Sensitive zone signals
    for (const zone of input.sensitiveZones) {
        if (zone.severity === "critical" || zone.severity === "high") {
            signals.push(`sensitive_zone: ${zone.category} (${zone.severity}, ${zone.matched_paths.length} paths)`);
        }
    }
    return signals;
}
// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------
function matchPattern(path, pattern) {
    const regex = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "___DOUBLESTAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/___DOUBLESTAR___/g, ".*");
    return new RegExp(`^${regex}$`).test(path);
}
function getPresetRules(presetName) {
    switch (presetName) {
        case "django_commerce": return DJANGO_COMMERCE_RULES;
        case "fastapi_service": return FASTAPI_SERVICE_RULES;
        case "python_sdk_library": return PYTHON_SDK_LIBRARY_RULES;
        case "django_generic": return DJANGO_GENERIC_RULES;
        case "flask_service": return FASTAPI_SERVICE_RULES; // similar patterns
        case "generic_service": return GENERIC_SERVICE_RULES;
        case "cli_application": return CLI_APPLICATION_RULES;
        default: return GENERIC_RULES;
    }
}
// ---------------------------------------------------------------------------
// Django Commerce rules
// ---------------------------------------------------------------------------
const DJANGO_COMMERCE_RULES = [
    // Forbidden candidates (very selective)
    {
        pattern: "**/migrations/**",
        reason: "Schema migrations should not be auto-generated by AI agents",
        severity: "critical",
        suggestedLevel: "forbidden",
        sensitiveCategory: "schema_migration",
        frameworkEvidence: "Django migration framework detected",
        dormantReason: "No migrations directory observed",
    },
    // Review candidates
    {
        pattern: "**/payment/**",
        reason: "Financial transaction logic requires human review",
        severity: "critical",
        suggestedLevel: "review",
        sensitiveCategory: "financial_transactions",
        dormantReason: "No payment directory observed",
    },
    {
        pattern: "**/billing/**",
        reason: "Billing logic requires human review",
        severity: "critical",
        suggestedLevel: "review",
        sensitiveCategory: "financial_transactions",
        dormantReason: "No billing directory observed",
    },
    {
        pattern: "**/checkout/**",
        reason: "Purchase flow logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "purchase_flow",
        dormantReason: "No checkout directory observed",
    },
    {
        pattern: "**/order/**",
        reason: "Order lifecycle logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "order_lifecycle",
        dormantReason: "No order directory observed",
    },
    {
        pattern: "**/account/**",
        reason: "Identity and account management requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "identity",
        dormantReason: "No account directory observed",
    },
    {
        pattern: "**/auth/**",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth directory observed",
    },
    {
        pattern: "**/discount/**",
        reason: "Pricing adjustment logic is money-flow adjacent",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "pricing_adjustment",
        dormantReason: "No discount directory observed",
    },
    {
        pattern: "**/tax/**",
        reason: "Tax calculation has regulatory implications",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "regulatory_calculation",
        dormantReason: "No tax directory observed",
    },
    {
        pattern: "**/plugin*/**",
        reason: "Plugin/extension points affect runtime behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "runtime_extension",
        dormantReason: "No plugin directory observed",
    },
    {
        pattern: "**/settings*",
        reason: "Infrastructure configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "infrastructure_config",
        dormantReason: "No settings files observed",
    },
];
// ---------------------------------------------------------------------------
// FastAPI / service rules
// ---------------------------------------------------------------------------
const FASTAPI_SERVICE_RULES = [
    // Forbidden candidates
    {
        pattern: "alembic/**",
        reason: "Database migrations should not be auto-generated by AI agents",
        severity: "critical",
        suggestedLevel: "forbidden",
        frameworkEvidence: "Alembic migration framework detected",
        dormantReason: "No alembic directory observed",
    },
    // Review candidates
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/security*",
        reason: "Security module requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "security",
        dormantReason: "No security files observed",
    },
    {
        pattern: "**/config*",
        reason: "Application configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "infrastructure_config",
        dormantReason: "No config files observed",
    },
    {
        pattern: "**/db/**",
        reason: "Database layer changes affect data integrity",
        severity: "high",
        suggestedLevel: "review",
        dormantReason: "No db directory observed",
    },
    {
        pattern: "**/middleware*",
        reason: "Middleware affects request processing pipeline",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No middleware files observed",
    },
    {
        pattern: "**/deps*",
        reason: "Dependency injection affects route behavior",
        severity: "medium",
        suggestedLevel: "review",
        frameworkEvidence: "FastAPI dependency injection pattern",
        dormantReason: "No deps files observed",
    },
];
// ---------------------------------------------------------------------------
// Python SDK / Library rules
// ---------------------------------------------------------------------------
const PYTHON_SDK_LIBRARY_RULES = [
    // SDK/library: prefer review over forbid
    {
        pattern: "**/_client*",
        reason: "Public client behavior surface — changes affect all consumers",
        severity: "high",
        suggestedLevel: "review",
        dormantReason: "No client module observed",
    },
    {
        pattern: "**/_transport*/**",
        reason: "Transport layer affects request execution semantics",
        severity: "high",
        suggestedLevel: "review",
        dormantReason: "No transport module observed",
    },
    {
        pattern: "**/_auth*",
        reason: "Authentication affects security surface",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth module observed",
    },
    {
        pattern: "**/_config*",
        reason: "Configuration affects default behavior for all consumers",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config module observed",
    },
    {
        pattern: "**/__init__.py",
        reason: "Public API exports — changes affect import compatibility",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No __init__.py observed (unusual)",
    },
    {
        pattern: "**/_models*",
        reason: "Data model changes affect serialization and API compatibility",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No models module observed",
    },
    {
        pattern: "**/_urls*",
        reason: "URL handling affects request routing",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No URL module observed",
    },
];
// ---------------------------------------------------------------------------
// Django generic rules (non-commerce)
// ---------------------------------------------------------------------------
const DJANGO_GENERIC_RULES = [
    {
        pattern: "**/migrations/**",
        reason: "Schema migrations should not be auto-generated by AI agents",
        severity: "critical",
        suggestedLevel: "forbidden",
        sensitiveCategory: "schema_migration",
        frameworkEvidence: "Django migration framework detected",
        dormantReason: "No migrations directory observed",
    },
    {
        pattern: "**/auth/**",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth directory observed",
    },
    {
        pattern: "**/settings*",
        reason: "Django settings affect system-wide behavior",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "infrastructure_config",
        dormantReason: "No settings files observed",
    },
    {
        pattern: "**/admin*",
        reason: "Admin interface affects data access controls",
        severity: "medium",
        suggestedLevel: "review",
        sensitiveCategory: "administration",
        dormantReason: "No admin files observed",
    },
];
// ---------------------------------------------------------------------------
// Generic service rules
// ---------------------------------------------------------------------------
const GENERIC_SERVICE_RULES = [
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/security*",
        reason: "Security module requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "security",
        dormantReason: "No security files observed",
    },
    {
        pattern: "**/config*",
        reason: "Configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
];
// ---------------------------------------------------------------------------
// CLI application rules
// ---------------------------------------------------------------------------
const CLI_APPLICATION_RULES = [
    {
        pattern: "**/config*",
        reason: "CLI configuration affects default behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
    {
        pattern: "**/__main__*",
        reason: "CLI entry point affects invocation behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No __main__.py observed",
    },
];
// ---------------------------------------------------------------------------
// Fallback generic rules
// ---------------------------------------------------------------------------
const GENERIC_RULES = [
    {
        pattern: "**/auth*",
        reason: "Authentication logic requires human review",
        severity: "high",
        suggestedLevel: "review",
        sensitiveCategory: "authentication",
        dormantReason: "No auth files observed",
    },
    {
        pattern: "**/config*",
        reason: "Configuration affects system behavior",
        severity: "medium",
        suggestedLevel: "review",
        dormantReason: "No config files observed",
    },
];

;// CONCATENATED MODULE: ./src/repoObservation/python/pythonObservationEnhancer.ts
/**
 * P25a: Python Observation Enhancer (Orchestrator)
 *
 * Sidecar enhancer that runs all Python observation sub-modules
 * on top of existing RepoObservations, producing python_observations.json.
 *
 * Does NOT modify scanner. Does NOT add to RepoObservations.
 * The sidecar is a standalone artifact.
 */












// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function enhanceWithPythonObservations(observations, repoRoot, config) {
    const allPaths = observations.observations.files.map(f => f.path);
    const observedPathSet = new Set(allPaths);
    // 1. Identify and classify Python files
    const pythonFiles = [];
    const pythonSourcePaths = [];
    for (const file of observations.observations.files) {
        if (isPythonFile(file.path)) {
            const classified = classifyPythonFile(file.path, file.size_bytes);
            pythonFiles.push(classified);
            if (classified.bucket === "source") {
                pythonSourcePaths.push(file.path);
            }
        }
        // Also classify Python ecosystem config files (pyproject.toml, etc.)
        else if (isPythonEcosystemFile(file.path)) {
            const classified = classifyPythonFile(file.path, file.size_bytes);
            pythonFiles.push(classified);
        }
    }
    // 2. Extract dependency manifests
    const manifests = extractManifests(repoRoot, allPaths);
    // 2b. Classify layout (P27-1b)
    const layout = classifyPythonLayout({
        files: pythonFiles,
        manifests,
        allPaths,
    });
    // 3. Build declared package set
    const declaredPackages = buildDeclaredPackageSet(manifests);
    // 4. Detect project packages
    const projectPackages = config?.project_packages
        ? [...config.project_packages]
        : detectProjectPackages(allPaths);
    // 5. Observe imports from Python source files
    const imports = [];
    for (const sourcePath of pythonSourcePaths) {
        try {
            const fullPath = (0,external_node_path_.join)(repoRoot, sourcePath);
            if (!(0,external_node_fs_.existsSync)(fullPath))
                continue;
            const content = (0,external_node_fs_.readFileSync)(fullPath, "utf-8");
            const fileImports = observePythonImports({
                filePath: sourcePath,
                content,
                projectPackages,
                declaredPackages,
            });
            imports.push(...fileImports);
        }
        catch {
            // Skip files that can't be read
        }
    }
    // 6. Detect framework and project-role profile (P27-1c)
    //    Moved before test mapping so mapper can use framework context (P27-1d)
    const frameworkProfile = detectPythonFrameworkProfile({
        files: pythonFiles,
        manifests,
        imports,
        layout,
        allPaths,
    });
    // 7. Map tests (P27-1d: framework-aware)
    const testMappings = mapPythonTests({
        sourcePaths: pythonSourcePaths,
        observedPaths: observedPathSet,
        layout,
        frameworkProfile,
    });
    // 8. Detect sensitive zones
    const pythonPaths = pythonFiles
        .filter(f => f.bucket !== "generated" && f.bucket !== "unsupported")
        .map(f => f.path);
    const sensitiveZones = detectPythonSensitiveZones({
        pythonPaths,
        sensitiveOverrides: config?.sensitive_overrides,
    });
    // 8b. Validate risk preset (P27-1e)
    const riskPresetValidation = validatePythonRiskPreset({
        layout,
        frameworkProfile,
        sensitiveZones,
        allPaths,
    });
    // 8. Build unknown taxonomy
    const unknowns = buildPythonUnknownTaxonomy({
        files: pythonFiles,
        imports,
        manifests,
        testMappings,
    });
    // 9. Compute quality
    const quality = computePythonQuality(pythonFiles, imports, testMappings, sensitiveZones, manifests);
    // 10. Limitations
    const limitations = [
        "Python import observations are syntax-level observations, not full runtime import resolution.",
        "Multi-line Python import statements (from x import (\n  a,\n  b)) are parsed as a single observation on the module, not per-symbol.",
        "Scope granularity in P25 is file/path-level. Function-level scope is future work.",
        "pyproject.toml parsing uses regex-based extraction, not a full TOML parser.",
        "Dynamic imports (__import__, importlib) cannot be statically analyzed.",
        "Namespace packages without __init__.py are not detected as project packages.",
    ];
    return {
        schema_version: "python_observations.v1",
        repo: {
            root_label: observations.repo.repo_root_label,
            observed_file_count: observations.meta.file_count,
            python_file_count: pythonFiles.length,
        },
        layout,
        framework_profile: frameworkProfile,
        risk_preset_validation: riskPresetValidation,
        files: pythonFiles,
        import_observations: imports,
        dependency_manifests: manifests,
        test_mappings: testMappings,
        sensitive_zones: sensitiveZones,
        unknowns,
        quality,
        limitations,
    };
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractManifests(repoRoot, allPaths) {
    const results = [];
    for (const path of allPaths) {
        if (!isPythonManifestFile(path))
            continue;
        try {
            const fullPath = (0,external_node_path_.join)(repoRoot, path);
            if (!(0,external_node_fs_.existsSync)(fullPath))
                continue;
            const content = (0,external_node_fs_.readFileSync)(fullPath, "utf-8");
            results.push(extractPythonDependencies({ filePath: path, content }));
        }
        catch {
            // Skip unreadable files
        }
    }
    return results;
}
function computePythonQuality(files, imports, testMappings, sensitiveZones, manifests) {
    const pyFiles = files.filter(f => f.extension === ".py" || f.extension === ".pyi");
    const classified = pyFiles.filter(f => f.bucket !== "unknown");
    const unknown = pyFiles.filter(f => f.bucket === "unknown");
    const projectImports = imports.filter(i => i.status === "project_import");
    const declaredImports = imports.filter(i => i.status === "declared_package");
    const undeclaredImports = imports.filter(i => i.status === "undeclared_package");
    const dynamicImports = imports.filter(i => i.status === "dynamic_or_unresolved");
    const highTests = testMappings.filter(m => m.confidence === "high");
    const medTests = testMappings.filter(m => m.confidence === "medium");
    const sensitiveFileCount = new Set(sensitiveZones.flatMap(z => z.matched_paths)).size;
    const lowConfManifests = manifests.filter(m => m.confidence === "low");
    return {
        python_file_count: pyFiles.length,
        classified_count: classified.length,
        classified_ratio: pyFiles.length > 0 ? classified.length / pyFiles.length : 0,
        unknown_count: unknown.length,
        unknown_ratio: pyFiles.length > 0 ? unknown.length / pyFiles.length : 0,
        import_observation_count: imports.length,
        project_import_count: projectImports.length,
        declared_package_count: declaredImports.length,
        undeclared_package_count: undeclaredImports.length,
        dynamic_import_count: dynamicImports.length,
        test_mapping_count: testMappings.length,
        high_confidence_test_count: highTests.length,
        medium_confidence_test_count: medTests.length,
        sensitive_zone_count: sensitiveZones.length,
        sensitive_file_count: sensitiveFileCount,
        manifest_count: manifests.length,
        low_confidence_manifest_count: lowConfManifests.length,
    };
}

// EXTERNAL MODULE: ./src/cli/artifactLayout.ts
var artifactLayout = __nccwpck_require__(932);
;// CONCATENATED MODULE: ./src/repair/repairArtifactLayout.ts



function repairPaths(repoRoot) {
    const dir = resolveRepairDir(repoRoot);
    return {
        dir,
        agentBugReport: join(dir, "agent_bug_report.json"),
        userBugReport: join(dir, "user_bug_report.json"),
        bugFinding: join(dir, "bug_finding.json"),
        contract: join(dir, "repair_contract.json"),
        relationGraph: join(dir, "repair_relation_graph.json"),
        task: join(dir, "repair_task.md"),
        scope: join(dir, "repair_scope.md"),
        checklist: join(dir, "consistency_checklist.md"),
        auditLog: join(dir, "repair_audit_log.jsonl"),
        syntheticDiff: join(dir, "synthetic_diff.json"),
        check: join(dir, "repair_check.json"),
        report: join(dir, "repair_report.md"),
        feedback: join(dir, "repair_feedback.md"),
        caseResult: join(dir, "case_result.json"),
    };
}
function ensureRepairDirs(repoRoot) {
    (0,artifactLayout/* ensurePantheonDirs */.O2)(repoRoot);
    const root = repairArtifactLayout_repairRootPaths(repoRoot);
    (0,external_node_fs_.mkdirSync)(root.dir, { recursive: true });
    (0,external_node_fs_.mkdirSync)(root.runsDir, { recursive: true });
}
function resolveRepairDir(repoRoot) {
    return (0,external_node_path_.join)((0,artifactLayout/* resolvePantheonDir */.NJ)(repoRoot), "repair");
}
function repairArtifactLayout_repairRootPaths(repoRoot) {
    const dir = resolveRepairDir(repoRoot);
    return {
        dir,
        runsDir: (0,external_node_path_.join)(dir, "runs"),
        sessionsIndex: (0,external_node_path_.join)(dir, "sessions.json"),
        latestPointer: (0,external_node_path_.join)(dir, "latest"),
        globalLock: (0,external_node_path_.join)(dir, ".lock"),
    };
}
function repairArtifactLayout_repairRunPaths(repoRoot, repairId) {
    const root = repairArtifactLayout_repairRootPaths(repoRoot);
    const dir = (0,external_node_path_.join)(root.runsDir, repairId);
    return {
        root,
        repairId,
        dir,
        lock: (0,external_node_path_.join)(dir, ".lock"),
        session: (0,external_node_path_.join)(dir, "session.json"),
        agentBugReport: (0,external_node_path_.join)(dir, "agent_bug_report.json"),
        userBugReport: (0,external_node_path_.join)(dir, "user_bug_report.json"),
        bugFinding: (0,external_node_path_.join)(dir, "bug_finding.json"),
        contractLatest: (0,external_node_path_.join)(dir, "repair_contract.latest.json"),
        relationGraph: (0,external_node_path_.join)(dir, "repair_relation_graph.json"),
        task: (0,external_node_path_.join)(dir, "repair_task.md"),
        scope: (0,external_node_path_.join)(dir, "repair_scope.md"),
        checklist: (0,external_node_path_.join)(dir, "consistency_checklist.md"),
        auditLog: (0,external_node_path_.join)(dir, "repair_audit_log.jsonl"),
        syntheticDiff: (0,external_node_path_.join)(dir, "synthetic_diff.json"),
        check: (0,external_node_path_.join)(dir, "repair_check.json"),
        report: (0,external_node_path_.join)(dir, "repair_report.md"),
        feedback: (0,external_node_path_.join)(dir, "repair_feedback.md"),
        caseResult: (0,external_node_path_.join)(dir, "case_result.json"),
        contractRevision: (revision) => (0,external_node_path_.join)(dir, `repair_contract.v${revision}.json`),
        humanAuditDecision: (decisionId) => (0,external_node_path_.join)(dir, `human_audit_decision_${decisionId}.json`),
    };
}

;// CONCATENATED MODULE: ./src/repair/repairAuditLog.ts


function repairAuditLog_appendRepairAuditEvent(repoRoot, repairId, event) {
    const line = JSON.stringify(event) + "\n";
    (0,external_node_fs_.appendFileSync)(repairArtifactLayout_repairRunPaths(repoRoot, repairId).auditLog, line);
}
function loadRepairAuditLog(repoRoot, repairId) {
    const path = repairRunPaths(repoRoot, repairId).auditLog;
    if (!existsSync(path))
        return [];
    const text = readFileSync(path, "utf-8").trim();
    if (!text)
        return [];
    return text.split(/\r?\n/).map(line => JSON.parse(line));
}
function writeRepairAuditLog(repoRoot, repairId, events) {
    const path = repairRunPaths(repoRoot, repairId).auditLog;
    const text = events.map(event => JSON.stringify(event)).join("\n");
    writeFileSync(path, text ? `${text}\n` : "");
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/core.js
/** A special constant with type `never` */
const NEVER = Object.freeze({
    status: "aborted",
});
function $constructor(name, initializer, params) {
    function init(inst, def) {
        if (!inst._zod) {
            Object.defineProperty(inst, "_zod", {
                value: {
                    def,
                    constr: _,
                    traits: new Set(),
                },
                enumerable: false,
            });
        }
        if (inst._zod.traits.has(name)) {
            return;
        }
        inst._zod.traits.add(name);
        initializer(inst, def);
        // support prototype modifications
        const proto = _.prototype;
        const keys = Object.keys(proto);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (!(k in inst)) {
                inst[k] = proto[k].bind(inst);
            }
        }
    }
    // doesn't work if Parent has a constructor with arguments
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
        var _a;
        const inst = params?.Parent ? new Definition() : this;
        init(inst, def);
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        for (const fn of inst._zod.deferred) {
            fn();
        }
        return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
        value: (inst) => {
            if (params?.Parent && inst instanceof params.Parent)
                return true;
            return inst?._zod?.traits?.has(name);
        },
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
}
//////////////////////////////   UTILITIES   ///////////////////////////////////////
const $brand = Symbol("zod_brand");
class $ZodAsyncError extends Error {
    constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
}
class $ZodEncodeError extends Error {
    constructor(name) {
        super(`Encountered unidirectional transform during encode: ${name}`);
        this.name = "ZodEncodeError";
    }
}
const globalConfig = {};
function config(newConfig) {
    if (newConfig)
        Object.assign(globalConfig, newConfig);
    return globalConfig;
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/util.js
// functions
function assertEqual(val) {
    return val;
}
function assertNotEqual(val) {
    return val;
}
function assertIs(_arg) { }
function assertNever(_x) {
    throw new Error("Unexpected value in exhaustive check");
}
function assert(_) { }
function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries)
        .filter(([k, _]) => numericValues.indexOf(+k) === -1)
        .map(([_, v]) => v);
    return values;
}
function joinValues(array, separator = "|") {
    return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
        return value.toString();
    return value;
}
function cached(getter) {
    const set = false;
    return {
        get value() {
            if (!set) {
                const value = getter();
                Object.defineProperty(this, "value", { value });
                return value;
            }
            throw new Error("cached value already set");
        },
    };
}
function nullish(input) {
    return input === null || input === undefined;
}
function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepString = step.toString();
    let stepDecCount = (stepString.split(".")[1] || "").length;
    if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
        const match = stepString.match(/\d?e-(\d?)/);
        if (match?.[1]) {
            stepDecCount = Number.parseInt(match[1]);
        }
    }
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return (valInt % stepInt) / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
    let value = undefined;
    Object.defineProperty(object, key, {
        get() {
            if (value === EVALUATING) {
                // Circular reference detected, return undefined to break the cycle
                return undefined;
            }
            if (value === undefined) {
                value = EVALUATING;
                value = getter();
            }
            return value;
        },
        set(v) {
            Object.defineProperty(object, key, {
                value: v,
                // configurable: true,
            });
            // object[key] = v;
        },
        configurable: true,
    });
}
function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
    });
}
function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
        const descriptors = Object.getOwnPropertyDescriptors(def);
        Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
    if (!path)
        return obj;
    return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
    const keys = Object.keys(promisesObj);
    const promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
        const resolvedObj = {};
        for (let i = 0; i < keys.length; i++) {
            resolvedObj[keys[i]] = results[i];
        }
        return resolvedObj;
    });
}
function randomString(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let str = "";
    for (let i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}
function esc(str) {
    return JSON.stringify(str);
}
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
const captureStackTrace = ("captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => { });
function util_isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
}
const util_allowsEval = cached(() => {
    // @ts-ignore
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
        return false;
    }
    try {
        const F = Function;
        new F("");
        return true;
    }
    catch (_) {
        return false;
    }
});
function isPlainObject(o) {
    if (util_isObject(o) === false)
        return false;
    // modified constructor
    const ctor = o.constructor;
    if (ctor === undefined)
        return true;
    if (typeof ctor !== "function")
        return true;
    // modified prototype
    const prot = ctor.prototype;
    if (util_isObject(prot) === false)
        return false;
    // ctor doesn't have static `isPrototypeOf`
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
        return false;
    }
    return true;
}
function shallowClone(o) {
    if (isPlainObject(o))
        return { ...o };
    if (Array.isArray(o))
        return [...o];
    return o;
}
function numKeys(data) {
    let keyCount = 0;
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            keyCount++;
        }
    }
    return keyCount;
}
const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
        case "undefined":
            return "undefined";
        case "string":
            return "string";
        case "number":
            return Number.isNaN(data) ? "nan" : "number";
        case "boolean":
            return "boolean";
        case "function":
            return "function";
        case "bigint":
            return "bigint";
        case "symbol":
            return "symbol";
        case "object":
            if (Array.isArray(data)) {
                return "array";
            }
            if (data === null) {
                return "null";
            }
            if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
                return "promise";
            }
            if (typeof Map !== "undefined" && data instanceof Map) {
                return "map";
            }
            if (typeof Set !== "undefined" && data instanceof Set) {
                return "set";
            }
            if (typeof Date !== "undefined" && data instanceof Date) {
                return "date";
            }
            // @ts-ignore
            if (typeof File !== "undefined" && data instanceof File) {
                return "file";
            }
            return "object";
        default:
            throw new Error(`Unknown data type: ${t}`);
    }
};
const propertyKeyTypes = new Set(["string", "number", "symbol"]);
const primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// zod-specific utils
function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
        cl._zod.parent = inst;
    return cl;
}
function normalizeParams(_params) {
    const params = _params;
    if (!params)
        return {};
    if (typeof params === "string")
        return { error: () => params };
    if (params?.message !== undefined) {
        if (params?.error !== undefined)
            throw new Error("Cannot specify both `message` and `error` params");
        params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
        return { ...params, error: () => params.error };
    return params;
}
function createTransparentProxy(getter) {
    let target;
    return new Proxy({}, {
        get(_, prop, receiver) {
            target ?? (target = getter());
            return Reflect.get(target, prop, receiver);
        },
        set(_, prop, value, receiver) {
            target ?? (target = getter());
            return Reflect.set(target, prop, value, receiver);
        },
        has(_, prop) {
            target ?? (target = getter());
            return Reflect.has(target, prop);
        },
        deleteProperty(_, prop) {
            target ?? (target = getter());
            return Reflect.deleteProperty(target, prop);
        },
        ownKeys(_) {
            target ?? (target = getter());
            return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(_, prop) {
            target ?? (target = getter());
            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
        defineProperty(_, prop, descriptor) {
            target ?? (target = getter());
            return Reflect.defineProperty(target, prop, descriptor);
        },
    });
}
function stringifyPrimitive(value) {
    if (typeof value === "bigint")
        return value.toString() + "n";
    if (typeof value === "string")
        return `"${value}"`;
    return `${value}`;
}
function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
        return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
    });
}
const NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-3.4028234663852886e38, 3.4028234663852886e38],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
};
const BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")],
};
function pick(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".pick() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const newShape = {};
            for (const key in mask) {
                if (!(key in currDef.shape)) {
                    throw new Error(`Unrecognized key: "${key}"`);
                }
                if (!mask[key])
                    continue;
                newShape[key] = currDef.shape[key];
            }
            assignProp(this, "shape", newShape); // self-caching
            return newShape;
        },
        checks: [],
    });
    return clone(schema, def);
}
function omit(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".omit() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const newShape = { ...schema._zod.def.shape };
            for (const key in mask) {
                if (!(key in currDef.shape)) {
                    throw new Error(`Unrecognized key: "${key}"`);
                }
                if (!mask[key])
                    continue;
                delete newShape[key];
            }
            assignProp(this, "shape", newShape); // self-caching
            return newShape;
        },
        checks: [],
    });
    return clone(schema, def);
}
function extend(schema, shape) {
    if (!isPlainObject(shape)) {
        throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        // Only throw if new shape overlaps with existing shape
        // Use getOwnPropertyDescriptor to check key existence without accessing values
        const existingShape = schema._zod.def.shape;
        for (const key in shape) {
            if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
                throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
            }
        }
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const _shape = { ...schema._zod.def.shape, ...shape };
            assignProp(this, "shape", _shape); // self-caching
            return _shape;
        },
    });
    return clone(schema, def);
}
function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
        throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const _shape = { ...schema._zod.def.shape, ...shape };
            assignProp(this, "shape", _shape); // self-caching
            return _shape;
        },
    });
    return clone(schema, def);
}
function merge(a, b) {
    const def = mergeDefs(a._zod.def, {
        get shape() {
            const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
            assignProp(this, "shape", _shape); // self-caching
            return _shape;
        },
        get catchall() {
            return b._zod.def.catchall;
        },
        checks: [], // delete existing checks
    });
    return clone(a, def);
}
function partial(Class, schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".partial() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const oldShape = schema._zod.def.shape;
            const shape = { ...oldShape };
            if (mask) {
                for (const key in mask) {
                    if (!(key in oldShape)) {
                        throw new Error(`Unrecognized key: "${key}"`);
                    }
                    if (!mask[key])
                        continue;
                    // if (oldShape[key]!._zod.optin === "optional") continue;
                    shape[key] = Class
                        ? new Class({
                            type: "optional",
                            innerType: oldShape[key],
                        })
                        : oldShape[key];
                }
            }
            else {
                for (const key in oldShape) {
                    // if (oldShape[key]!._zod.optin === "optional") continue;
                    shape[key] = Class
                        ? new Class({
                            type: "optional",
                            innerType: oldShape[key],
                        })
                        : oldShape[key];
                }
            }
            assignProp(this, "shape", shape); // self-caching
            return shape;
        },
        checks: [],
    });
    return clone(schema, def);
}
function required(Class, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const oldShape = schema._zod.def.shape;
            const shape = { ...oldShape };
            if (mask) {
                for (const key in mask) {
                    if (!(key in shape)) {
                        throw new Error(`Unrecognized key: "${key}"`);
                    }
                    if (!mask[key])
                        continue;
                    // overwrite with non-optional
                    shape[key] = new Class({
                        type: "nonoptional",
                        innerType: oldShape[key],
                    });
                }
            }
            else {
                for (const key in oldShape) {
                    // overwrite with non-optional
                    shape[key] = new Class({
                        type: "nonoptional",
                        innerType: oldShape[key],
                    });
                }
            }
            assignProp(this, "shape", shape); // self-caching
            return shape;
        },
    });
    return clone(schema, def);
}
// invalid_type | too_big | too_small | invalid_format | not_multiple_of | unrecognized_keys | invalid_union | invalid_key | invalid_element | invalid_value | custom
function aborted(x, startIndex = 0) {
    if (x.aborted === true)
        return true;
    for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue !== true) {
            return true;
        }
    }
    return false;
}
function prefixIssues(path, issues) {
    return issues.map((iss) => {
        var _a;
        (_a = iss).path ?? (_a.path = []);
        iss.path.unshift(path);
        return iss;
    });
}
function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
    const full = { ...iss, path: iss.path ?? [] };
    // for backwards compatibility
    if (!iss.message) {
        const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ??
            unwrapMessage(ctx?.error?.(iss)) ??
            unwrapMessage(config.customError?.(iss)) ??
            unwrapMessage(config.localeError?.(iss)) ??
            "Invalid input";
        full.message = message;
    }
    // delete (full as any).def;
    delete full.inst;
    delete full.continue;
    if (!ctx?.reportInput) {
        delete full.input;
    }
    return full;
}
function getSizableOrigin(input) {
    if (input instanceof Set)
        return "set";
    if (input instanceof Map)
        return "map";
    // @ts-ignore
    if (input instanceof File)
        return "file";
    return "unknown";
}
function getLengthableOrigin(input) {
    if (Array.isArray(input))
        return "array";
    if (typeof input === "string")
        return "string";
    return "unknown";
}
function parsedType(data) {
    const t = typeof data;
    switch (t) {
        case "number": {
            return Number.isNaN(data) ? "nan" : "number";
        }
        case "object": {
            if (data === null) {
                return "null";
            }
            if (Array.isArray(data)) {
                return "array";
            }
            const obj = data;
            if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
                return obj.constructor.name;
            }
        }
    }
    return t;
}
function util_issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
        return {
            message: iss,
            code: "custom",
            input,
            inst,
        };
    }
    return { ...iss };
}
function cleanEnum(obj) {
    return Object.entries(obj)
        .filter(([k, _]) => {
        // return true if NaN, meaning it's not a number, thus a string key
        return Number.isNaN(Number.parseInt(k, 10));
    })
        .map((el) => el[1]);
}
// Codec utility functions
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
    const cleanHex = hex.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string length");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
}
function uint8ArrayToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
// instanceof
class Class {
    constructor(..._args) { }
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/errors.js


const initializer = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
        value: inst._zod,
        enumerable: false,
    });
    Object.defineProperty(inst, "issues", {
        value: def,
        enumerable: false,
    });
    inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
    Object.defineProperty(inst, "toString", {
        value: () => inst.message,
        enumerable: false,
    });
};
const $ZodError = $constructor("$ZodError", initializer);
const $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error.issues) {
        if (sub.path.length > 0) {
            fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
            fieldErrors[sub.path[0]].push(mapper(sub));
        }
        else {
            formErrors.push(mapper(sub));
        }
    }
    return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue) => issue.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
        for (const issue of error.issues) {
            if (issue.code === "invalid_union" && issue.errors.length) {
                issue.errors.map((issues) => processError({ issues }));
            }
            else if (issue.code === "invalid_key") {
                processError({ issues: issue.issues });
            }
            else if (issue.code === "invalid_element") {
                processError({ issues: issue.issues });
            }
            else if (issue.path.length === 0) {
                fieldErrors._errors.push(mapper(issue));
            }
            else {
                let curr = fieldErrors;
                let i = 0;
                while (i < issue.path.length) {
                    const el = issue.path[i];
                    const terminal = i === issue.path.length - 1;
                    if (!terminal) {
                        curr[el] = curr[el] || { _errors: [] };
                    }
                    else {
                        curr[el] = curr[el] || { _errors: [] };
                        curr[el]._errors.push(mapper(issue));
                    }
                    curr = curr[el];
                    i++;
                }
            }
        }
    };
    processError(error);
    return fieldErrors;
}
function treeifyError(error, mapper = (issue) => issue.message) {
    const result = { errors: [] };
    const processError = (error, path = []) => {
        var _a, _b;
        for (const issue of error.issues) {
            if (issue.code === "invalid_union" && issue.errors.length) {
                // regular union error
                issue.errors.map((issues) => processError({ issues }, issue.path));
            }
            else if (issue.code === "invalid_key") {
                processError({ issues: issue.issues }, issue.path);
            }
            else if (issue.code === "invalid_element") {
                processError({ issues: issue.issues }, issue.path);
            }
            else {
                const fullpath = [...path, ...issue.path];
                if (fullpath.length === 0) {
                    result.errors.push(mapper(issue));
                    continue;
                }
                let curr = result;
                let i = 0;
                while (i < fullpath.length) {
                    const el = fullpath[i];
                    const terminal = i === fullpath.length - 1;
                    if (typeof el === "string") {
                        curr.properties ?? (curr.properties = {});
                        (_a = curr.properties)[el] ?? (_a[el] = { errors: [] });
                        curr = curr.properties[el];
                    }
                    else {
                        curr.items ?? (curr.items = []);
                        (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
                        curr = curr.items[el];
                    }
                    if (terminal) {
                        curr.errors.push(mapper(issue));
                    }
                    i++;
                }
            }
        }
    };
    processError(error);
    return result;
}
/** Format a ZodError as a human-readable string in the following form.
 *
 * From
 *
 * ```ts
 * ZodError {
 *   issues: [
 *     {
 *       expected: 'string',
 *       code: 'invalid_type',
 *       path: [ 'username' ],
 *       message: 'Invalid input: expected string'
 *     },
 *     {
 *       expected: 'number',
 *       code: 'invalid_type',
 *       path: [ 'favoriteNumbers', 1 ],
 *       message: 'Invalid input: expected number'
 *     }
 *   ];
 * }
 * ```
 *
 * to
 *
 * ```
 * username
 *   ✖ Expected number, received string at "username
 * favoriteNumbers[0]
 *   ✖ Invalid input: expected number
 * ```
 */
function toDotPath(_path) {
    const segs = [];
    const path = _path.map((seg) => (typeof seg === "object" ? seg.key : seg));
    for (const seg of path) {
        if (typeof seg === "number")
            segs.push(`[${seg}]`);
        else if (typeof seg === "symbol")
            segs.push(`[${JSON.stringify(String(seg))}]`);
        else if (/[^\w$]/.test(seg))
            segs.push(`[${JSON.stringify(seg)}]`);
        else {
            if (segs.length)
                segs.push(".");
            segs.push(seg);
        }
    }
    return segs.join("");
}
function prettifyError(error) {
    const lines = [];
    // sort by path length
    const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
    // Process each issue
    for (const issue of issues) {
        lines.push(`✖ ${issue.message}`);
        if (issue.path?.length)
            lines.push(`  → at ${toDotPath(issue.path)}`);
    }
    // Convert Map to formatted string
    return lines.join("\n");
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/parse.js



const _parse = (_Err) => (schema, value, _ctx, _params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
        throw new $ZodAsyncError();
    }
    if (result.issues.length) {
        const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
        captureStackTrace(e, _params?.callee);
        throw e;
    }
    return result.value;
};
const parse = /* @__PURE__*/ _parse($ZodRealError);
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
        result = await result;
    if (result.issues.length) {
        const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
        captureStackTrace(e, params?.callee);
        throw e;
    }
    return result.value;
};
const parseAsync = /* @__PURE__*/ _parseAsync($ZodRealError);
const _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
        throw new $ZodAsyncError();
    }
    return result.issues.length
        ? {
            success: false,
            error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config()))),
        }
        : { success: true, data: result.value };
};
const safeParse = /* @__PURE__*/ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
        result = await result;
    return result.issues.length
        ? {
            success: false,
            error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config()))),
        }
        : { success: true, data: result.value };
};
const safeParseAsync = /* @__PURE__*/ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parse(_Err)(schema, value, ctx);
};
const encode = /* @__PURE__*/ _encode($ZodRealError);
const _decode = (_Err) => (schema, value, _ctx) => {
    return _parse(_Err)(schema, value, _ctx);
};
const decode = /* @__PURE__*/ _decode($ZodRealError);
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parseAsync(_Err)(schema, value, ctx);
};
const encodeAsync = /* @__PURE__*/ _encodeAsync($ZodRealError);
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _parseAsync(_Err)(schema, value, _ctx);
};
const decodeAsync = /* @__PURE__*/ _decodeAsync($ZodRealError);
const _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
};
const safeEncode = /* @__PURE__*/ _safeEncode($ZodRealError);
const _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
};
const safeDecode = /* @__PURE__*/ _safeDecode($ZodRealError);
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
};
const safeEncodeAsync = /* @__PURE__*/ _safeEncodeAsync($ZodRealError);
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
};
const safeDecodeAsync = /* @__PURE__*/ _safeDecodeAsync($ZodRealError);

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/regexes.js

const cuid = /^[cC][^\s-]{8,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** Implements ISO 8601-2 extensions like explicit +- prefixes, mixing weeks with other units, and fractional/negative components. */
const extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
 *
 * @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
    if (!version)
        return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const uuid4 = /*@__PURE__*/ uuid(4);
const uuid6 = /*@__PURE__*/ uuid(6);
const uuid7 = /*@__PURE__*/ uuid(7);
/** Practical email validation */
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
/** Equivalent to the HTML5 input[type=email] validation implemented by browsers. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email */
const html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
/** The classic emailregex.com regex for RFC 5322-compliant emails */
const rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
/** A loose regex that allows Unicode characters, enforces length limits, and that's about it. */
const unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
const idnEmail = unicodeEmail;
const browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// from https://thekevinscott.com/emojis-in-javascript/#writing-a-regular-expression
const _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
    return new RegExp(_emoji, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const mac = (delimiter) => {
    const escapedDelim = escapeRegex(delimiter ?? ":");
    return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
};
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
// https://stackoverflow.com/questions/7860392/determine-if-string-is-in-base64-using-javascript
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
// based on https://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address
// export const hostname: RegExp = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
const hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
const domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
// https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 (regex sans spaces)
// E.164: leading digit must be 1-9; total digits (excluding '+') between 7-15
const e164 = /^\+[1-9]\d{6,14}$/;
// const dateSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number"
        ? args.precision === -1
            ? `${hhmm}`
            : args.precision === 0
                ? `${hhmm}:[0-5]\\d`
                : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}`
        : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
}
function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
}
// Adapted from https://stackoverflow.com/a/3143231
function datetime(args) {
    const time = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
        opts.push("");
    // if (args.offset) opts.push(`([+-]\\d{2}:\\d{2})`);
    if (args.offset)
        opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const timeRegex = `${time}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string = (params) => {
    const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
};
const bigint = /^-?\d+n?$/;
const integer = /^-?\d+$/;
const number = /^-?\d+(?:\.\d+)?$/;
const regexes_boolean = /^(?:true|false)$/i;
const _null = /^null$/i;

const _undefined = /^undefined$/i;

// regex for string with no uppercase letters
const lowercase = /^[^A-Z]*$/;
// regex for string with no lowercase letters
const uppercase = /^[^a-z]*$/;
// regex for hexadecimal strings (any length)
const hex = /^[0-9a-fA-F]*$/;
// Hash regexes for different algorithms and encodings
// Helper function to create base64 regex with exact length and padding
function fixedBase64(bodyLength, padding) {
    return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
// Helper function to create base64url regex with exact length (no padding)
function fixedBase64url(length) {
    return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
// MD5 (16 bytes): base64 = 24 chars total (22 + "==")
const md5_hex = /^[0-9a-fA-F]{32}$/;
const md5_base64 = /*@__PURE__*/ fixedBase64(22, "==");
const md5_base64url = /*@__PURE__*/ fixedBase64url(22);
// SHA1 (20 bytes): base64 = 28 chars total (27 + "=")
const sha1_hex = /^[0-9a-fA-F]{40}$/;
const sha1_base64 = /*@__PURE__*/ fixedBase64(27, "=");
const sha1_base64url = /*@__PURE__*/ fixedBase64url(27);
// SHA256 (32 bytes): base64 = 44 chars total (43 + "=")
const sha256_hex = /^[0-9a-fA-F]{64}$/;
const sha256_base64 = /*@__PURE__*/ fixedBase64(43, "=");
const sha256_base64url = /*@__PURE__*/ fixedBase64url(43);
// SHA384 (48 bytes): base64 = 64 chars total (no padding)
const sha384_hex = /^[0-9a-fA-F]{96}$/;
const sha384_base64 = /*@__PURE__*/ fixedBase64(64, "");
const sha384_base64url = /*@__PURE__*/ fixedBase64url(64);
// SHA512 (64 bytes): base64 = 88 chars total (86 + "==")
const sha512_hex = /^[0-9a-fA-F]{128}$/;
const sha512_base64 = /*@__PURE__*/ fixedBase64(86, "==");
const sha512_base64url = /*@__PURE__*/ fixedBase64url(86);

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/checks.js
// import { $ZodType } from "./schemas.js";



const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
    var _a;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date",
};
const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
        if (def.value < curr) {
            if (def.inclusive)
                bag.maximum = def.value;
            else
                bag.exclusiveMaximum = def.value;
        }
    });
    inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
            return;
        }
        payload.issues.push({
            origin,
            code: "too_big",
            maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
            input: payload.value,
            inclusive: def.inclusive,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
        if (def.value > curr) {
            if (def.inclusive)
                bag.minimum = def.value;
            else
                bag.exclusiveMinimum = def.value;
        }
    });
    inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
            return;
        }
        payload.issues.push({
            origin,
            code: "too_small",
            minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
            input: payload.value,
            inclusive: def.inclusive,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckMultipleOf = 
/*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst) => {
        var _a;
        (_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
        if (typeof payload.value !== typeof def.value)
            throw new Error("Cannot mix number and bigint in multiple_of check.");
        const isMultiple = typeof payload.value === "bigint"
            ? payload.value % def.value === BigInt(0)
            : floatSafeRemainder(payload.value, def.value) === 0;
        if (isMultiple)
            return;
        payload.issues.push({
            origin: typeof payload.value,
            code: "not_multiple_of",
            divisor: def.value,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def); // no format checks
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.format = def.format;
        bag.minimum = minimum;
        bag.maximum = maximum;
        if (isInt)
            bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        if (isInt) {
            if (!Number.isInteger(input)) {
                // invalid_format issue
                // payload.issues.push({
                //   expected: def.format,
                //   format: def.format,
                //   code: "invalid_format",
                //   input,
                //   inst,
                // });
                // invalid_type issue
                payload.issues.push({
                    expected: origin,
                    format: def.format,
                    code: "invalid_type",
                    continue: false,
                    input,
                    inst,
                });
                return;
                // not_multiple_of issue
                // payload.issues.push({
                //   code: "not_multiple_of",
                //   origin: "number",
                //   input,
                //   inst,
                //   divisor: 1,
                // });
            }
            if (!Number.isSafeInteger(input)) {
                if (input > 0) {
                    // too_big
                    payload.issues.push({
                        input,
                        code: "too_big",
                        maximum: Number.MAX_SAFE_INTEGER,
                        note: "Integers must be within the safe integer range.",
                        inst,
                        origin,
                        inclusive: true,
                        continue: !def.abort,
                    });
                }
                else {
                    // too_small
                    payload.issues.push({
                        input,
                        code: "too_small",
                        minimum: Number.MIN_SAFE_INTEGER,
                        note: "Integers must be within the safe integer range.",
                        inst,
                        origin,
                        inclusive: true,
                        continue: !def.abort,
                    });
                }
                return;
            }
        }
        if (input < minimum) {
            payload.issues.push({
                origin: "number",
                input,
                code: "too_small",
                minimum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
        if (input > maximum) {
            payload.issues.push({
                origin: "number",
                input,
                code: "too_big",
                maximum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodCheckBigIntFormat = /*@__PURE__*/ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
    $ZodCheck.init(inst, def); // no format checks
    const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.format = def.format;
        bag.minimum = minimum;
        bag.maximum = maximum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        if (input < minimum) {
            payload.issues.push({
                origin: "bigint",
                input,
                code: "too_small",
                minimum: minimum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
        if (input > maximum) {
            payload.issues.push({
                origin: "bigint",
                input,
                code: "too_big",
                maximum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodCheckMaxSize = /*@__PURE__*/ $constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY);
        if (def.maximum < curr)
            inst._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size <= def.maximum)
            return;
        payload.issues.push({
            origin: getSizableOrigin(input),
            code: "too_big",
            maximum: def.maximum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckMinSize = /*@__PURE__*/ $constructor("$ZodCheckMinSize", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY);
        if (def.minimum > curr)
            inst._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size >= def.minimum)
            return;
        payload.issues.push({
            origin: getSizableOrigin(input),
            code: "too_small",
            minimum: def.minimum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckSizeEquals = /*@__PURE__*/ $constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.minimum = def.size;
        bag.maximum = def.size;
        bag.size = def.size;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size === def.size)
            return;
        const tooBig = size > def.size;
        payload.issues.push({
            origin: getSizableOrigin(input),
            ...(tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size }),
            inclusive: true,
            exact: true,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY);
        if (def.maximum < curr)
            inst._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length <= def.maximum)
            return;
        const origin = getLengthableOrigin(input);
        payload.issues.push({
            origin,
            code: "too_big",
            maximum: def.maximum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY);
        if (def.minimum > curr)
            inst._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length >= def.minimum)
            return;
        const origin = getLengthableOrigin(input);
        payload.issues.push({
            origin,
            code: "too_small",
            minimum: def.minimum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.minimum = def.length;
        bag.maximum = def.length;
        bag.length = def.length;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length === def.length)
            return;
        const origin = getLengthableOrigin(input);
        const tooBig = length > def.length;
        payload.issues.push({
            origin,
            ...(tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length }),
            inclusive: true,
            exact: true,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.format = def.format;
        if (def.pattern) {
            bag.patterns ?? (bag.patterns = new Set());
            bag.patterns.add(def.pattern);
        }
    });
    if (def.pattern)
        (_a = inst._zod).check ?? (_a.check = (payload) => {
            def.pattern.lastIndex = 0;
            if (def.pattern.test(payload.value))
                return;
            payload.issues.push({
                origin: "string",
                code: "invalid_format",
                format: def.format,
                input: payload.value,
                ...(def.pattern ? { pattern: def.pattern.toString() } : {}),
                inst,
                continue: !def.abort,
            });
        });
    else
        (_b = inst._zod).check ?? (_b.check = () => { });
});
const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "regex",
            input: payload.value,
            pattern: def.pattern.toString(),
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.patterns ?? (bag.patterns = new Set());
        bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
        if (payload.value.includes(def.includes, def.position))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "includes",
            includes: def.includes,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.patterns ?? (bag.patterns = new Set());
        bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
        if (payload.value.startsWith(def.prefix))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "starts_with",
            prefix: def.prefix,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.patterns ?? (bag.patterns = new Set());
        bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
        if (payload.value.endsWith(def.suffix))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "ends_with",
            suffix: def.suffix,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
///////////////////////////////////
/////    $ZodCheckProperty    /////
///////////////////////////////////
function handleCheckPropertyResult(result, payload, property) {
    if (result.issues.length) {
        payload.issues.push(...prefixIssues(property, result.issues));
    }
}
const $ZodCheckProperty = /*@__PURE__*/ $constructor("$ZodCheckProperty", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
        const result = def.schema._zod.run({
            value: payload.value[def.property],
            issues: [],
        }, {});
        if (result instanceof Promise) {
            return result.then((result) => handleCheckPropertyResult(result, payload, def.property));
        }
        handleCheckPropertyResult(result, payload, def.property);
        return;
    };
});
const $ZodCheckMimeType = /*@__PURE__*/ $constructor("$ZodCheckMimeType", (inst, def) => {
    $ZodCheck.init(inst, def);
    const mimeSet = new Set(def.mime);
    inst._zod.onattach.push((inst) => {
        inst._zod.bag.mime = def.mime;
    });
    inst._zod.check = (payload) => {
        if (mimeSet.has(payload.value.type))
            return;
        payload.issues.push({
            code: "invalid_value",
            values: def.mime,
            input: payload.value.type,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
        payload.value = def.tx(payload.value);
    };
});

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/doc.js
class Doc {
    constructor(args = []) {
        this.content = [];
        this.indent = 0;
        if (this)
            this.args = args;
    }
    indented(fn) {
        this.indent += 1;
        fn(this);
        this.indent -= 1;
    }
    write(arg) {
        if (typeof arg === "function") {
            arg(this, { execution: "sync" });
            arg(this, { execution: "async" });
            return;
        }
        const content = arg;
        const lines = content.split("\n").filter((x) => x);
        const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
        const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
        for (const line of dedented) {
            this.content.push(line);
        }
    }
    compile() {
        const F = Function;
        const args = this?.args;
        const content = this?.content ?? [``];
        const lines = [...content.map((x) => `  ${x}`)];
        // console.log(lines.join("\n"));
        return new F(...args, lines.join("\n"));
    }
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/versions.js
const version = {
    major: 4,
    minor: 3,
    patch: 6,
};

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/schemas.js







const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def; // set _def property
    inst._zod.bag = inst._zod.bag || {}; // initialize _bag object
    inst._zod.version = version;
    const checks = [...(inst._zod.def.checks ?? [])];
    // if inst is itself a checks.$ZodCheck, run it as a check
    if (inst._zod.traits.has("$ZodCheck")) {
        checks.unshift(inst);
    }
    for (const ch of checks) {
        for (const fn of ch._zod.onattach) {
            fn(inst);
        }
    }
    if (checks.length === 0) {
        // deferred initializer
        // inst._zod.parse is not yet defined
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        inst._zod.deferred?.push(() => {
            inst._zod.run = inst._zod.parse;
        });
    }
    else {
        const runChecks = (payload, checks, ctx) => {
            let isAborted = aborted(payload);
            let asyncResult;
            for (const ch of checks) {
                if (ch._zod.def.when) {
                    const shouldRun = ch._zod.def.when(payload);
                    if (!shouldRun)
                        continue;
                }
                else if (isAborted) {
                    continue;
                }
                const currLen = payload.issues.length;
                const _ = ch._zod.check(payload);
                if (_ instanceof Promise && ctx?.async === false) {
                    throw new $ZodAsyncError();
                }
                if (asyncResult || _ instanceof Promise) {
                    asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                        await _;
                        const nextLen = payload.issues.length;
                        if (nextLen === currLen)
                            return;
                        if (!isAborted)
                            isAborted = aborted(payload, currLen);
                    });
                }
                else {
                    const nextLen = payload.issues.length;
                    if (nextLen === currLen)
                        continue;
                    if (!isAborted)
                        isAborted = aborted(payload, currLen);
                }
            }
            if (asyncResult) {
                return asyncResult.then(() => {
                    return payload;
                });
            }
            return payload;
        };
        const handleCanaryResult = (canary, payload, ctx) => {
            // abort if the canary is aborted
            if (aborted(canary)) {
                canary.aborted = true;
                return canary;
            }
            // run checks first, then
            const checkResult = runChecks(payload, checks, ctx);
            if (checkResult instanceof Promise) {
                if (ctx.async === false)
                    throw new $ZodAsyncError();
                return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
            }
            return inst._zod.parse(checkResult, ctx);
        };
        inst._zod.run = (payload, ctx) => {
            if (ctx.skipChecks) {
                return inst._zod.parse(payload, ctx);
            }
            if (ctx.direction === "backward") {
                // run canary
                // initial pass (no checks)
                const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
                if (canary instanceof Promise) {
                    return canary.then((canary) => {
                        return handleCanaryResult(canary, payload, ctx);
                    });
                }
                return handleCanaryResult(canary, payload, ctx);
            }
            // forward
            const result = inst._zod.parse(payload, ctx);
            if (result instanceof Promise) {
                if (ctx.async === false)
                    throw new $ZodAsyncError();
                return result.then((result) => runChecks(result, checks, ctx));
            }
            return runChecks(result, checks, ctx);
        };
    }
    // Lazy initialize ~standard to avoid creating objects for every schema
    defineLazy(inst, "~standard", () => ({
        validate: (value) => {
            try {
                const r = safeParse(inst, value);
                return r.success ? { value: r.data } : { issues: r.error?.issues };
            }
            catch (_) {
                return safeParseAsync(inst, value).then((r) => (r.success ? { value: r.data } : { issues: r.error?.issues }));
            }
        },
        vendor: "zod",
        version: 1,
    }));
});

const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...(inst?._zod.bag?.patterns ?? [])].pop() ?? string(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
        if (def.coerce)
            try {
                payload.value = String(payload.value);
            }
            catch (_) { }
        if (typeof payload.value === "string")
            return payload;
        payload.issues.push({
            expected: "string",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
    // check initialization must come first
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
});
const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
        const versionMap = {
            v1: 1,
            v2: 2,
            v3: 3,
            v4: 4,
            v5: 5,
            v6: 6,
            v7: 7,
            v8: 8,
        };
        const v = versionMap[def.version];
        if (v === undefined)
            throw new Error(`Invalid UUID version: "${def.version}"`);
        def.pattern ?? (def.pattern = uuid(v));
    }
    else
        def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
});
const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        try {
            // Trim whitespace from input
            const trimmed = payload.value.trim();
            // @ts-ignore
            const url = new URL(trimmed);
            if (def.hostname) {
                def.hostname.lastIndex = 0;
                if (!def.hostname.test(url.hostname)) {
                    payload.issues.push({
                        code: "invalid_format",
                        format: "url",
                        note: "Invalid hostname",
                        pattern: def.hostname.source,
                        input: payload.value,
                        inst,
                        continue: !def.abort,
                    });
                }
            }
            if (def.protocol) {
                def.protocol.lastIndex = 0;
                if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
                    payload.issues.push({
                        code: "invalid_format",
                        format: "url",
                        note: "Invalid protocol",
                        pattern: def.protocol.source,
                        input: payload.value,
                        inst,
                        continue: !def.abort,
                    });
                }
            }
            // Set the output value based on normalize flag
            if (def.normalize) {
                // Use normalized URL
                payload.value = url.href;
            }
            else {
                // Preserve the original input (trimmed)
                payload.value = trimmed;
            }
            return;
        }
        catch (_) {
            payload.issues.push({
                code: "invalid_format",
                format: "url",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
});
const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
});
const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
});
const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv6`;
    inst._zod.check = (payload) => {
        try {
            // @ts-ignore
            new URL(`http://[${payload.value}]`);
            // return;
        }
        catch {
            payload.issues.push({
                code: "invalid_format",
                format: "ipv6",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodMAC = /*@__PURE__*/ $constructor("$ZodMAC", (inst, def) => {
    def.pattern ?? (def.pattern = mac(def.delimiter));
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `mac`;
});
const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6); // not used for validation
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        const parts = payload.value.split("/");
        try {
            if (parts.length !== 2)
                throw new Error();
            const [address, prefix] = parts;
            if (!prefix)
                throw new Error();
            const prefixNum = Number(prefix);
            if (`${prefixNum}` !== prefix)
                throw new Error();
            if (prefixNum < 0 || prefixNum > 128)
                throw new Error();
            // @ts-ignore
            new URL(`http://[${address}]`);
        }
        catch {
            payload.issues.push({
                code: "invalid_format",
                format: "cidrv6",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
//////////////////////////////   ZodBase64   //////////////////////////////
function isValidBase64(data) {
    if (data === "")
        return true;
    if (data.length % 4 !== 0)
        return false;
    try {
        // @ts-ignore
        atob(data);
        return true;
    }
    catch {
        return false;
    }
}
const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64";
    inst._zod.check = (payload) => {
        if (isValidBase64(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "base64",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
//////////////////////////////   ZodBase64   //////////////////////////////
function isValidBase64URL(data) {
    if (!base64url.test(data))
        return false;
    const base64 = data.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/"));
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return isValidBase64(padded);
}
const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64url";
    inst._zod.check = (payload) => {
        if (isValidBase64URL(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "base64url",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
});
//////////////////////////////   ZodJWT   //////////////////////////////
function isValidJWT(token, algorithm = null) {
    try {
        const tokensParts = token.split(".");
        if (tokensParts.length !== 3)
            return false;
        const [header] = tokensParts;
        if (!header)
            return false;
        // @ts-ignore
        const parsedHeader = JSON.parse(atob(header));
        if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
            return false;
        if (!parsedHeader.alg)
            return false;
        if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
            return false;
        return true;
    }
    catch {
        return false;
    }
}
const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidJWT(payload.value, def.alg))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "jwt",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCustomStringFormat = /*@__PURE__*/ $constructor("$ZodCustomStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (def.fn(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: def.format,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = Number(payload.value);
            }
            catch (_) { }
        const input = payload.value;
        if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
            return payload;
        }
        const received = typeof input === "number"
            ? Number.isNaN(input)
                ? "NaN"
                : !Number.isFinite(input)
                    ? "Infinity"
                    : undefined
            : undefined;
        payload.issues.push({
            expected: "number",
            code: "invalid_type",
            input,
            inst,
            ...(received ? { received } : {}),
        });
        return payload;
    };
});
const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def); // no format checks
});
const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = regexes_boolean;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = Boolean(payload.value);
            }
            catch (_) { }
        const input = payload.value;
        if (typeof input === "boolean")
            return payload;
        payload.issues.push({
            expected: "boolean",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodBigInt = /*@__PURE__*/ $constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = bigint;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = BigInt(payload.value);
            }
            catch (_) { }
        if (typeof payload.value === "bigint")
            return payload;
        payload.issues.push({
            expected: "bigint",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
const $ZodBigIntFormat = /*@__PURE__*/ $constructor("$ZodBigIntFormat", (inst, def) => {
    $ZodCheckBigIntFormat.init(inst, def);
    $ZodBigInt.init(inst, def); // no format checks
});
const $ZodSymbol = /*@__PURE__*/ $constructor("$ZodSymbol", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "symbol")
            return payload;
        payload.issues.push({
            expected: "symbol",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodUndefined = /*@__PURE__*/ $constructor("$ZodUndefined", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _undefined;
    inst._zod.values = new Set([undefined]);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
            return payload;
        payload.issues.push({
            expected: "undefined",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (input === null)
            return payload;
        payload.issues.push({
            expected: "null",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodAny = /*@__PURE__*/ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
});
const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        payload.issues.push({
            expected: "never",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
const $ZodVoid = /*@__PURE__*/ $constructor("$ZodVoid", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
            return payload;
        payload.issues.push({
            expected: "void",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodDate = /*@__PURE__*/ $constructor("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce) {
            try {
                payload.value = new Date(payload.value);
            }
            catch (_err) { }
        }
        const input = payload.value;
        const isDate = input instanceof Date;
        const isValidDate = isDate && !Number.isNaN(input.getTime());
        if (isValidDate)
            return payload;
        payload.issues.push({
            expected: "date",
            code: "invalid_type",
            input,
            ...(isDate ? { received: "Invalid Date" } : {}),
            inst,
        });
        return payload;
    };
});
function handleArrayResult(result, final, index) {
    if (result.issues.length) {
        final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
            payload.issues.push({
                expected: "array",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        payload.value = Array(input.length);
        const proms = [];
        for (let i = 0; i < input.length; i++) {
            const item = input[i];
            const result = def.element._zod.run({
                value: item,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleArrayResult(result, payload, i)));
            }
            else {
                handleArrayResult(result, payload, i);
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => payload);
        }
        return payload; //handleArrayResultsAsync(parseResults, final);
    };
});
function handlePropertyResult(result, final, key, input, isOptionalOut) {
    if (result.issues.length) {
        // For optional-out schemas, ignore errors on absent keys
        if (isOptionalOut && !(key in input)) {
            return;
        }
        final.issues.push(...prefixIssues(key, result.issues));
    }
    if (result.value === undefined) {
        if (key in input) {
            final.value[key] = undefined;
        }
    }
    else {
        final.value[key] = result.value;
    }
}
function normalizeDef(def) {
    const keys = Object.keys(def.shape);
    for (const k of keys) {
        if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
            throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
        }
    }
    const okeys = optionalKeys(def.shape);
    return {
        ...def,
        keys,
        keySet: new Set(keys),
        numKeys: keys.length,
        optionalKeys: new Set(okeys),
    };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
    const unrecognized = [];
    // iterate over input keys
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    const isOptionalOut = _catchall.optout === "optional";
    for (const key in input) {
        if (keySet.has(key))
            continue;
        if (t === "never") {
            unrecognized.push(key);
            continue;
        }
        const r = _catchall.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
            proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalOut)));
        }
        else {
            handlePropertyResult(r, payload, key, input, isOptionalOut);
        }
    }
    if (unrecognized.length) {
        payload.issues.push({
            code: "unrecognized_keys",
            keys: unrecognized,
            input,
            inst,
        });
    }
    if (!proms.length)
        return payload;
    return Promise.all(proms).then(() => {
        return payload;
    });
}
const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
    // requires cast because technically $ZodObject doesn't extend
    $ZodType.init(inst, def);
    // const sh = def.shape;
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!desc?.get) {
        const sh = def.shape;
        Object.defineProperty(def, "shape", {
            get: () => {
                const newSh = { ...sh };
                Object.defineProperty(def, "shape", {
                    value: newSh,
                });
                return newSh;
            },
        });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
        const shape = def.shape;
        const propValues = {};
        for (const key in shape) {
            const field = shape[key]._zod;
            if (field.values) {
                propValues[key] ?? (propValues[key] = new Set());
                for (const v of field.values)
                    propValues[key].add(v);
            }
        }
        return propValues;
    });
    const isObject = util_isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject(input)) {
            payload.issues.push({
                expected: "object",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        payload.value = {};
        const proms = [];
        const shape = value.shape;
        for (const key of value.keys) {
            const el = shape[key];
            const isOptionalOut = el._zod.optout === "optional";
            const r = el._zod.run({ value: input[key], issues: [] }, ctx);
            if (r instanceof Promise) {
                proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalOut)));
            }
            else {
                handlePropertyResult(r, payload, key, input, isOptionalOut);
            }
        }
        if (!catchall) {
            return proms.length ? Promise.all(proms).then(() => payload) : payload;
        }
        return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
});
const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
    // requires cast because technically $ZodObject doesn't extend
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
        const doc = new Doc(["shape", "payload", "ctx"]);
        const normalized = _normalized.value;
        const parseStr = (key) => {
            const k = esc(key);
            return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
        };
        doc.write(`const input = payload.value;`);
        const ids = Object.create(null);
        let counter = 0;
        for (const key of normalized.keys) {
            ids[key] = `key_${counter++}`;
        }
        // A: preserve key order {
        doc.write(`const newResult = {};`);
        for (const key of normalized.keys) {
            const id = ids[key];
            const k = esc(key);
            const schema = shape[key];
            const isOptionalOut = schema?._zod?.optout === "optional";
            doc.write(`const ${id} = ${parseStr(key)};`);
            if (isOptionalOut) {
                // For optional-out schemas, ignore errors on absent keys
                doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
            }
            else {
                doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
            }
        }
        doc.write(`payload.value = newResult;`);
        doc.write(`return payload;`);
        const fn = doc.compile();
        return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject = util_isObject;
    const jit = !globalConfig.jitless;
    const allowsEval = util_allowsEval;
    const fastEnabled = jit && allowsEval.value; // && !def.catchall;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject(input)) {
            payload.issues.push({
                expected: "object",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
            // always synchronous
            if (!fastpass)
                fastpass = generateFastpass(def.shape);
            payload = fastpass(payload, ctx);
            if (!catchall)
                return payload;
            return handleCatchall([], input, payload, ctx, value, inst);
        }
        return superParse(payload, ctx);
    };
});
function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
        if (result.issues.length === 0) {
            final.value = result.value;
            return final;
        }
    }
    const nonaborted = results.filter((r) => !aborted(r));
    if (nonaborted.length === 1) {
        final.value = nonaborted[0].value;
        return nonaborted[0];
    }
    final.issues.push({
        code: "invalid_union",
        input: final.value,
        inst,
        errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config()))),
    });
    return final;
}
const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "values", () => {
        if (def.options.every((o) => o._zod.values)) {
            return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
        }
        return undefined;
    });
    defineLazy(inst._zod, "pattern", () => {
        if (def.options.every((o) => o._zod.pattern)) {
            const patterns = def.options.map((o) => o._zod.pattern);
            return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
        }
        return undefined;
    });
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
        if (single) {
            return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
            const result = option._zod.run({
                value: payload.value,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                results.push(result);
                async = true;
            }
            else {
                if (result.issues.length === 0)
                    return result;
                results.push(result);
            }
        }
        if (!async)
            return handleUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results) => {
            return handleUnionResults(results, payload, inst, ctx);
        });
    };
});
function handleExclusiveUnionResults(results, final, inst, ctx) {
    const successes = results.filter((r) => r.issues.length === 0);
    if (successes.length === 1) {
        final.value = successes[0].value;
        return final;
    }
    if (successes.length === 0) {
        // No matches - same as regular union
        final.issues.push({
            code: "invalid_union",
            input: final.value,
            inst,
            errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config()))),
        });
    }
    else {
        // Multiple matches - exclusive union failure
        final.issues.push({
            code: "invalid_union",
            input: final.value,
            inst,
            errors: [],
            inclusive: false,
        });
    }
    return final;
}
const $ZodXor = /*@__PURE__*/ $constructor("$ZodXor", (inst, def) => {
    $ZodUnion.init(inst, def);
    def.inclusive = false;
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
        if (single) {
            return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
            const result = option._zod.run({
                value: payload.value,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                results.push(result);
                async = true;
            }
            else {
                results.push(result);
            }
        }
        if (!async)
            return handleExclusiveUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results) => {
            return handleExclusiveUnionResults(results, payload, inst, ctx);
        });
    };
});
const $ZodDiscriminatedUnion = 
/*@__PURE__*/
$constructor("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazy(inst._zod, "propValues", () => {
        const propValues = {};
        for (const option of def.options) {
            const pv = option._zod.propValues;
            if (!pv || Object.keys(pv).length === 0)
                throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
            for (const [k, v] of Object.entries(pv)) {
                if (!propValues[k])
                    propValues[k] = new Set();
                for (const val of v) {
                    propValues[k].add(val);
                }
            }
        }
        return propValues;
    });
    const disc = cached(() => {
        const opts = def.options;
        const map = new Map();
        for (const o of opts) {
            const values = o._zod.propValues?.[def.discriminator];
            if (!values || values.size === 0)
                throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
            for (const v of values) {
                if (map.has(v)) {
                    throw new Error(`Duplicate discriminator value "${String(v)}"`);
                }
                map.set(v, o);
            }
        }
        return map;
    });
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!util_isObject(input)) {
            payload.issues.push({
                code: "invalid_type",
                expected: "object",
                input,
                inst,
            });
            return payload;
        }
        const opt = disc.value.get(input?.[def.discriminator]);
        if (opt) {
            return opt._zod.run(payload, ctx);
        }
        if (def.unionFallback) {
            return _super(payload, ctx);
        }
        // no matching discriminator
        payload.issues.push({
            code: "invalid_union",
            errors: [],
            note: "No matching discriminator",
            discriminator: def.discriminator,
            input,
            path: [def.discriminator],
            inst,
        });
        return payload;
    };
});
const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        const left = def.left._zod.run({ value: input, issues: [] }, ctx);
        const right = def.right._zod.run({ value: input, issues: [] }, ctx);
        const async = left instanceof Promise || right instanceof Promise;
        if (async) {
            return Promise.all([left, right]).then(([left, right]) => {
                return handleIntersectionResults(payload, left, right);
            });
        }
        return handleIntersectionResults(payload, left, right);
    };
});
function mergeValues(a, b) {
    // const aType = parse.t(a);
    // const bType = parse.t(b);
    if (a === b) {
        return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
        return { valid: true, data: a };
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const bKeys = Object.keys(b);
        const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
            const sharedValue = mergeValues(a[key], b[key]);
            if (!sharedValue.valid) {
                return {
                    valid: false,
                    mergeErrorPath: [key, ...sharedValue.mergeErrorPath],
                };
            }
            newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return { valid: false, mergeErrorPath: [] };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
            const itemA = a[index];
            const itemB = b[index];
            const sharedValue = mergeValues(itemA, itemB);
            if (!sharedValue.valid) {
                return {
                    valid: false,
                    mergeErrorPath: [index, ...sharedValue.mergeErrorPath],
                };
            }
            newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
    // Track which side(s) report each key as unrecognized
    const unrecKeys = new Map();
    let unrecIssue;
    for (const iss of left.issues) {
        if (iss.code === "unrecognized_keys") {
            unrecIssue ?? (unrecIssue = iss);
            for (const k of iss.keys) {
                if (!unrecKeys.has(k))
                    unrecKeys.set(k, {});
                unrecKeys.get(k).l = true;
            }
        }
        else {
            result.issues.push(iss);
        }
    }
    for (const iss of right.issues) {
        if (iss.code === "unrecognized_keys") {
            for (const k of iss.keys) {
                if (!unrecKeys.has(k))
                    unrecKeys.set(k, {});
                unrecKeys.get(k).r = true;
            }
        }
        else {
            result.issues.push(iss);
        }
    }
    // Report only keys unrecognized by BOTH sides
    const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length && unrecIssue) {
        result.issues.push({ ...unrecIssue, keys: bothKeys });
    }
    if (aborted(result))
        return result;
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
        throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
}
const $ZodTuple = /*@__PURE__*/ $constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
            payload.issues.push({
                input,
                inst,
                expected: "tuple",
                code: "invalid_type",
            });
            return payload;
        }
        payload.value = [];
        const proms = [];
        const reversedIndex = [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
        const optStart = reversedIndex === -1 ? 0 : items.length - reversedIndex;
        if (!def.rest) {
            const tooBig = input.length > items.length;
            const tooSmall = input.length < optStart - 1;
            if (tooBig || tooSmall) {
                payload.issues.push({
                    ...(tooBig
                        ? { code: "too_big", maximum: items.length, inclusive: true }
                        : { code: "too_small", minimum: items.length }),
                    input,
                    inst,
                    origin: "array",
                });
                return payload;
            }
        }
        let i = -1;
        for (const item of items) {
            i++;
            if (i >= input.length)
                if (i >= optStart)
                    continue;
            const result = item._zod.run({
                value: input[i],
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleTupleResult(result, payload, i)));
            }
            else {
                handleTupleResult(result, payload, i);
            }
        }
        if (def.rest) {
            const rest = input.slice(items.length);
            for (const el of rest) {
                i++;
                const result = def.rest._zod.run({
                    value: el,
                    issues: [],
                }, ctx);
                if (result instanceof Promise) {
                    proms.push(result.then((result) => handleTupleResult(result, payload, i)));
                }
                else {
                    handleTupleResult(result, payload, i);
                }
            }
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
});
function handleTupleResult(result, final, index) {
    if (result.issues.length) {
        final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
}
const $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isPlainObject(input)) {
            payload.issues.push({
                expected: "record",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        const proms = [];
        const values = def.keyType._zod.values;
        if (values) {
            payload.value = {};
            const recordKeys = new Set();
            for (const key of values) {
                if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
                    recordKeys.add(typeof key === "number" ? key.toString() : key);
                    const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
                    if (result instanceof Promise) {
                        proms.push(result.then((result) => {
                            if (result.issues.length) {
                                payload.issues.push(...prefixIssues(key, result.issues));
                            }
                            payload.value[key] = result.value;
                        }));
                    }
                    else {
                        if (result.issues.length) {
                            payload.issues.push(...prefixIssues(key, result.issues));
                        }
                        payload.value[key] = result.value;
                    }
                }
            }
            let unrecognized;
            for (const key in input) {
                if (!recordKeys.has(key)) {
                    unrecognized = unrecognized ?? [];
                    unrecognized.push(key);
                }
            }
            if (unrecognized && unrecognized.length > 0) {
                payload.issues.push({
                    code: "unrecognized_keys",
                    input,
                    inst,
                    keys: unrecognized,
                });
            }
        }
        else {
            payload.value = {};
            for (const key of Reflect.ownKeys(input)) {
                if (key === "__proto__")
                    continue;
                let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
                if (keyResult instanceof Promise) {
                    throw new Error("Async schemas not supported in object keys currently");
                }
                // Numeric string fallback: if key is a numeric string and failed, retry with Number(key)
                // This handles z.number(), z.literal([1, 2, 3]), and unions containing numeric literals
                const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
                if (checkNumericKey) {
                    const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
                    if (retryResult instanceof Promise) {
                        throw new Error("Async schemas not supported in object keys currently");
                    }
                    if (retryResult.issues.length === 0) {
                        keyResult = retryResult;
                    }
                }
                if (keyResult.issues.length) {
                    if (def.mode === "loose") {
                        // Pass through unchanged
                        payload.value[key] = input[key];
                    }
                    else {
                        // Default "strict" behavior: error on invalid key
                        payload.issues.push({
                            code: "invalid_key",
                            origin: "record",
                            issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                            input: key,
                            path: [key],
                            inst,
                        });
                    }
                    continue;
                }
                const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
                if (result instanceof Promise) {
                    proms.push(result.then((result) => {
                        if (result.issues.length) {
                            payload.issues.push(...prefixIssues(key, result.issues));
                        }
                        payload.value[keyResult.value] = result.value;
                    }));
                }
                else {
                    if (result.issues.length) {
                        payload.issues.push(...prefixIssues(key, result.issues));
                    }
                    payload.value[keyResult.value] = result.value;
                }
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => payload);
        }
        return payload;
    };
});
const $ZodMap = /*@__PURE__*/ $constructor("$ZodMap", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Map)) {
            payload.issues.push({
                expected: "map",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        const proms = [];
        payload.value = new Map();
        for (const [key, value] of input) {
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            const valueResult = def.valueType._zod.run({ value: value, issues: [] }, ctx);
            if (keyResult instanceof Promise || valueResult instanceof Promise) {
                proms.push(Promise.all([keyResult, valueResult]).then(([keyResult, valueResult]) => {
                    handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
                }));
            }
            else {
                handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
            }
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
    if (keyResult.issues.length) {
        if (propertyKeyTypes.has(typeof key)) {
            final.issues.push(...prefixIssues(key, keyResult.issues));
        }
        else {
            final.issues.push({
                code: "invalid_key",
                origin: "map",
                input,
                inst,
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
            });
        }
    }
    if (valueResult.issues.length) {
        if (propertyKeyTypes.has(typeof key)) {
            final.issues.push(...prefixIssues(key, valueResult.issues));
        }
        else {
            final.issues.push({
                origin: "map",
                code: "invalid_element",
                input,
                inst,
                key: key,
                issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
            });
        }
    }
    final.value.set(keyResult.value, valueResult.value);
}
const $ZodSet = /*@__PURE__*/ $constructor("$ZodSet", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Set)) {
            payload.issues.push({
                input,
                inst,
                expected: "set",
                code: "invalid_type",
            });
            return payload;
        }
        const proms = [];
        payload.value = new Set();
        for (const item of input) {
            const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleSetResult(result, payload)));
            }
            else
                handleSetResult(result, payload);
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
});
function handleSetResult(result, final) {
    if (result.issues.length) {
        final.issues.push(...result.issues);
    }
    final.value.add(result.value);
}
const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values
        .filter((k) => propertyKeyTypes.has(typeof k))
        .map((o) => (typeof o === "string" ? escapeRegex(o) : o.toString()))
        .join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (valuesSet.has(input)) {
            return payload;
        }
        payload.issues.push({
            code: "invalid_value",
            values,
            input,
            inst,
        });
        return payload;
    };
});
const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
        throw new Error("Cannot create literal schema with no valid values");
    }
    const values = new Set(def.values);
    inst._zod.values = values;
    inst._zod.pattern = new RegExp(`^(${def.values
        .map((o) => (typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)))
        .join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (values.has(input)) {
            return payload;
        }
        payload.issues.push({
            code: "invalid_value",
            values: def.values,
            input,
            inst,
        });
        return payload;
    };
});
const $ZodFile = /*@__PURE__*/ $constructor("$ZodFile", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        // @ts-ignore
        if (input instanceof File)
            return payload;
        payload.issues.push({
            expected: "file",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            throw new $ZodEncodeError(inst.constructor.name);
        }
        const _out = def.transform(payload.value, payload);
        if (ctx.async) {
            const output = _out instanceof Promise ? _out : Promise.resolve(_out);
            return output.then((output) => {
                payload.value = output;
                return payload;
            });
        }
        if (_out instanceof Promise) {
            throw new $ZodAsyncError();
        }
        payload.value = _out;
        return payload;
    };
});
function handleOptionalResult(result, input) {
    if (result.issues.length && input === undefined) {
        return { issues: [], value: undefined };
    }
    return result;
}
const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
        return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
    });
    defineLazy(inst._zod, "pattern", () => {
        const pattern = def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        if (def.innerType._zod.optin === "optional") {
            const result = def.innerType._zod.run(payload, ctx);
            if (result instanceof Promise)
                return result.then((r) => handleOptionalResult(r, payload.value));
            return handleOptionalResult(result, payload.value);
        }
        if (payload.value === undefined) {
            return payload;
        }
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
    // Call parent init - inherits optin/optout = "optional"
    $ZodOptional.init(inst, def);
    // Override values/pattern to NOT add undefined
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
    // Override parse to just delegate (no undefined handling)
    inst._zod.parse = (payload, ctx) => {
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
        const pattern = def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    defineLazy(inst._zod, "values", () => {
        return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        // Forward direction (decode): allow null to pass through
        if (payload.value === null)
            return payload;
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    // inst._zod.qin = "true";
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply defaults for undefined input
        if (payload.value === undefined) {
            payload.value = def.defaultValue;
            /**
             * $ZodDefault returns the default value immediately in forward direction.
             * It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
            return payload;
        }
        // Forward direction: continue with default handling
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleDefaultResult(result, def));
        }
        return handleDefaultResult(result, def);
    };
});
function handleDefaultResult(payload, def) {
    if (payload.value === undefined) {
        payload.value = def.defaultValue;
    }
    return payload;
}
const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply prefault for undefined input
        if (payload.value === undefined) {
            payload.value = def.defaultValue;
        }
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
        const v = def.innerType._zod.values;
        return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleNonOptionalResult(result, inst));
        }
        return handleNonOptionalResult(result, inst);
    };
});
function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === undefined) {
        payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: payload.value,
            inst,
        });
    }
    return payload;
}
const $ZodSuccess = /*@__PURE__*/ $constructor("$ZodSuccess", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            throw new $ZodEncodeError("ZodSuccess");
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => {
                payload.value = result.issues.length === 0;
                return payload;
            });
        }
        payload.value = result.issues.length === 0;
        return payload;
    };
});
const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply catch logic
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => {
                payload.value = result.value;
                if (result.issues.length) {
                    payload.value = def.catchValue({
                        ...payload,
                        error: {
                            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                        },
                        input: payload.value,
                    });
                    payload.issues = [];
                }
                return payload;
            });
        }
        payload.value = result.value;
        if (result.issues.length) {
            payload.value = def.catchValue({
                ...payload,
                error: {
                    issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                },
                input: payload.value,
            });
            payload.issues = [];
        }
        return payload;
    };
});
const $ZodNaN = /*@__PURE__*/ $constructor("$ZodNaN", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
            payload.issues.push({
                input: payload.value,
                inst,
                expected: "nan",
                code: "invalid_type",
            });
            return payload;
        }
        return payload;
    };
});
const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            const right = def.out._zod.run(payload, ctx);
            if (right instanceof Promise) {
                return right.then((right) => handlePipeResult(right, def.in, ctx));
            }
            return handlePipeResult(right, def.in, ctx);
        }
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
            return left.then((left) => handlePipeResult(left, def.out, ctx));
        }
        return handlePipeResult(left, def.out, ctx);
    };
});
function handlePipeResult(left, next, ctx) {
    if (left.issues.length) {
        // prevent further checks
        left.aborted = true;
        return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
const $ZodCodec = /*@__PURE__*/ $constructor("$ZodCodec", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
        const direction = ctx.direction || "forward";
        if (direction === "forward") {
            const left = def.in._zod.run(payload, ctx);
            if (left instanceof Promise) {
                return left.then((left) => handleCodecAResult(left, def, ctx));
            }
            return handleCodecAResult(left, def, ctx);
        }
        else {
            const right = def.out._zod.run(payload, ctx);
            if (right instanceof Promise) {
                return right.then((right) => handleCodecAResult(right, def, ctx));
            }
            return handleCodecAResult(right, def, ctx);
        }
    };
});
function handleCodecAResult(result, def, ctx) {
    if (result.issues.length) {
        // prevent further checks
        result.aborted = true;
        return result;
    }
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
        const transformed = def.transform(result.value, result);
        if (transformed instanceof Promise) {
            return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
        }
        return handleCodecTxResult(result, transformed, def.out, ctx);
    }
    else {
        const transformed = def.reverseTransform(result.value, result);
        if (transformed instanceof Promise) {
            return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
        }
        return handleCodecTxResult(result, transformed, def.in, ctx);
    }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
    // Check if transform added any issues
    if (left.issues.length) {
        left.aborted = true;
        return left;
    }
    return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
    defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then(handleReadonlyResult);
        }
        return handleReadonlyResult(result);
    };
});
function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
}
const $ZodTemplateLiteral = /*@__PURE__*/ $constructor("$ZodTemplateLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
        if (typeof part === "object" && part !== null) {
            // is Zod schema
            if (!part._zod.pattern) {
                // if (!source)
                throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
            }
            const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
            if (!source)
                throw new Error(`Invalid template literal part: ${part._zod.traits}`);
            const start = source.startsWith("^") ? 1 : 0;
            const end = source.endsWith("$") ? source.length - 1 : source.length;
            regexParts.push(source.slice(start, end));
        }
        else if (part === null || primitiveTypes.has(typeof part)) {
            regexParts.push(escapeRegex(`${part}`));
        }
        else {
            throw new Error(`Invalid template literal part: ${part}`);
        }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "string") {
            payload.issues.push({
                input: payload.value,
                inst,
                expected: "string",
                code: "invalid_type",
            });
            return payload;
        }
        inst._zod.pattern.lastIndex = 0;
        if (!inst._zod.pattern.test(payload.value)) {
            payload.issues.push({
                input: payload.value,
                inst,
                code: "invalid_format",
                format: def.format ?? "template_literal",
                pattern: inst._zod.pattern.source,
            });
            return payload;
        }
        return payload;
    };
});
const $ZodFunction = /*@__PURE__*/ $constructor("$ZodFunction", (inst, def) => {
    $ZodType.init(inst, def);
    inst._def = def;
    inst._zod.def = def;
    inst.implement = (func) => {
        if (typeof func !== "function") {
            throw new Error("implement() must be called with a function");
        }
        return function (...args) {
            const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
            const result = Reflect.apply(func, this, parsedArgs);
            if (inst._def.output) {
                return parse(inst._def.output, result);
            }
            return result;
        };
    };
    inst.implementAsync = (func) => {
        if (typeof func !== "function") {
            throw new Error("implementAsync() must be called with a function");
        }
        return async function (...args) {
            const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
            const result = await Reflect.apply(func, this, parsedArgs);
            if (inst._def.output) {
                return await parseAsync(inst._def.output, result);
            }
            return result;
        };
    };
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "function") {
            payload.issues.push({
                code: "invalid_type",
                expected: "function",
                input: payload.value,
                inst,
            });
            return payload;
        }
        // Check if output is a promise type to determine if we should use async implementation
        const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
        if (hasPromiseOutput) {
            payload.value = inst.implementAsync(payload.value);
        }
        else {
            payload.value = inst.implement(payload.value);
        }
        return payload;
    };
    inst.input = (...args) => {
        const F = inst.constructor;
        if (Array.isArray(args[0])) {
            return new F({
                type: "function",
                input: new $ZodTuple({
                    type: "tuple",
                    items: args[0],
                    rest: args[1],
                }),
                output: inst._def.output,
            });
        }
        return new F({
            type: "function",
            input: args[0],
            output: inst._def.output,
        });
    };
    inst.output = (output) => {
        const F = inst.constructor;
        return new F({
            type: "function",
            input: inst._def.input,
            output,
        });
    };
    return inst;
});
const $ZodPromise = /*@__PURE__*/ $constructor("$ZodPromise", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
});
const $ZodLazy = /*@__PURE__*/ $constructor("$ZodLazy", (inst, def) => {
    $ZodType.init(inst, def);
    // let _innerType!: any;
    // util.defineLazy(def, "getter", () => {
    //   if (!_innerType) {
    //     _innerType = def.getter();
    //   }
    //   return () => _innerType;
    // });
    defineLazy(inst._zod, "innerType", () => def.getter());
    defineLazy(inst._zod, "pattern", () => inst._zod.innerType?._zod?.pattern);
    defineLazy(inst._zod, "propValues", () => inst._zod.innerType?._zod?.propValues);
    defineLazy(inst._zod, "optin", () => inst._zod.innerType?._zod?.optin ?? undefined);
    defineLazy(inst._zod, "optout", () => inst._zod.innerType?._zod?.optout ?? undefined);
    inst._zod.parse = (payload, ctx) => {
        const inner = inst._zod.innerType;
        return inner._zod.run(payload, ctx);
    };
});
const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
        return payload;
    };
    inst._zod.check = (payload) => {
        const input = payload.value;
        const r = def.fn(input);
        if (r instanceof Promise) {
            return r.then((r) => handleRefineResult(r, payload, input, inst));
        }
        handleRefineResult(r, payload, input, inst);
        return;
    };
});
function handleRefineResult(result, payload, input, inst) {
    if (!result) {
        const _iss = {
            code: "custom",
            input,
            inst, // incorporates params.error into issue reporting
            path: [...(inst._zod.def.path ?? [])], // incorporates params.error into issue reporting
            continue: !inst._zod.def.abort,
            // params: inst._zod.def.params,
        };
        if (inst._zod.def.params)
            _iss.params = inst._zod.def.params;
        payload.issues.push(util_issue(_iss));
    }
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ar.js

const error = () => {
    const Sizable = {
        string: { unit: "حرف", verb: "أن يحوي" },
        file: { unit: "بايت", verb: "أن يحوي" },
        array: { unit: "عنصر", verb: "أن يحوي" },
        set: { unit: "عنصر", verb: "أن يحوي" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "مدخل",
        email: "بريد إلكتروني",
        url: "رابط",
        emoji: "إيموجي",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "تاريخ ووقت بمعيار ISO",
        date: "تاريخ بمعيار ISO",
        time: "وقت بمعيار ISO",
        duration: "مدة بمعيار ISO",
        ipv4: "عنوان IPv4",
        ipv6: "عنوان IPv6",
        cidrv4: "مدى عناوين بصيغة IPv4",
        cidrv6: "مدى عناوين بصيغة IPv6",
        base64: "نَص بترميز base64-encoded",
        base64url: "نَص بترميز base64url-encoded",
        json_string: "نَص على هيئة JSON",
        e164: "رقم هاتف بمعيار E.164",
        jwt: "JWT",
        template_literal: "مدخل",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `مدخلات غير مقبولة: يفترض إدخال instanceof ${issue.expected}، ولكن تم إدخال ${received}`;
                }
                return `مدخلات غير مقبولة: يفترض إدخال ${expected}، ولكن تم إدخال ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `مدخلات غير مقبولة: يفترض إدخال ${util.stringifyPrimitive(issue.values[0])}`;
                return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return ` أكبر من اللازم: يفترض أن تكون ${issue.origin ?? "القيمة"} ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "عنصر"}`;
                return `أكبر من اللازم: يفترض أن تكون ${issue.origin ?? "القيمة"} ${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `أصغر من اللازم: يفترض لـ ${issue.origin} أن يكون ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `أصغر من اللازم: يفترض لـ ${issue.origin} أن يكون ${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `نَص غير مقبول: يجب أن يبدأ بـ "${issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} غير مقبول`;
            }
            case "not_multiple_of":
                return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue.divisor}`;
            case "unrecognized_keys":
                return `معرف${issue.keys.length > 1 ? "ات" : ""} غريب${issue.keys.length > 1 ? "ة" : ""}: ${util.joinValues(issue.keys, "، ")}`;
            case "invalid_key":
                return `معرف غير مقبول في ${issue.origin}`;
            case "invalid_union":
                return "مدخل غير مقبول";
            case "invalid_element":
                return `مدخل غير مقبول في ${issue.origin}`;
            default:
                return "مدخل غير مقبول";
        }
    };
};
/* harmony default export */ function ar() {
    return {
        localeError: error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/az.js

const az_error = () => {
    const Sizable = {
        string: { unit: "simvol", verb: "olmalıdır" },
        file: { unit: "bayt", verb: "olmalıdır" },
        array: { unit: "element", verb: "olmalıdır" },
        set: { unit: "element", verb: "olmalıdır" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Yanlış dəyər: gözlənilən instanceof ${issue.expected}, daxil olan ${received}`;
                }
                return `Yanlış dəyər: gözlənilən ${expected}, daxil olan ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Yanlış dəyər: gözlənilən ${util.stringifyPrimitive(issue.values[0])}`;
                return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Çox böyük: gözlənilən ${issue.origin ?? "dəyər"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "element"}`;
                return `Çox böyük: gözlənilən ${issue.origin ?? "dəyər"} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Çox kiçik: gözlənilən ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                return `Çox kiçik: gözlənilən ${issue.origin} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Yanlış mətn: "${_issue.prefix}" ilə başlamalıdır`;
                if (_issue.format === "ends_with")
                    return `Yanlış mətn: "${_issue.suffix}" ilə bitməlidir`;
                if (_issue.format === "includes")
                    return `Yanlış mətn: "${_issue.includes}" daxil olmalıdır`;
                if (_issue.format === "regex")
                    return `Yanlış mətn: ${_issue.pattern} şablonuna uyğun olmalıdır`;
                return `Yanlış ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Yanlış ədəd: ${issue.divisor} ilə bölünə bilən olmalıdır`;
            case "unrecognized_keys":
                return `Tanınmayan açar${issue.keys.length > 1 ? "lar" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} daxilində yanlış açar`;
            case "invalid_union":
                return "Yanlış dəyər";
            case "invalid_element":
                return `${issue.origin} daxilində yanlış dəyər`;
            default:
                return `Yanlış dəyər`;
        }
    };
};
/* harmony default export */ function az() {
    return {
        localeError: az_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/be.js

function getBelarusianPlural(count, one, few, many) {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return many;
    }
    if (lastDigit === 1) {
        return one;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
        return few;
    }
    return many;
}
const be_error = () => {
    const Sizable = {
        string: {
            unit: {
                one: "сімвал",
                few: "сімвалы",
                many: "сімвалаў",
            },
            verb: "мець",
        },
        array: {
            unit: {
                one: "элемент",
                few: "элементы",
                many: "элементаў",
            },
            verb: "мець",
        },
        set: {
            unit: {
                one: "элемент",
                few: "элементы",
                many: "элементаў",
            },
            verb: "мець",
        },
        file: {
            unit: {
                one: "байт",
                few: "байты",
                many: "байтаў",
            },
            verb: "мець",
        },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "увод",
        email: "email адрас",
        url: "URL",
        emoji: "эмодзі",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO дата і час",
        date: "ISO дата",
        time: "ISO час",
        duration: "ISO працягласць",
        ipv4: "IPv4 адрас",
        ipv6: "IPv6 адрас",
        cidrv4: "IPv4 дыяпазон",
        cidrv6: "IPv6 дыяпазон",
        base64: "радок у фармаце base64",
        base64url: "радок у фармаце base64url",
        json_string: "JSON радок",
        e164: "нумар E.164",
        jwt: "JWT",
        template_literal: "увод",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "лік",
        array: "масіў",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Няправільны ўвод: чакаўся instanceof ${issue.expected}, атрымана ${received}`;
                }
                return `Няправільны ўвод: чакаўся ${expected}, атрымана ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Няправільны ўвод: чакалася ${util.stringifyPrimitive(issue.values[0])}`;
                return `Няправільны варыянт: чакаўся адзін з ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    const maxValue = Number(issue.maximum);
                    const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
                    return `Занадта вялікі: чакалася, што ${issue.origin ?? "значэнне"} павінна ${sizing.verb} ${adj}${issue.maximum.toString()} ${unit}`;
                }
                return `Занадта вялікі: чакалася, што ${issue.origin ?? "значэнне"} павінна быць ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    const minValue = Number(issue.minimum);
                    const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
                    return `Занадта малы: чакалася, што ${issue.origin} павінна ${sizing.verb} ${adj}${issue.minimum.toString()} ${unit}`;
                }
                return `Занадта малы: чакалася, што ${issue.origin} павінна быць ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Няправільны радок: павінен пачынацца з "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Няправільны радок: павінен заканчвацца на "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Няправільны радок: павінен змяшчаць "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Няправільны радок: павінен адпавядаць шаблону ${_issue.pattern}`;
                return `Няправільны ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Няправільны лік: павінен быць кратным ${issue.divisor}`;
            case "unrecognized_keys":
                return `Нераспазнаны ${issue.keys.length > 1 ? "ключы" : "ключ"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Няправільны ключ у ${issue.origin}`;
            case "invalid_union":
                return "Няправільны ўвод";
            case "invalid_element":
                return `Няправільнае значэнне ў ${issue.origin}`;
            default:
                return `Няправільны ўвод`;
        }
    };
};
/* harmony default export */ function be() {
    return {
        localeError: be_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/bg.js

const bg_error = () => {
    const Sizable = {
        string: { unit: "символа", verb: "да съдържа" },
        file: { unit: "байта", verb: "да съдържа" },
        array: { unit: "елемента", verb: "да съдържа" },
        set: { unit: "елемента", verb: "да съдържа" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "вход",
        email: "имейл адрес",
        url: "URL",
        emoji: "емоджи",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO време",
        date: "ISO дата",
        time: "ISO време",
        duration: "ISO продължителност",
        ipv4: "IPv4 адрес",
        ipv6: "IPv6 адрес",
        cidrv4: "IPv4 диапазон",
        cidrv6: "IPv6 диапазон",
        base64: "base64-кодиран низ",
        base64url: "base64url-кодиран низ",
        json_string: "JSON низ",
        e164: "E.164 номер",
        jwt: "JWT",
        template_literal: "вход",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "число",
        array: "масив",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Невалиден вход: очакван instanceof ${issue.expected}, получен ${received}`;
                }
                return `Невалиден вход: очакван ${expected}, получен ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Невалиден вход: очакван ${util.stringifyPrimitive(issue.values[0])}`;
                return `Невалидна опция: очаквано едно от ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Твърде голямо: очаква се ${issue.origin ?? "стойност"} да съдържа ${adj}${issue.maximum.toString()} ${sizing.unit ?? "елемента"}`;
                return `Твърде голямо: очаква се ${issue.origin ?? "стойност"} да бъде ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Твърде малко: очаква се ${issue.origin} да съдържа ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Твърде малко: очаква се ${issue.origin} да бъде ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Невалиден низ: трябва да започва с "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Невалиден низ: трябва да завършва с "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Невалиден низ: трябва да включва "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Невалиден низ: трябва да съвпада с ${_issue.pattern}`;
                let invalid_adj = "Невалиден";
                if (_issue.format === "emoji")
                    invalid_adj = "Невалидно";
                if (_issue.format === "datetime")
                    invalid_adj = "Невалидно";
                if (_issue.format === "date")
                    invalid_adj = "Невалидна";
                if (_issue.format === "time")
                    invalid_adj = "Невалидно";
                if (_issue.format === "duration")
                    invalid_adj = "Невалидна";
                return `${invalid_adj} ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Невалидно число: трябва да бъде кратно на ${issue.divisor}`;
            case "unrecognized_keys":
                return `Неразпознат${issue.keys.length > 1 ? "и" : ""} ключ${issue.keys.length > 1 ? "ове" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Невалиден ключ в ${issue.origin}`;
            case "invalid_union":
                return "Невалиден вход";
            case "invalid_element":
                return `Невалидна стойност в ${issue.origin}`;
            default:
                return `Невалиден вход`;
        }
    };
};
/* harmony default export */ function bg() {
    return {
        localeError: bg_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ca.js

const ca_error = () => {
    const Sizable = {
        string: { unit: "caràcters", verb: "contenir" },
        file: { unit: "bytes", verb: "contenir" },
        array: { unit: "elements", verb: "contenir" },
        set: { unit: "elements", verb: "contenir" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "entrada",
        email: "adreça electrònica",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data i hora ISO",
        date: "data ISO",
        time: "hora ISO",
        duration: "durada ISO",
        ipv4: "adreça IPv4",
        ipv6: "adreça IPv6",
        cidrv4: "rang IPv4",
        cidrv6: "rang IPv6",
        base64: "cadena codificada en base64",
        base64url: "cadena codificada en base64url",
        json_string: "cadena JSON",
        e164: "número E.164",
        jwt: "JWT",
        template_literal: "entrada",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Tipus invàlid: s'esperava instanceof ${issue.expected}, s'ha rebut ${received}`;
                }
                return `Tipus invàlid: s'esperava ${expected}, s'ha rebut ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Valor invàlid: s'esperava ${util.stringifyPrimitive(issue.values[0])}`;
                return `Opció invàlida: s'esperava una de ${util.joinValues(issue.values, " o ")}`;
            case "too_big": {
                const adj = issue.inclusive ? "com a màxim" : "menys de";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Massa gran: s'esperava que ${issue.origin ?? "el valor"} contingués ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
                return `Massa gran: s'esperava que ${issue.origin ?? "el valor"} fos ${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? "com a mínim" : "més de";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Massa petit: s'esperava que ${issue.origin} contingués ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Massa petit: s'esperava que ${issue.origin} fos ${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Format invàlid: ha de començar amb "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Format invàlid: ha d'acabar amb "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Format invàlid: ha d'incloure "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Format invàlid: ha de coincidir amb el patró ${_issue.pattern}`;
                return `Format invàlid per a ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Número invàlid: ha de ser múltiple de ${issue.divisor}`;
            case "unrecognized_keys":
                return `Clau${issue.keys.length > 1 ? "s" : ""} no reconeguda${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Clau invàlida a ${issue.origin}`;
            case "invalid_union":
                return "Entrada invàlida"; // Could also be "Tipus d'unió invàlid" but "Entrada invàlida" is more general
            case "invalid_element":
                return `Element invàlid a ${issue.origin}`;
            default:
                return `Entrada invàlida`;
        }
    };
};
/* harmony default export */ function ca() {
    return {
        localeError: ca_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/cs.js

const cs_error = () => {
    const Sizable = {
        string: { unit: "znaků", verb: "mít" },
        file: { unit: "bajtů", verb: "mít" },
        array: { unit: "prvků", verb: "mít" },
        set: { unit: "prvků", verb: "mít" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "regulární výraz",
        email: "e-mailová adresa",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "datum a čas ve formátu ISO",
        date: "datum ve formátu ISO",
        time: "čas ve formátu ISO",
        duration: "doba trvání ISO",
        ipv4: "IPv4 adresa",
        ipv6: "IPv6 adresa",
        cidrv4: "rozsah IPv4",
        cidrv6: "rozsah IPv6",
        base64: "řetězec zakódovaný ve formátu base64",
        base64url: "řetězec zakódovaný ve formátu base64url",
        json_string: "řetězec ve formátu JSON",
        e164: "číslo E.164",
        jwt: "JWT",
        template_literal: "vstup",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "číslo",
        string: "řetězec",
        function: "funkce",
        array: "pole",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Neplatný vstup: očekáváno instanceof ${issue.expected}, obdrženo ${received}`;
                }
                return `Neplatný vstup: očekáváno ${expected}, obdrženo ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Neplatný vstup: očekáváno ${util.stringifyPrimitive(issue.values[0])}`;
                return `Neplatná možnost: očekávána jedna z hodnot ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Hodnota je příliš velká: ${issue.origin ?? "hodnota"} musí mít ${adj}${issue.maximum.toString()} ${sizing.unit ?? "prvků"}`;
                }
                return `Hodnota je příliš velká: ${issue.origin ?? "hodnota"} musí být ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Hodnota je příliš malá: ${issue.origin ?? "hodnota"} musí mít ${adj}${issue.minimum.toString()} ${sizing.unit ?? "prvků"}`;
                }
                return `Hodnota je příliš malá: ${issue.origin ?? "hodnota"} musí být ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Neplatný řetězec: musí začínat na "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Neplatný řetězec: musí končit na "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Neplatný řetězec: musí obsahovat "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Neplatný řetězec: musí odpovídat vzoru ${_issue.pattern}`;
                return `Neplatný formát ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Neplatné číslo: musí být násobkem ${issue.divisor}`;
            case "unrecognized_keys":
                return `Neznámé klíče: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Neplatný klíč v ${issue.origin}`;
            case "invalid_union":
                return "Neplatný vstup";
            case "invalid_element":
                return `Neplatná hodnota v ${issue.origin}`;
            default:
                return `Neplatný vstup`;
        }
    };
};
/* harmony default export */ function cs() {
    return {
        localeError: cs_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/da.js

const da_error = () => {
    const Sizable = {
        string: { unit: "tegn", verb: "havde" },
        file: { unit: "bytes", verb: "havde" },
        array: { unit: "elementer", verb: "indeholdt" },
        set: { unit: "elementer", verb: "indeholdt" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "e-mailadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkeslæt",
        date: "ISO-dato",
        time: "ISO-klokkeslæt",
        duration: "ISO-varighed",
        ipv4: "IPv4-område",
        ipv6: "IPv6-område",
        cidrv4: "IPv4-spektrum",
        cidrv6: "IPv6-spektrum",
        base64: "base64-kodet streng",
        base64url: "base64url-kodet streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
        string: "streng",
        number: "tal",
        boolean: "boolean",
        array: "liste",
        object: "objekt",
        set: "sæt",
        file: "fil",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Ugyldigt input: forventede instanceof ${issue.expected}, fik ${received}`;
                }
                return `Ugyldigt input: forventede ${expected}, fik ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Ugyldig værdi: forventede ${util.stringifyPrimitive(issue.values[0])}`;
                return `Ugyldigt valg: forventede en af følgende ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                if (sizing)
                    return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "elementer"}`;
                return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                if (sizing) {
                    return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `For lille: forventede ${origin} havde ${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Ugyldig streng: skal matche mønsteret ${_issue.pattern}`;
                return `Ugyldig ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Ugyldigt tal: skal være deleligt med ${issue.divisor}`;
            case "unrecognized_keys":
                return `${issue.keys.length > 1 ? "Ukendte nøgler" : "Ukendt nøgle"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Ugyldig nøgle i ${issue.origin}`;
            case "invalid_union":
                return "Ugyldigt input: matcher ingen af de tilladte typer";
            case "invalid_element":
                return `Ugyldig værdi i ${issue.origin}`;
            default:
                return `Ugyldigt input`;
        }
    };
};
/* harmony default export */ function da() {
    return {
        localeError: da_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/de.js

const de_error = () => {
    const Sizable = {
        string: { unit: "Zeichen", verb: "zu haben" },
        file: { unit: "Bytes", verb: "zu haben" },
        array: { unit: "Elemente", verb: "zu haben" },
        set: { unit: "Elemente", verb: "zu haben" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "Eingabe",
        email: "E-Mail-Adresse",
        url: "URL",
        emoji: "Emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-Datum und -Uhrzeit",
        date: "ISO-Datum",
        time: "ISO-Uhrzeit",
        duration: "ISO-Dauer",
        ipv4: "IPv4-Adresse",
        ipv6: "IPv6-Adresse",
        cidrv4: "IPv4-Bereich",
        cidrv6: "IPv6-Bereich",
        base64: "Base64-codierter String",
        base64url: "Base64-URL-codierter String",
        json_string: "JSON-String",
        e164: "E.164-Nummer",
        jwt: "JWT",
        template_literal: "Eingabe",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "Zahl",
        array: "Array",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Ungültige Eingabe: erwartet instanceof ${issue.expected}, erhalten ${received}`;
                }
                return `Ungültige Eingabe: erwartet ${expected}, erhalten ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Ungültige Eingabe: erwartet ${util.stringifyPrimitive(issue.values[0])}`;
                return `Ungültige Option: erwartet eine von ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Zu groß: erwartet, dass ${issue.origin ?? "Wert"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
                return `Zu groß: erwartet, dass ${issue.origin ?? "Wert"} ${adj}${issue.maximum.toString()} ist`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Zu klein: erwartet, dass ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} hat`;
                }
                return `Zu klein: erwartet, dass ${issue.origin} ${adj}${issue.minimum.toString()} ist`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Ungültiger String: muss mit "${_issue.prefix}" beginnen`;
                if (_issue.format === "ends_with")
                    return `Ungültiger String: muss mit "${_issue.suffix}" enden`;
                if (_issue.format === "includes")
                    return `Ungültiger String: muss "${_issue.includes}" enthalten`;
                if (_issue.format === "regex")
                    return `Ungültiger String: muss dem Muster ${_issue.pattern} entsprechen`;
                return `Ungültig: ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Ungültige Zahl: muss ein Vielfaches von ${issue.divisor} sein`;
            case "unrecognized_keys":
                return `${issue.keys.length > 1 ? "Unbekannte Schlüssel" : "Unbekannter Schlüssel"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Ungültiger Schlüssel in ${issue.origin}`;
            case "invalid_union":
                return "Ungültige Eingabe";
            case "invalid_element":
                return `Ungültiger Wert in ${issue.origin}`;
            default:
                return `Ungültige Eingabe`;
        }
    };
};
/* harmony default export */ function de() {
    return {
        localeError: de_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/en.js

const en_error = () => {
    const Sizable = {
        string: { unit: "characters", verb: "to have" },
        file: { unit: "bytes", verb: "to have" },
        array: { unit: "items", verb: "to have" },
        set: { unit: "items", verb: "to have" },
        map: { unit: "entries", verb: "to have" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        mac: "MAC address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        jwt: "JWT",
        template_literal: "input",
    };
    // type names: missing keys = do not translate (use raw value via ?? fallback)
    const TypeDictionary = {
        // Compatibility: "nan" -> "NaN" for display
        nan: "NaN",
        // All other type names omitted - they fall back to raw values via ?? operator
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                return `Invalid input: expected ${expected}, received ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
                return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
                return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Invalid string: must start with "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Invalid string: must end with "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Invalid string: must include "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Invalid string: must match pattern ${_issue.pattern}`;
                return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Invalid number: must be a multiple of ${issue.divisor}`;
            case "unrecognized_keys":
                return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Invalid key in ${issue.origin}`;
            case "invalid_union":
                return "Invalid input";
            case "invalid_element":
                return `Invalid value in ${issue.origin}`;
            default:
                return `Invalid input`;
        }
    };
};
/* harmony default export */ function en() {
    return {
        localeError: en_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/eo.js

const eo_error = () => {
    const Sizable = {
        string: { unit: "karaktrojn", verb: "havi" },
        file: { unit: "bajtojn", verb: "havi" },
        array: { unit: "elementojn", verb: "havi" },
        set: { unit: "elementojn", verb: "havi" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "enigo",
        email: "retadreso",
        url: "URL",
        emoji: "emoĝio",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-datotempo",
        date: "ISO-dato",
        time: "ISO-tempo",
        duration: "ISO-daŭro",
        ipv4: "IPv4-adreso",
        ipv6: "IPv6-adreso",
        cidrv4: "IPv4-rango",
        cidrv6: "IPv6-rango",
        base64: "64-ume kodita karaktraro",
        base64url: "URL-64-ume kodita karaktraro",
        json_string: "JSON-karaktraro",
        e164: "E.164-nombro",
        jwt: "JWT",
        template_literal: "enigo",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "nombro",
        array: "tabelo",
        null: "senvalora",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Nevalida enigo: atendiĝis instanceof ${issue.expected}, riceviĝis ${received}`;
                }
                return `Nevalida enigo: atendiĝis ${expected}, riceviĝis ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Nevalida enigo: atendiĝis ${util.stringifyPrimitive(issue.values[0])}`;
                return `Nevalida opcio: atendiĝis unu el ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Tro granda: atendiĝis ke ${issue.origin ?? "valoro"} havu ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
                return `Tro granda: atendiĝis ke ${issue.origin ?? "valoro"} havu ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Tro malgranda: atendiĝis ke ${issue.origin} havu ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Tro malgranda: atendiĝis ke ${issue.origin} estu ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Nevalida karaktraro: devas komenciĝi per "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Nevalida karaktraro: devas finiĝi per "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
                return `Nevalida ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Nevalida nombro: devas esti oblo de ${issue.divisor}`;
            case "unrecognized_keys":
                return `Nekonata${issue.keys.length > 1 ? "j" : ""} ŝlosilo${issue.keys.length > 1 ? "j" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Nevalida ŝlosilo en ${issue.origin}`;
            case "invalid_union":
                return "Nevalida enigo";
            case "invalid_element":
                return `Nevalida valoro en ${issue.origin}`;
            default:
                return `Nevalida enigo`;
        }
    };
};
/* harmony default export */ function eo() {
    return {
        localeError: eo_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/es.js

const es_error = () => {
    const Sizable = {
        string: { unit: "caracteres", verb: "tener" },
        file: { unit: "bytes", verb: "tener" },
        array: { unit: "elementos", verb: "tener" },
        set: { unit: "elementos", verb: "tener" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "entrada",
        email: "dirección de correo electrónico",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "fecha y hora ISO",
        date: "fecha ISO",
        time: "hora ISO",
        duration: "duración ISO",
        ipv4: "dirección IPv4",
        ipv6: "dirección IPv6",
        cidrv4: "rango IPv4",
        cidrv6: "rango IPv6",
        base64: "cadena codificada en base64",
        base64url: "URL codificada en base64",
        json_string: "cadena JSON",
        e164: "número E.164",
        jwt: "JWT",
        template_literal: "entrada",
    };
    const TypeDictionary = {
        nan: "NaN",
        string: "texto",
        number: "número",
        boolean: "booleano",
        array: "arreglo",
        object: "objeto",
        set: "conjunto",
        file: "archivo",
        date: "fecha",
        bigint: "número grande",
        symbol: "símbolo",
        undefined: "indefinido",
        null: "nulo",
        function: "función",
        map: "mapa",
        record: "registro",
        tuple: "tupla",
        enum: "enumeración",
        union: "unión",
        literal: "literal",
        promise: "promesa",
        void: "vacío",
        never: "nunca",
        unknown: "desconocido",
        any: "cualquiera",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Entrada inválida: se esperaba instanceof ${issue.expected}, recibido ${received}`;
                }
                return `Entrada inválida: se esperaba ${expected}, recibido ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Entrada inválida: se esperaba ${util.stringifyPrimitive(issue.values[0])}`;
                return `Opción inválida: se esperaba una de ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                if (sizing)
                    return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementos"}`;
                return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                if (sizing) {
                    return `Demasiado pequeño: se esperaba que ${origin} tuviera ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Demasiado pequeño: se esperaba que ${origin} fuera ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Cadena inválida: debe comenzar con "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Cadena inválida: debe terminar en "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Cadena inválida: debe incluir "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Cadena inválida: debe coincidir con el patrón ${_issue.pattern}`;
                return `Inválido ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Número inválido: debe ser múltiplo de ${issue.divisor}`;
            case "unrecognized_keys":
                return `Llave${issue.keys.length > 1 ? "s" : ""} desconocida${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Llave inválida en ${TypeDictionary[issue.origin] ?? issue.origin}`;
            case "invalid_union":
                return "Entrada inválida";
            case "invalid_element":
                return `Valor inválido en ${TypeDictionary[issue.origin] ?? issue.origin}`;
            default:
                return `Entrada inválida`;
        }
    };
};
/* harmony default export */ function es() {
    return {
        localeError: es_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/fa.js

const fa_error = () => {
    const Sizable = {
        string: { unit: "کاراکتر", verb: "داشته باشد" },
        file: { unit: "بایت", verb: "داشته باشد" },
        array: { unit: "آیتم", verb: "داشته باشد" },
        set: { unit: "آیتم", verb: "داشته باشد" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ورودی",
        email: "آدرس ایمیل",
        url: "URL",
        emoji: "ایموجی",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "تاریخ و زمان ایزو",
        date: "تاریخ ایزو",
        time: "زمان ایزو",
        duration: "مدت زمان ایزو",
        ipv4: "IPv4 آدرس",
        ipv6: "IPv6 آدرس",
        cidrv4: "IPv4 دامنه",
        cidrv6: "IPv6 دامنه",
        base64: "base64-encoded رشته",
        base64url: "base64url-encoded رشته",
        json_string: "JSON رشته",
        e164: "E.164 عدد",
        jwt: "JWT",
        template_literal: "ورودی",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "عدد",
        array: "آرایه",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `ورودی نامعتبر: می‌بایست instanceof ${issue.expected} می‌بود، ${received} دریافت شد`;
                }
                return `ورودی نامعتبر: می‌بایست ${expected} می‌بود، ${received} دریافت شد`;
            }
            case "invalid_value":
                if (issue.values.length === 1) {
                    return `ورودی نامعتبر: می‌بایست ${util.stringifyPrimitive(issue.values[0])} می‌بود`;
                }
                return `گزینه نامعتبر: می‌بایست یکی از ${util.joinValues(issue.values, "|")} می‌بود`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `خیلی بزرگ: ${issue.origin ?? "مقدار"} باید ${adj}${issue.maximum.toString()} ${sizing.unit ?? "عنصر"} باشد`;
                }
                return `خیلی بزرگ: ${issue.origin ?? "مقدار"} باید ${adj}${issue.maximum.toString()} باشد`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `خیلی کوچک: ${issue.origin} باید ${adj}${issue.minimum.toString()} ${sizing.unit} باشد`;
                }
                return `خیلی کوچک: ${issue.origin} باید ${adj}${issue.minimum.toString()} باشد`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `رشته نامعتبر: باید با "${_issue.prefix}" شروع شود`;
                }
                if (_issue.format === "ends_with") {
                    return `رشته نامعتبر: باید با "${_issue.suffix}" تمام شود`;
                }
                if (_issue.format === "includes") {
                    return `رشته نامعتبر: باید شامل "${_issue.includes}" باشد`;
                }
                if (_issue.format === "regex") {
                    return `رشته نامعتبر: باید با الگوی ${_issue.pattern} مطابقت داشته باشد`;
                }
                return `${FormatDictionary[_issue.format] ?? issue.format} نامعتبر`;
            }
            case "not_multiple_of":
                return `عدد نامعتبر: باید مضرب ${issue.divisor} باشد`;
            case "unrecognized_keys":
                return `کلید${issue.keys.length > 1 ? "های" : ""} ناشناس: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `کلید ناشناس در ${issue.origin}`;
            case "invalid_union":
                return `ورودی نامعتبر`;
            case "invalid_element":
                return `مقدار نامعتبر در ${issue.origin}`;
            default:
                return `ورودی نامعتبر`;
        }
    };
};
/* harmony default export */ function fa() {
    return {
        localeError: fa_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/fi.js

const fi_error = () => {
    const Sizable = {
        string: { unit: "merkkiä", subject: "merkkijonon" },
        file: { unit: "tavua", subject: "tiedoston" },
        array: { unit: "alkiota", subject: "listan" },
        set: { unit: "alkiota", subject: "joukon" },
        number: { unit: "", subject: "luvun" },
        bigint: { unit: "", subject: "suuren kokonaisluvun" },
        int: { unit: "", subject: "kokonaisluvun" },
        date: { unit: "", subject: "päivämäärän" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "säännöllinen lauseke",
        email: "sähköpostiosoite",
        url: "URL-osoite",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-aikaleima",
        date: "ISO-päivämäärä",
        time: "ISO-aika",
        duration: "ISO-kesto",
        ipv4: "IPv4-osoite",
        ipv6: "IPv6-osoite",
        cidrv4: "IPv4-alue",
        cidrv6: "IPv6-alue",
        base64: "base64-koodattu merkkijono",
        base64url: "base64url-koodattu merkkijono",
        json_string: "JSON-merkkijono",
        e164: "E.164-luku",
        jwt: "JWT",
        template_literal: "templaattimerkkijono",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Virheellinen tyyppi: odotettiin instanceof ${issue.expected}, oli ${received}`;
                }
                return `Virheellinen tyyppi: odotettiin ${expected}, oli ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Virheellinen syöte: täytyy olla ${util.stringifyPrimitive(issue.values[0])}`;
                return `Virheellinen valinta: täytyy olla yksi seuraavista: ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Liian suuri: ${sizing.subject} täytyy olla ${adj}${issue.maximum.toString()} ${sizing.unit}`.trim();
                }
                return `Liian suuri: arvon täytyy olla ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Liian pieni: ${sizing.subject} täytyy olla ${adj}${issue.minimum.toString()} ${sizing.unit}`.trim();
                }
                return `Liian pieni: arvon täytyy olla ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Virheellinen syöte: täytyy alkaa "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Virheellinen syöte: täytyy loppua "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Virheellinen syöte: täytyy sisältää "${_issue.includes}"`;
                if (_issue.format === "regex") {
                    return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${_issue.pattern}`;
                }
                return `Virheellinen ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Virheellinen luku: täytyy olla luvun ${issue.divisor} monikerta`;
            case "unrecognized_keys":
                return `${issue.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return "Virheellinen avain tietueessa";
            case "invalid_union":
                return "Virheellinen unioni";
            case "invalid_element":
                return "Virheellinen arvo joukossa";
            default:
                return `Virheellinen syöte`;
        }
    };
};
/* harmony default export */ function fi() {
    return {
        localeError: fi_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/fr.js

const fr_error = () => {
    const Sizable = {
        string: { unit: "caractères", verb: "avoir" },
        file: { unit: "octets", verb: "avoir" },
        array: { unit: "éléments", verb: "avoir" },
        set: { unit: "éléments", verb: "avoir" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "entrée",
        email: "adresse e-mail",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "date et heure ISO",
        date: "date ISO",
        time: "heure ISO",
        duration: "durée ISO",
        ipv4: "adresse IPv4",
        ipv6: "adresse IPv6",
        cidrv4: "plage IPv4",
        cidrv6: "plage IPv6",
        base64: "chaîne encodée en base64",
        base64url: "chaîne encodée en base64url",
        json_string: "chaîne JSON",
        e164: "numéro E.164",
        jwt: "JWT",
        template_literal: "entrée",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "nombre",
        array: "tableau",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Entrée invalide : instanceof ${issue.expected} attendu, ${received} reçu`;
                }
                return `Entrée invalide : ${expected} attendu, ${received} reçu`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Entrée invalide : ${util.stringifyPrimitive(issue.values[0])} attendu`;
                return `Option invalide : une valeur parmi ${util.joinValues(issue.values, "|")} attendue`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Trop grand : ${issue.origin ?? "valeur"} doit ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "élément(s)"}`;
                return `Trop grand : ${issue.origin ?? "valeur"} doit être ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Trop petit : ${issue.origin} doit ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Trop petit : ${issue.origin} doit être ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Chaîne invalide : doit inclure "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Chaîne invalide : doit correspondre au modèle ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} invalide`;
            }
            case "not_multiple_of":
                return `Nombre invalide : doit être un multiple de ${issue.divisor}`;
            case "unrecognized_keys":
                return `Clé${issue.keys.length > 1 ? "s" : ""} non reconnue${issue.keys.length > 1 ? "s" : ""} : ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Clé invalide dans ${issue.origin}`;
            case "invalid_union":
                return "Entrée invalide";
            case "invalid_element":
                return `Valeur invalide dans ${issue.origin}`;
            default:
                return `Entrée invalide`;
        }
    };
};
/* harmony default export */ function fr() {
    return {
        localeError: fr_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/fr-CA.js

const fr_CA_error = () => {
    const Sizable = {
        string: { unit: "caractères", verb: "avoir" },
        file: { unit: "octets", verb: "avoir" },
        array: { unit: "éléments", verb: "avoir" },
        set: { unit: "éléments", verb: "avoir" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "entrée",
        email: "adresse courriel",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "date-heure ISO",
        date: "date ISO",
        time: "heure ISO",
        duration: "durée ISO",
        ipv4: "adresse IPv4",
        ipv6: "adresse IPv6",
        cidrv4: "plage IPv4",
        cidrv6: "plage IPv6",
        base64: "chaîne encodée en base64",
        base64url: "chaîne encodée en base64url",
        json_string: "chaîne JSON",
        e164: "numéro E.164",
        jwt: "JWT",
        template_literal: "entrée",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Entrée invalide : attendu instanceof ${issue.expected}, reçu ${received}`;
                }
                return `Entrée invalide : attendu ${expected}, reçu ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Entrée invalide : attendu ${util.stringifyPrimitive(issue.values[0])}`;
                return `Option invalide : attendu l'une des valeurs suivantes ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "≤" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Trop grand : attendu que ${issue.origin ?? "la valeur"} ait ${adj}${issue.maximum.toString()} ${sizing.unit}`;
                return `Trop grand : attendu que ${issue.origin ?? "la valeur"} soit ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? "≥" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Trop petit : attendu que ${issue.origin} ait ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Trop petit : attendu que ${issue.origin} soit ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Chaîne invalide : doit inclure "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Chaîne invalide : doit correspondre au motif ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} invalide`;
            }
            case "not_multiple_of":
                return `Nombre invalide : doit être un multiple de ${issue.divisor}`;
            case "unrecognized_keys":
                return `Clé${issue.keys.length > 1 ? "s" : ""} non reconnue${issue.keys.length > 1 ? "s" : ""} : ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Clé invalide dans ${issue.origin}`;
            case "invalid_union":
                return "Entrée invalide";
            case "invalid_element":
                return `Valeur invalide dans ${issue.origin}`;
            default:
                return `Entrée invalide`;
        }
    };
};
/* harmony default export */ function fr_CA() {
    return {
        localeError: fr_CA_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/he.js

const he_error = () => {
    // Hebrew labels + grammatical gender
    const TypeNames = {
        string: { label: "מחרוזת", gender: "f" },
        number: { label: "מספר", gender: "m" },
        boolean: { label: "ערך בוליאני", gender: "m" },
        bigint: { label: "BigInt", gender: "m" },
        date: { label: "תאריך", gender: "m" },
        array: { label: "מערך", gender: "m" },
        object: { label: "אובייקט", gender: "m" },
        null: { label: "ערך ריק (null)", gender: "m" },
        undefined: { label: "ערך לא מוגדר (undefined)", gender: "m" },
        symbol: { label: "סימבול (Symbol)", gender: "m" },
        function: { label: "פונקציה", gender: "f" },
        map: { label: "מפה (Map)", gender: "f" },
        set: { label: "קבוצה (Set)", gender: "f" },
        file: { label: "קובץ", gender: "m" },
        promise: { label: "Promise", gender: "m" },
        NaN: { label: "NaN", gender: "m" },
        unknown: { label: "ערך לא ידוע", gender: "m" },
        value: { label: "ערך", gender: "m" },
    };
    // Sizing units for size-related messages + localized origin labels
    const Sizable = {
        string: { unit: "תווים", shortLabel: "קצר", longLabel: "ארוך" },
        file: { unit: "בייטים", shortLabel: "קטן", longLabel: "גדול" },
        array: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
        set: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
        number: { unit: "", shortLabel: "קטן", longLabel: "גדול" }, // no unit
    };
    // Helpers — labels, articles, and verbs
    const typeEntry = (t) => (t ? TypeNames[t] : undefined);
    const typeLabel = (t) => {
        const e = typeEntry(t);
        if (e)
            return e.label;
        // fallback: show raw string if unknown
        return t ?? TypeNames.unknown.label;
    };
    const withDefinite = (t) => `ה${typeLabel(t)}`;
    const verbFor = (t) => {
        const e = typeEntry(t);
        const gender = e?.gender ?? "m";
        return gender === "f" ? "צריכה להיות" : "צריך להיות";
    };
    const getSizing = (origin) => {
        if (!origin)
            return null;
        return Sizable[origin] ?? null;
    };
    const FormatDictionary = {
        regex: { label: "קלט", gender: "m" },
        email: { label: "כתובת אימייל", gender: "f" },
        url: { label: "כתובת רשת", gender: "f" },
        emoji: { label: "אימוג'י", gender: "m" },
        uuid: { label: "UUID", gender: "m" },
        nanoid: { label: "nanoid", gender: "m" },
        guid: { label: "GUID", gender: "m" },
        cuid: { label: "cuid", gender: "m" },
        cuid2: { label: "cuid2", gender: "m" },
        ulid: { label: "ULID", gender: "m" },
        xid: { label: "XID", gender: "m" },
        ksuid: { label: "KSUID", gender: "m" },
        datetime: { label: "תאריך וזמן ISO", gender: "m" },
        date: { label: "תאריך ISO", gender: "m" },
        time: { label: "זמן ISO", gender: "m" },
        duration: { label: "משך זמן ISO", gender: "m" },
        ipv4: { label: "כתובת IPv4", gender: "f" },
        ipv6: { label: "כתובת IPv6", gender: "f" },
        cidrv4: { label: "טווח IPv4", gender: "m" },
        cidrv6: { label: "טווח IPv6", gender: "m" },
        base64: { label: "מחרוזת בבסיס 64", gender: "f" },
        base64url: { label: "מחרוזת בבסיס 64 לכתובות רשת", gender: "f" },
        json_string: { label: "מחרוזת JSON", gender: "f" },
        e164: { label: "מספר E.164", gender: "m" },
        jwt: { label: "JWT", gender: "m" },
        ends_with: { label: "קלט", gender: "m" },
        includes: { label: "קלט", gender: "m" },
        lowercase: { label: "קלט", gender: "m" },
        starts_with: { label: "קלט", gender: "m" },
        uppercase: { label: "קלט", gender: "m" },
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                // Expected type: show without definite article for clearer Hebrew
                const expectedKey = issue.expected;
                const expected = TypeDictionary[expectedKey ?? ""] ?? typeLabel(expectedKey);
                // Received: show localized label if known, otherwise constructor/raw
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? TypeNames[receivedType]?.label ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `קלט לא תקין: צריך להיות instanceof ${issue.expected}, התקבל ${received}`;
                }
                return `קלט לא תקין: צריך להיות ${expected}, התקבל ${received}`;
            }
            case "invalid_value": {
                if (issue.values.length === 1) {
                    return `ערך לא תקין: הערך חייב להיות ${util.stringifyPrimitive(issue.values[0])}`;
                }
                // Join values with proper Hebrew formatting
                const stringified = issue.values.map((v) => util.stringifyPrimitive(v));
                if (issue.values.length === 2) {
                    return `ערך לא תקין: האפשרויות המתאימות הן ${stringified[0]} או ${stringified[1]}`;
                }
                // For 3+ values: "a", "b" או "c"
                const lastValue = stringified[stringified.length - 1];
                const restValues = stringified.slice(0, -1).join(", ");
                return `ערך לא תקין: האפשרויות המתאימות הן ${restValues} או ${lastValue}`;
            }
            case "too_big": {
                const sizing = getSizing(issue.origin);
                const subject = withDefinite(issue.origin ?? "value");
                if (issue.origin === "string") {
                    // Special handling for strings - more natural Hebrew
                    return `${sizing?.longLabel ?? "ארוך"} מדי: ${subject} צריכה להכיל ${issue.maximum.toString()} ${sizing?.unit ?? ""} ${issue.inclusive ? "או פחות" : "לכל היותר"}`.trim();
                }
                if (issue.origin === "number") {
                    // Natural Hebrew for numbers
                    const comparison = issue.inclusive ? `קטן או שווה ל-${issue.maximum}` : `קטן מ-${issue.maximum}`;
                    return `גדול מדי: ${subject} צריך להיות ${comparison}`;
                }
                if (issue.origin === "array" || issue.origin === "set") {
                    // Natural Hebrew for arrays and sets
                    const verb = issue.origin === "set" ? "צריכה" : "צריך";
                    const comparison = issue.inclusive
                        ? `${issue.maximum} ${sizing?.unit ?? ""} או פחות`
                        : `פחות מ-${issue.maximum} ${sizing?.unit ?? ""}`;
                    return `גדול מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
                }
                const adj = issue.inclusive ? "<=" : "<";
                const be = verbFor(issue.origin ?? "value");
                if (sizing?.unit) {
                    return `${sizing.longLabel} מדי: ${subject} ${be} ${adj}${issue.maximum.toString()} ${sizing.unit}`;
                }
                return `${sizing?.longLabel ?? "גדול"} מדי: ${subject} ${be} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const sizing = getSizing(issue.origin);
                const subject = withDefinite(issue.origin ?? "value");
                if (issue.origin === "string") {
                    // Special handling for strings - more natural Hebrew
                    return `${sizing?.shortLabel ?? "קצר"} מדי: ${subject} צריכה להכיל ${issue.minimum.toString()} ${sizing?.unit ?? ""} ${issue.inclusive ? "או יותר" : "לפחות"}`.trim();
                }
                if (issue.origin === "number") {
                    // Natural Hebrew for numbers
                    const comparison = issue.inclusive ? `גדול או שווה ל-${issue.minimum}` : `גדול מ-${issue.minimum}`;
                    return `קטן מדי: ${subject} צריך להיות ${comparison}`;
                }
                if (issue.origin === "array" || issue.origin === "set") {
                    // Natural Hebrew for arrays and sets
                    const verb = issue.origin === "set" ? "צריכה" : "צריך";
                    // Special case for singular (minimum === 1)
                    if (issue.minimum === 1 && issue.inclusive) {
                        const singularPhrase = issue.origin === "set" ? "לפחות פריט אחד" : "לפחות פריט אחד";
                        return `קטן מדי: ${subject} ${verb} להכיל ${singularPhrase}`;
                    }
                    const comparison = issue.inclusive
                        ? `${issue.minimum} ${sizing?.unit ?? ""} או יותר`
                        : `יותר מ-${issue.minimum} ${sizing?.unit ?? ""}`;
                    return `קטן מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
                }
                const adj = issue.inclusive ? ">=" : ">";
                const be = verbFor(issue.origin ?? "value");
                if (sizing?.unit) {
                    return `${sizing.shortLabel} מדי: ${subject} ${be} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `${sizing?.shortLabel ?? "קטן"} מדי: ${subject} ${be} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                // These apply to strings — use feminine grammar + ה׳ הידיעה
                if (_issue.format === "starts_with")
                    return `המחרוזת חייבת להתחיל ב "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `המחרוזת חייבת להסתיים ב "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `המחרוזת חייבת לכלול "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `המחרוזת חייבת להתאים לתבנית ${_issue.pattern}`;
                // Handle gender agreement for formats
                const nounEntry = FormatDictionary[_issue.format];
                const noun = nounEntry?.label ?? _issue.format;
                const gender = nounEntry?.gender ?? "m";
                const adjective = gender === "f" ? "תקינה" : "תקין";
                return `${noun} לא ${adjective}`;
            }
            case "not_multiple_of":
                return `מספר לא תקין: חייב להיות מכפלה של ${issue.divisor}`;
            case "unrecognized_keys":
                return `מפתח${issue.keys.length > 1 ? "ות" : ""} לא מזוה${issue.keys.length > 1 ? "ים" : "ה"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key": {
                return `שדה לא תקין באובייקט`;
            }
            case "invalid_union":
                return "קלט לא תקין";
            case "invalid_element": {
                const place = withDefinite(issue.origin ?? "array");
                return `ערך לא תקין ב${place}`;
            }
            default:
                return `קלט לא תקין`;
        }
    };
};
/* harmony default export */ function he() {
    return {
        localeError: he_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/hu.js

const hu_error = () => {
    const Sizable = {
        string: { unit: "karakter", verb: "legyen" },
        file: { unit: "byte", verb: "legyen" },
        array: { unit: "elem", verb: "legyen" },
        set: { unit: "elem", verb: "legyen" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "bemenet",
        email: "email cím",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO időbélyeg",
        date: "ISO dátum",
        time: "ISO idő",
        duration: "ISO időintervallum",
        ipv4: "IPv4 cím",
        ipv6: "IPv6 cím",
        cidrv4: "IPv4 tartomány",
        cidrv6: "IPv6 tartomány",
        base64: "base64-kódolt string",
        base64url: "base64url-kódolt string",
        json_string: "JSON string",
        e164: "E.164 szám",
        jwt: "JWT",
        template_literal: "bemenet",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "szám",
        array: "tömb",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Érvénytelen bemenet: a várt érték instanceof ${issue.expected}, a kapott érték ${received}`;
                }
                return `Érvénytelen bemenet: a várt érték ${expected}, a kapott érték ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Érvénytelen bemenet: a várt érték ${util.stringifyPrimitive(issue.values[0])}`;
                return `Érvénytelen opció: valamelyik érték várt ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Túl nagy: ${issue.origin ?? "érték"} mérete túl nagy ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elem"}`;
                return `Túl nagy: a bemeneti érték ${issue.origin ?? "érték"} túl nagy: ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Túl kicsi: a bemeneti érték ${issue.origin} mérete túl kicsi ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Túl kicsi: a bemeneti érték ${issue.origin} túl kicsi ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Érvénytelen string: "${_issue.prefix}" értékkel kell kezdődnie`;
                if (_issue.format === "ends_with")
                    return `Érvénytelen string: "${_issue.suffix}" értékkel kell végződnie`;
                if (_issue.format === "includes")
                    return `Érvénytelen string: "${_issue.includes}" értéket kell tartalmaznia`;
                if (_issue.format === "regex")
                    return `Érvénytelen string: ${_issue.pattern} mintának kell megfelelnie`;
                return `Érvénytelen ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Érvénytelen szám: ${issue.divisor} többszörösének kell lennie`;
            case "unrecognized_keys":
                return `Ismeretlen kulcs${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Érvénytelen kulcs ${issue.origin}`;
            case "invalid_union":
                return "Érvénytelen bemenet";
            case "invalid_element":
                return `Érvénytelen érték: ${issue.origin}`;
            default:
                return `Érvénytelen bemenet`;
        }
    };
};
/* harmony default export */ function hu() {
    return {
        localeError: hu_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/hy.js

function getArmenianPlural(count, one, many) {
    return Math.abs(count) === 1 ? one : many;
}
function withDefiniteArticle(word) {
    if (!word)
        return "";
    const vowels = ["ա", "ե", "ը", "ի", "ո", "ու", "օ"];
    const lastChar = word[word.length - 1];
    return word + (vowels.includes(lastChar) ? "ն" : "ը");
}
const hy_error = () => {
    const Sizable = {
        string: {
            unit: {
                one: "նշան",
                many: "նշաններ",
            },
            verb: "ունենալ",
        },
        file: {
            unit: {
                one: "բայթ",
                many: "բայթեր",
            },
            verb: "ունենալ",
        },
        array: {
            unit: {
                one: "տարր",
                many: "տարրեր",
            },
            verb: "ունենալ",
        },
        set: {
            unit: {
                one: "տարր",
                many: "տարրեր",
            },
            verb: "ունենալ",
        },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "մուտք",
        email: "էլ. հասցե",
        url: "URL",
        emoji: "էմոջի",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO ամսաթիվ և ժամ",
        date: "ISO ամսաթիվ",
        time: "ISO ժամ",
        duration: "ISO տևողություն",
        ipv4: "IPv4 հասցե",
        ipv6: "IPv6 հասցե",
        cidrv4: "IPv4 միջակայք",
        cidrv6: "IPv6 միջակայք",
        base64: "base64 ձևաչափով տող",
        base64url: "base64url ձևաչափով տող",
        json_string: "JSON տող",
        e164: "E.164 համար",
        jwt: "JWT",
        template_literal: "մուտք",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "թիվ",
        array: "զանգված",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Սխալ մուտքագրում․ սպասվում էր instanceof ${issue.expected}, ստացվել է ${received}`;
                }
                return `Սխալ մուտքագրում․ սպասվում էր ${expected}, ստացվել է ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Սխալ մուտքագրում․ սպասվում էր ${util.stringifyPrimitive(issue.values[1])}`;
                return `Սխալ տարբերակ․ սպասվում էր հետևյալներից մեկը՝ ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    const maxValue = Number(issue.maximum);
                    const unit = getArmenianPlural(maxValue, sizing.unit.one, sizing.unit.many);
                    return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(issue.origin ?? "արժեք")} կունենա ${adj}${issue.maximum.toString()} ${unit}`;
                }
                return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(issue.origin ?? "արժեք")} լինի ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    const minValue = Number(issue.minimum);
                    const unit = getArmenianPlural(minValue, sizing.unit.one, sizing.unit.many);
                    return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(issue.origin)} կունենա ${adj}${issue.minimum.toString()} ${unit}`;
                }
                return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(issue.origin)} լինի ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Սխալ տող․ պետք է սկսվի "${_issue.prefix}"-ով`;
                if (_issue.format === "ends_with")
                    return `Սխալ տող․ պետք է ավարտվի "${_issue.suffix}"-ով`;
                if (_issue.format === "includes")
                    return `Սխալ տող․ պետք է պարունակի "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Սխալ տող․ պետք է համապատասխանի ${_issue.pattern} ձևաչափին`;
                return `Սխալ ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Սխալ թիվ․ պետք է բազմապատիկ լինի ${issue.divisor}-ի`;
            case "unrecognized_keys":
                return `Չճանաչված բանալի${issue.keys.length > 1 ? "ներ" : ""}. ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Սխալ բանալի ${withDefiniteArticle(issue.origin)}-ում`;
            case "invalid_union":
                return "Սխալ մուտքագրում";
            case "invalid_element":
                return `Սխալ արժեք ${withDefiniteArticle(issue.origin)}-ում`;
            default:
                return `Սխալ մուտքագրում`;
        }
    };
};
/* harmony default export */ function hy() {
    return {
        localeError: hy_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/id.js

const id_error = () => {
    const Sizable = {
        string: { unit: "karakter", verb: "memiliki" },
        file: { unit: "byte", verb: "memiliki" },
        array: { unit: "item", verb: "memiliki" },
        set: { unit: "item", verb: "memiliki" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "alamat email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "tanggal dan waktu format ISO",
        date: "tanggal format ISO",
        time: "jam format ISO",
        duration: "durasi format ISO",
        ipv4: "alamat IPv4",
        ipv6: "alamat IPv6",
        cidrv4: "rentang alamat IPv4",
        cidrv6: "rentang alamat IPv6",
        base64: "string dengan enkode base64",
        base64url: "string dengan enkode base64url",
        json_string: "string JSON",
        e164: "angka E.164",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Input tidak valid: diharapkan instanceof ${issue.expected}, diterima ${received}`;
                }
                return `Input tidak valid: diharapkan ${expected}, diterima ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Input tidak valid: diharapkan ${util.stringifyPrimitive(issue.values[0])}`;
                return `Pilihan tidak valid: diharapkan salah satu dari ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Terlalu besar: diharapkan ${issue.origin ?? "value"} memiliki ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elemen"}`;
                return `Terlalu besar: diharapkan ${issue.origin ?? "value"} menjadi ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Terlalu kecil: diharapkan ${issue.origin} memiliki ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Terlalu kecil: diharapkan ${issue.origin} menjadi ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `String tidak valid: harus menyertakan "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} tidak valid`;
            }
            case "not_multiple_of":
                return `Angka tidak valid: harus kelipatan dari ${issue.divisor}`;
            case "unrecognized_keys":
                return `Kunci tidak dikenali ${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Kunci tidak valid di ${issue.origin}`;
            case "invalid_union":
                return "Input tidak valid";
            case "invalid_element":
                return `Nilai tidak valid di ${issue.origin}`;
            default:
                return `Input tidak valid`;
        }
    };
};
/* harmony default export */ function id() {
    return {
        localeError: id_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/is.js

const is_error = () => {
    const Sizable = {
        string: { unit: "stafi", verb: "að hafa" },
        file: { unit: "bæti", verb: "að hafa" },
        array: { unit: "hluti", verb: "að hafa" },
        set: { unit: "hluti", verb: "að hafa" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "gildi",
        email: "netfang",
        url: "vefslóð",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dagsetning og tími",
        date: "ISO dagsetning",
        time: "ISO tími",
        duration: "ISO tímalengd",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded strengur",
        base64url: "base64url-encoded strengur",
        json_string: "JSON strengur",
        e164: "E.164 tölugildi",
        jwt: "JWT",
        template_literal: "gildi",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "númer",
        array: "fylki",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Rangt gildi: Þú slóst inn ${received} þar sem á að vera instanceof ${issue.expected}`;
                }
                return `Rangt gildi: Þú slóst inn ${received} þar sem á að vera ${expected}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Rangt gildi: gert ráð fyrir ${util.stringifyPrimitive(issue.values[0])}`;
                return `Ógilt val: má vera eitt af eftirfarandi ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Of stórt: gert er ráð fyrir að ${issue.origin ?? "gildi"} hafi ${adj}${issue.maximum.toString()} ${sizing.unit ?? "hluti"}`;
                return `Of stórt: gert er ráð fyrir að ${issue.origin ?? "gildi"} sé ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Of lítið: gert er ráð fyrir að ${issue.origin} hafi ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Of lítið: gert er ráð fyrir að ${issue.origin} sé ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Ógildur strengur: verður að byrja á "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Ógildur strengur: verður að enda á "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Ógildur strengur: verður að innihalda "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Ógildur strengur: verður að fylgja mynstri ${_issue.pattern}`;
                return `Rangt ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Röng tala: verður að vera margfeldi af ${issue.divisor}`;
            case "unrecognized_keys":
                return `Óþekkt ${issue.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Rangur lykill í ${issue.origin}`;
            case "invalid_union":
                return "Rangt gildi";
            case "invalid_element":
                return `Rangt gildi í ${issue.origin}`;
            default:
                return `Rangt gildi`;
        }
    };
};
/* harmony default export */ function is() {
    return {
        localeError: is_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/it.js

const it_error = () => {
    const Sizable = {
        string: { unit: "caratteri", verb: "avere" },
        file: { unit: "byte", verb: "avere" },
        array: { unit: "elementi", verb: "avere" },
        set: { unit: "elementi", verb: "avere" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "indirizzo email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data e ora ISO",
        date: "data ISO",
        time: "ora ISO",
        duration: "durata ISO",
        ipv4: "indirizzo IPv4",
        ipv6: "indirizzo IPv6",
        cidrv4: "intervallo IPv4",
        cidrv6: "intervallo IPv6",
        base64: "stringa codificata in base64",
        base64url: "URL codificata in base64",
        json_string: "stringa JSON",
        e164: "numero E.164",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "numero",
        array: "vettore",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Input non valido: atteso instanceof ${issue.expected}, ricevuto ${received}`;
                }
                return `Input non valido: atteso ${expected}, ricevuto ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Input non valido: atteso ${util.stringifyPrimitive(issue.values[0])}`;
                return `Opzione non valida: atteso uno tra ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Troppo grande: ${issue.origin ?? "valore"} deve avere ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementi"}`;
                return `Troppo grande: ${issue.origin ?? "valore"} deve essere ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Troppo piccolo: ${issue.origin} deve avere ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Troppo piccolo: ${issue.origin} deve essere ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Stringa non valida: deve includere "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
                return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Numero non valido: deve essere un multiplo di ${issue.divisor}`;
            case "unrecognized_keys":
                return `Chiav${issue.keys.length > 1 ? "i" : "e"} non riconosciut${issue.keys.length > 1 ? "e" : "a"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Chiave non valida in ${issue.origin}`;
            case "invalid_union":
                return "Input non valido";
            case "invalid_element":
                return `Valore non valido in ${issue.origin}`;
            default:
                return `Input non valido`;
        }
    };
};
/* harmony default export */ function it() {
    return {
        localeError: it_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ja.js

const ja_error = () => {
    const Sizable = {
        string: { unit: "文字", verb: "である" },
        file: { unit: "バイト", verb: "である" },
        array: { unit: "要素", verb: "である" },
        set: { unit: "要素", verb: "である" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "入力値",
        email: "メールアドレス",
        url: "URL",
        emoji: "絵文字",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO日時",
        date: "ISO日付",
        time: "ISO時刻",
        duration: "ISO期間",
        ipv4: "IPv4アドレス",
        ipv6: "IPv6アドレス",
        cidrv4: "IPv4範囲",
        cidrv6: "IPv6範囲",
        base64: "base64エンコード文字列",
        base64url: "base64urlエンコード文字列",
        json_string: "JSON文字列",
        e164: "E.164番号",
        jwt: "JWT",
        template_literal: "入力値",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "数値",
        array: "配列",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `無効な入力: instanceof ${issue.expected}が期待されましたが、${received}が入力されました`;
                }
                return `無効な入力: ${expected}が期待されましたが、${received}が入力されました`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `無効な入力: ${util.stringifyPrimitive(issue.values[0])}が期待されました`;
                return `無効な選択: ${util.joinValues(issue.values, "、")}のいずれかである必要があります`;
            case "too_big": {
                const adj = issue.inclusive ? "以下である" : "より小さい";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `大きすぎる値: ${issue.origin ?? "値"}は${issue.maximum.toString()}${sizing.unit ?? "要素"}${adj}必要があります`;
                return `大きすぎる値: ${issue.origin ?? "値"}は${issue.maximum.toString()}${adj}必要があります`;
            }
            case "too_small": {
                const adj = issue.inclusive ? "以上である" : "より大きい";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `小さすぎる値: ${issue.origin}は${issue.minimum.toString()}${sizing.unit}${adj}必要があります`;
                return `小さすぎる値: ${issue.origin}は${issue.minimum.toString()}${adj}必要があります`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `無効な文字列: "${_issue.prefix}"で始まる必要があります`;
                if (_issue.format === "ends_with")
                    return `無効な文字列: "${_issue.suffix}"で終わる必要があります`;
                if (_issue.format === "includes")
                    return `無効な文字列: "${_issue.includes}"を含む必要があります`;
                if (_issue.format === "regex")
                    return `無効な文字列: パターン${_issue.pattern}に一致する必要があります`;
                return `無効な${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `無効な数値: ${issue.divisor}の倍数である必要があります`;
            case "unrecognized_keys":
                return `認識されていないキー${issue.keys.length > 1 ? "群" : ""}: ${util.joinValues(issue.keys, "、")}`;
            case "invalid_key":
                return `${issue.origin}内の無効なキー`;
            case "invalid_union":
                return "無効な入力";
            case "invalid_element":
                return `${issue.origin}内の無効な値`;
            default:
                return `無効な入力`;
        }
    };
};
/* harmony default export */ function ja() {
    return {
        localeError: ja_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ka.js

const ka_error = () => {
    const Sizable = {
        string: { unit: "სიმბოლო", verb: "უნდა შეიცავდეს" },
        file: { unit: "ბაიტი", verb: "უნდა შეიცავდეს" },
        array: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" },
        set: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "შეყვანა",
        email: "ელ-ფოსტის მისამართი",
        url: "URL",
        emoji: "ემოჯი",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "თარიღი-დრო",
        date: "თარიღი",
        time: "დრო",
        duration: "ხანგრძლივობა",
        ipv4: "IPv4 მისამართი",
        ipv6: "IPv6 მისამართი",
        cidrv4: "IPv4 დიაპაზონი",
        cidrv6: "IPv6 დიაპაზონი",
        base64: "base64-კოდირებული სტრინგი",
        base64url: "base64url-კოდირებული სტრინგი",
        json_string: "JSON სტრინგი",
        e164: "E.164 ნომერი",
        jwt: "JWT",
        template_literal: "შეყვანა",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "რიცხვი",
        string: "სტრინგი",
        boolean: "ბულეანი",
        function: "ფუნქცია",
        array: "მასივი",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `არასწორი შეყვანა: მოსალოდნელი instanceof ${issue.expected}, მიღებული ${received}`;
                }
                return `არასწორი შეყვანა: მოსალოდნელი ${expected}, მიღებული ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `არასწორი შეყვანა: მოსალოდნელი ${util.stringifyPrimitive(issue.values[0])}`;
                return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${util.joinValues(issue.values, "|")}-დან`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `ზედმეტად დიდი: მოსალოდნელი ${issue.origin ?? "მნიშვნელობა"} ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit}`;
                return `ზედმეტად დიდი: მოსალოდნელი ${issue.origin ?? "მნიშვნელობა"} იყოს ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `ზედმეტად პატარა: მოსალოდნელი ${issue.origin} ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `ზედმეტად პატარა: მოსალოდნელი ${issue.origin} იყოს ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `არასწორი სტრინგი: უნდა იწყებოდეს "${_issue.prefix}"-ით`;
                }
                if (_issue.format === "ends_with")
                    return `არასწორი სტრინგი: უნდა მთავრდებოდეს "${_issue.suffix}"-ით`;
                if (_issue.format === "includes")
                    return `არასწორი სტრინგი: უნდა შეიცავდეს "${_issue.includes}"-ს`;
                if (_issue.format === "regex")
                    return `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${_issue.pattern}`;
                return `არასწორი ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `არასწორი რიცხვი: უნდა იყოს ${issue.divisor}-ის ჯერადი`;
            case "unrecognized_keys":
                return `უცნობი გასაღებ${issue.keys.length > 1 ? "ები" : "ი"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `არასწორი გასაღები ${issue.origin}-ში`;
            case "invalid_union":
                return "არასწორი შეყვანა";
            case "invalid_element":
                return `არასწორი მნიშვნელობა ${issue.origin}-ში`;
            default:
                return `არასწორი შეყვანა`;
        }
    };
};
/* harmony default export */ function ka() {
    return {
        localeError: ka_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/km.js

const km_error = () => {
    const Sizable = {
        string: { unit: "តួអក្សរ", verb: "គួរមាន" },
        file: { unit: "បៃ", verb: "គួរមាន" },
        array: { unit: "ធាតុ", verb: "គួរមាន" },
        set: { unit: "ធាតុ", verb: "គួរមាន" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ទិន្នន័យបញ្ចូល",
        email: "អាសយដ្ឋានអ៊ីមែល",
        url: "URL",
        emoji: "សញ្ញាអារម្មណ៍",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "កាលបរិច្ឆេទ និងម៉ោង ISO",
        date: "កាលបរិច្ឆេទ ISO",
        time: "ម៉ោង ISO",
        duration: "រយៈពេល ISO",
        ipv4: "អាសយដ្ឋាន IPv4",
        ipv6: "អាសយដ្ឋាន IPv6",
        cidrv4: "ដែនអាសយដ្ឋាន IPv4",
        cidrv6: "ដែនអាសយដ្ឋាន IPv6",
        base64: "ខ្សែអក្សរអ៊ិកូដ base64",
        base64url: "ខ្សែអក្សរអ៊ិកូដ base64url",
        json_string: "ខ្សែអក្សរ JSON",
        e164: "លេខ E.164",
        jwt: "JWT",
        template_literal: "ទិន្នន័យបញ្ចូល",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "លេខ",
        array: "អារេ (Array)",
        null: "គ្មានតម្លៃ (null)",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ instanceof ${issue.expected} ប៉ុន្តែទទួលបាន ${received}`;
                }
                return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${expected} ប៉ុន្តែទទួលបាន ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${util.stringifyPrimitive(issue.values[0])}`;
                return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `ធំពេក៖ ត្រូវការ ${issue.origin ?? "តម្លៃ"} ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "ធាតុ"}`;
                return `ធំពេក៖ ត្រូវការ ${issue.origin ?? "តម្លៃ"} ${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `តូចពេក៖ ត្រូវការ ${issue.origin} ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `តូចពេក៖ ត្រូវការ ${issue.origin} ${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${_issue.pattern}`;
                return `មិនត្រឹមត្រូវ៖ ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${issue.divisor}`;
            case "unrecognized_keys":
                return `រកឃើញសោមិនស្គាល់៖ ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `សោមិនត្រឹមត្រូវនៅក្នុង ${issue.origin}`;
            case "invalid_union":
                return `ទិន្នន័យមិនត្រឹមត្រូវ`;
            case "invalid_element":
                return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${issue.origin}`;
            default:
                return `ទិន្នន័យមិនត្រឹមត្រូវ`;
        }
    };
};
/* harmony default export */ function locales_km() {
    return {
        localeError: km_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/kh.js

/** @deprecated Use `km` instead. */
/* harmony default export */ function kh() {
    return km();
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ko.js

const ko_error = () => {
    const Sizable = {
        string: { unit: "문자", verb: "to have" },
        file: { unit: "바이트", verb: "to have" },
        array: { unit: "개", verb: "to have" },
        set: { unit: "개", verb: "to have" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "입력",
        email: "이메일 주소",
        url: "URL",
        emoji: "이모지",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO 날짜시간",
        date: "ISO 날짜",
        time: "ISO 시간",
        duration: "ISO 기간",
        ipv4: "IPv4 주소",
        ipv6: "IPv6 주소",
        cidrv4: "IPv4 범위",
        cidrv6: "IPv6 범위",
        base64: "base64 인코딩 문자열",
        base64url: "base64url 인코딩 문자열",
        json_string: "JSON 문자열",
        e164: "E.164 번호",
        jwt: "JWT",
        template_literal: "입력",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `잘못된 입력: 예상 타입은 instanceof ${issue.expected}, 받은 타입은 ${received}입니다`;
                }
                return `잘못된 입력: 예상 타입은 ${expected}, 받은 타입은 ${received}입니다`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `잘못된 입력: 값은 ${util.stringifyPrimitive(issue.values[0])} 이어야 합니다`;
                return `잘못된 옵션: ${util.joinValues(issue.values, "또는 ")} 중 하나여야 합니다`;
            case "too_big": {
                const adj = issue.inclusive ? "이하" : "미만";
                const suffix = adj === "미만" ? "이어야 합니다" : "여야 합니다";
                const sizing = getSizing(issue.origin);
                const unit = sizing?.unit ?? "요소";
                if (sizing)
                    return `${issue.origin ?? "값"}이 너무 큽니다: ${issue.maximum.toString()}${unit} ${adj}${suffix}`;
                return `${issue.origin ?? "값"}이 너무 큽니다: ${issue.maximum.toString()} ${adj}${suffix}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? "이상" : "초과";
                const suffix = adj === "이상" ? "이어야 합니다" : "여야 합니다";
                const sizing = getSizing(issue.origin);
                const unit = sizing?.unit ?? "요소";
                if (sizing) {
                    return `${issue.origin ?? "값"}이 너무 작습니다: ${issue.minimum.toString()}${unit} ${adj}${suffix}`;
                }
                return `${issue.origin ?? "값"}이 너무 작습니다: ${issue.minimum.toString()} ${adj}${suffix}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `잘못된 문자열: "${_issue.prefix}"(으)로 시작해야 합니다`;
                }
                if (_issue.format === "ends_with")
                    return `잘못된 문자열: "${_issue.suffix}"(으)로 끝나야 합니다`;
                if (_issue.format === "includes")
                    return `잘못된 문자열: "${_issue.includes}"을(를) 포함해야 합니다`;
                if (_issue.format === "regex")
                    return `잘못된 문자열: 정규식 ${_issue.pattern} 패턴과 일치해야 합니다`;
                return `잘못된 ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `잘못된 숫자: ${issue.divisor}의 배수여야 합니다`;
            case "unrecognized_keys":
                return `인식할 수 없는 키: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `잘못된 키: ${issue.origin}`;
            case "invalid_union":
                return `잘못된 입력`;
            case "invalid_element":
                return `잘못된 값: ${issue.origin}`;
            default:
                return `잘못된 입력`;
        }
    };
};
/* harmony default export */ function ko() {
    return {
        localeError: ko_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/lt.js

const capitalizeFirstCharacter = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
};
function getUnitTypeFromNumber(number) {
    const abs = Math.abs(number);
    const last = abs % 10;
    const last2 = abs % 100;
    if ((last2 >= 11 && last2 <= 19) || last === 0)
        return "many";
    if (last === 1)
        return "one";
    return "few";
}
const lt_error = () => {
    const Sizable = {
        string: {
            unit: {
                one: "simbolis",
                few: "simboliai",
                many: "simbolių",
            },
            verb: {
                smaller: {
                    inclusive: "turi būti ne ilgesnė kaip",
                    notInclusive: "turi būti trumpesnė kaip",
                },
                bigger: {
                    inclusive: "turi būti ne trumpesnė kaip",
                    notInclusive: "turi būti ilgesnė kaip",
                },
            },
        },
        file: {
            unit: {
                one: "baitas",
                few: "baitai",
                many: "baitų",
            },
            verb: {
                smaller: {
                    inclusive: "turi būti ne didesnis kaip",
                    notInclusive: "turi būti mažesnis kaip",
                },
                bigger: {
                    inclusive: "turi būti ne mažesnis kaip",
                    notInclusive: "turi būti didesnis kaip",
                },
            },
        },
        array: {
            unit: {
                one: "elementą",
                few: "elementus",
                many: "elementų",
            },
            verb: {
                smaller: {
                    inclusive: "turi turėti ne daugiau kaip",
                    notInclusive: "turi turėti mažiau kaip",
                },
                bigger: {
                    inclusive: "turi turėti ne mažiau kaip",
                    notInclusive: "turi turėti daugiau kaip",
                },
            },
        },
        set: {
            unit: {
                one: "elementą",
                few: "elementus",
                many: "elementų",
            },
            verb: {
                smaller: {
                    inclusive: "turi turėti ne daugiau kaip",
                    notInclusive: "turi turėti mažiau kaip",
                },
                bigger: {
                    inclusive: "turi turėti ne mažiau kaip",
                    notInclusive: "turi turėti daugiau kaip",
                },
            },
        },
    };
    function getSizing(origin, unitType, inclusive, targetShouldBe) {
        const result = Sizable[origin] ?? null;
        if (result === null)
            return result;
        return {
            unit: result.unit[unitType],
            verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"],
        };
    }
    const FormatDictionary = {
        regex: "įvestis",
        email: "el. pašto adresas",
        url: "URL",
        emoji: "jaustukas",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO data ir laikas",
        date: "ISO data",
        time: "ISO laikas",
        duration: "ISO trukmė",
        ipv4: "IPv4 adresas",
        ipv6: "IPv6 adresas",
        cidrv4: "IPv4 tinklo prefiksas (CIDR)",
        cidrv6: "IPv6 tinklo prefiksas (CIDR)",
        base64: "base64 užkoduota eilutė",
        base64url: "base64url užkoduota eilutė",
        json_string: "JSON eilutė",
        e164: "E.164 numeris",
        jwt: "JWT",
        template_literal: "įvestis",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "skaičius",
        bigint: "sveikasis skaičius",
        string: "eilutė",
        boolean: "loginė reikšmė",
        undefined: "neapibrėžta reikšmė",
        function: "funkcija",
        symbol: "simbolis",
        array: "masyvas",
        object: "objektas",
        null: "nulinė reikšmė",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Gautas tipas ${received}, o tikėtasi - instanceof ${issue.expected}`;
                }
                return `Gautas tipas ${received}, o tikėtasi - ${expected}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Privalo būti ${util.stringifyPrimitive(issue.values[0])}`;
                return `Privalo būti vienas iš ${util.joinValues(issue.values, "|")} pasirinkimų`;
            case "too_big": {
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                const sizing = getSizing(issue.origin, getUnitTypeFromNumber(Number(issue.maximum)), issue.inclusive ?? false, "smaller");
                if (sizing?.verb)
                    return `${capitalizeFirstCharacter(origin ?? issue.origin ?? "reikšmė")} ${sizing.verb} ${issue.maximum.toString()} ${sizing.unit ?? "elementų"}`;
                const adj = issue.inclusive ? "ne didesnis kaip" : "mažesnis kaip";
                return `${capitalizeFirstCharacter(origin ?? issue.origin ?? "reikšmė")} turi būti ${adj} ${issue.maximum.toString()} ${sizing?.unit}`;
            }
            case "too_small": {
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                const sizing = getSizing(issue.origin, getUnitTypeFromNumber(Number(issue.minimum)), issue.inclusive ?? false, "bigger");
                if (sizing?.verb)
                    return `${capitalizeFirstCharacter(origin ?? issue.origin ?? "reikšmė")} ${sizing.verb} ${issue.minimum.toString()} ${sizing.unit ?? "elementų"}`;
                const adj = issue.inclusive ? "ne mažesnis kaip" : "didesnis kaip";
                return `${capitalizeFirstCharacter(origin ?? issue.origin ?? "reikšmė")} turi būti ${adj} ${issue.minimum.toString()} ${sizing?.unit}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Eilutė privalo prasidėti "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Eilutė privalo pasibaigti "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Eilutė privalo įtraukti "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Eilutė privalo atitikti ${_issue.pattern}`;
                return `Neteisingas ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Skaičius privalo būti ${issue.divisor} kartotinis.`;
            case "unrecognized_keys":
                return `Neatpažint${issue.keys.length > 1 ? "i" : "as"} rakt${issue.keys.length > 1 ? "ai" : "as"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return "Rastas klaidingas raktas";
            case "invalid_union":
                return "Klaidinga įvestis";
            case "invalid_element": {
                const origin = TypeDictionary[issue.origin] ?? issue.origin;
                return `${capitalizeFirstCharacter(origin ?? issue.origin ?? "reikšmė")} turi klaidingą įvestį`;
            }
            default:
                return "Klaidinga įvestis";
        }
    };
};
/* harmony default export */ function lt() {
    return {
        localeError: lt_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/mk.js

const mk_error = () => {
    const Sizable = {
        string: { unit: "знаци", verb: "да имаат" },
        file: { unit: "бајти", verb: "да имаат" },
        array: { unit: "ставки", verb: "да имаат" },
        set: { unit: "ставки", verb: "да имаат" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "внес",
        email: "адреса на е-пошта",
        url: "URL",
        emoji: "емоџи",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO датум и време",
        date: "ISO датум",
        time: "ISO време",
        duration: "ISO времетраење",
        ipv4: "IPv4 адреса",
        ipv6: "IPv6 адреса",
        cidrv4: "IPv4 опсег",
        cidrv6: "IPv6 опсег",
        base64: "base64-енкодирана низа",
        base64url: "base64url-енкодирана низа",
        json_string: "JSON низа",
        e164: "E.164 број",
        jwt: "JWT",
        template_literal: "внес",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "број",
        array: "низа",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Грешен внес: се очекува instanceof ${issue.expected}, примено ${received}`;
                }
                return `Грешен внес: се очекува ${expected}, примено ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Invalid input: expected ${util.stringifyPrimitive(issue.values[0])}`;
                return `Грешана опција: се очекува една ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Премногу голем: се очекува ${issue.origin ?? "вредноста"} да има ${adj}${issue.maximum.toString()} ${sizing.unit ?? "елементи"}`;
                return `Премногу голем: се очекува ${issue.origin ?? "вредноста"} да биде ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Премногу мал: се очекува ${issue.origin} да има ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Премногу мал: се очекува ${issue.origin} да биде ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Неважечка низа: мора да започнува со "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Неважечка низа: мора да завршува со "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Неважечка низа: мора да вклучува "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Неважечка низа: мора да одгоара на патернот ${_issue.pattern}`;
                return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Грешен број: мора да биде делив со ${issue.divisor}`;
            case "unrecognized_keys":
                return `${issue.keys.length > 1 ? "Непрепознаени клучеви" : "Непрепознаен клуч"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Грешен клуч во ${issue.origin}`;
            case "invalid_union":
                return "Грешен внес";
            case "invalid_element":
                return `Грешна вредност во ${issue.origin}`;
            default:
                return `Грешен внес`;
        }
    };
};
/* harmony default export */ function mk() {
    return {
        localeError: mk_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ms.js

const ms_error = () => {
    const Sizable = {
        string: { unit: "aksara", verb: "mempunyai" },
        file: { unit: "bait", verb: "mempunyai" },
        array: { unit: "elemen", verb: "mempunyai" },
        set: { unit: "elemen", verb: "mempunyai" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "alamat e-mel",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "tarikh masa ISO",
        date: "tarikh ISO",
        time: "masa ISO",
        duration: "tempoh ISO",
        ipv4: "alamat IPv4",
        ipv6: "alamat IPv6",
        cidrv4: "julat IPv4",
        cidrv6: "julat IPv6",
        base64: "string dikodkan base64",
        base64url: "string dikodkan base64url",
        json_string: "string JSON",
        e164: "nombor E.164",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "nombor",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Input tidak sah: dijangka instanceof ${issue.expected}, diterima ${received}`;
                }
                return `Input tidak sah: dijangka ${expected}, diterima ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Input tidak sah: dijangka ${util.stringifyPrimitive(issue.values[0])}`;
                return `Pilihan tidak sah: dijangka salah satu daripada ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Terlalu besar: dijangka ${issue.origin ?? "nilai"} ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elemen"}`;
                return `Terlalu besar: dijangka ${issue.origin ?? "nilai"} adalah ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Terlalu kecil: dijangka ${issue.origin} ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Terlalu kecil: dijangka ${issue.origin} adalah ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} tidak sah`;
            }
            case "not_multiple_of":
                return `Nombor tidak sah: perlu gandaan ${issue.divisor}`;
            case "unrecognized_keys":
                return `Kunci tidak dikenali: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Kunci tidak sah dalam ${issue.origin}`;
            case "invalid_union":
                return "Input tidak sah";
            case "invalid_element":
                return `Nilai tidak sah dalam ${issue.origin}`;
            default:
                return `Input tidak sah`;
        }
    };
};
/* harmony default export */ function ms() {
    return {
        localeError: ms_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/nl.js

const nl_error = () => {
    const Sizable = {
        string: { unit: "tekens", verb: "heeft" },
        file: { unit: "bytes", verb: "heeft" },
        array: { unit: "elementen", verb: "heeft" },
        set: { unit: "elementen", verb: "heeft" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "invoer",
        email: "emailadres",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum en tijd",
        date: "ISO datum",
        time: "ISO tijd",
        duration: "ISO duur",
        ipv4: "IPv4-adres",
        ipv6: "IPv6-adres",
        cidrv4: "IPv4-bereik",
        cidrv6: "IPv6-bereik",
        base64: "base64-gecodeerde tekst",
        base64url: "base64 URL-gecodeerde tekst",
        json_string: "JSON string",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "invoer",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "getal",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Ongeldige invoer: verwacht instanceof ${issue.expected}, ontving ${received}`;
                }
                return `Ongeldige invoer: verwacht ${expected}, ontving ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Ongeldige invoer: verwacht ${util.stringifyPrimitive(issue.values[0])}`;
                return `Ongeldige optie: verwacht één van ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                const longName = issue.origin === "date" ? "laat" : issue.origin === "string" ? "lang" : "groot";
                if (sizing)
                    return `Te ${longName}: verwacht dat ${issue.origin ?? "waarde"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementen"} ${sizing.verb}`;
                return `Te ${longName}: verwacht dat ${issue.origin ?? "waarde"} ${adj}${issue.maximum.toString()} is`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                const shortName = issue.origin === "date" ? "vroeg" : issue.origin === "string" ? "kort" : "klein";
                if (sizing) {
                    return `Te ${shortName}: verwacht dat ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
                }
                return `Te ${shortName}: verwacht dat ${issue.origin} ${adj}${issue.minimum.toString()} is`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
                }
                if (_issue.format === "ends_with")
                    return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
                if (_issue.format === "includes")
                    return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
                if (_issue.format === "regex")
                    return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
                return `Ongeldig: ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Ongeldig getal: moet een veelvoud van ${issue.divisor} zijn`;
            case "unrecognized_keys":
                return `Onbekende key${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Ongeldige key in ${issue.origin}`;
            case "invalid_union":
                return "Ongeldige invoer";
            case "invalid_element":
                return `Ongeldige waarde in ${issue.origin}`;
            default:
                return `Ongeldige invoer`;
        }
    };
};
/* harmony default export */ function nl() {
    return {
        localeError: nl_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/no.js

const no_error = () => {
    const Sizable = {
        string: { unit: "tegn", verb: "å ha" },
        file: { unit: "bytes", verb: "å ha" },
        array: { unit: "elementer", verb: "å inneholde" },
        set: { unit: "elementer", verb: "å inneholde" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "input",
        email: "e-postadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkeslett",
        date: "ISO-dato",
        time: "ISO-klokkeslett",
        duration: "ISO-varighet",
        ipv4: "IPv4-område",
        ipv6: "IPv6-område",
        cidrv4: "IPv4-spekter",
        cidrv6: "IPv6-spekter",
        base64: "base64-enkodet streng",
        base64url: "base64url-enkodet streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "tall",
        array: "liste",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Ugyldig input: forventet instanceof ${issue.expected}, fikk ${received}`;
                }
                return `Ugyldig input: forventet ${expected}, fikk ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Ugyldig verdi: forventet ${util.stringifyPrimitive(issue.values[0])}`;
                return `Ugyldig valg: forventet en av ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `For stor(t): forventet ${issue.origin ?? "value"} til å ha ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementer"}`;
                return `For stor(t): forventet ${issue.origin ?? "value"} til å ha ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `For lite(n): forventet ${issue.origin} til å ha ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `For lite(n): forventet ${issue.origin} til å ha ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Ugyldig streng: må starte med "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Ugyldig streng: må ende med "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Ugyldig streng: må inneholde "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Ugyldig streng: må matche mønsteret ${_issue.pattern}`;
                return `Ugyldig ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Ugyldig tall: må være et multiplum av ${issue.divisor}`;
            case "unrecognized_keys":
                return `${issue.keys.length > 1 ? "Ukjente nøkler" : "Ukjent nøkkel"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Ugyldig nøkkel i ${issue.origin}`;
            case "invalid_union":
                return "Ugyldig input";
            case "invalid_element":
                return `Ugyldig verdi i ${issue.origin}`;
            default:
                return `Ugyldig input`;
        }
    };
};
/* harmony default export */ function no() {
    return {
        localeError: no_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ota.js

const ota_error = () => {
    const Sizable = {
        string: { unit: "harf", verb: "olmalıdır" },
        file: { unit: "bayt", verb: "olmalıdır" },
        array: { unit: "unsur", verb: "olmalıdır" },
        set: { unit: "unsur", verb: "olmalıdır" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "giren",
        email: "epostagâh",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO hengâmı",
        date: "ISO tarihi",
        time: "ISO zamanı",
        duration: "ISO müddeti",
        ipv4: "IPv4 nişânı",
        ipv6: "IPv6 nişânı",
        cidrv4: "IPv4 menzili",
        cidrv6: "IPv6 menzili",
        base64: "base64-şifreli metin",
        base64url: "base64url-şifreli metin",
        json_string: "JSON metin",
        e164: "E.164 sayısı",
        jwt: "JWT",
        template_literal: "giren",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "numara",
        array: "saf",
        null: "gayb",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Fâsit giren: umulan instanceof ${issue.expected}, alınan ${received}`;
                }
                return `Fâsit giren: umulan ${expected}, alınan ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Fâsit giren: umulan ${util.stringifyPrimitive(issue.values[0])}`;
                return `Fâsit tercih: mûteberler ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Fazla büyük: ${issue.origin ?? "value"}, ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmalıydı.`;
                return `Fazla büyük: ${issue.origin ?? "value"}, ${adj}${issue.maximum.toString()} olmalıydı.`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Fazla küçük: ${issue.origin}, ${adj}${issue.minimum.toString()} ${sizing.unit} sahip olmalıydı.`;
                }
                return `Fazla küçük: ${issue.origin}, ${adj}${issue.minimum.toString()} olmalıydı.`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Fâsit metin: "${_issue.prefix}" ile başlamalı.`;
                if (_issue.format === "ends_with")
                    return `Fâsit metin: "${_issue.suffix}" ile bitmeli.`;
                if (_issue.format === "includes")
                    return `Fâsit metin: "${_issue.includes}" ihtivâ etmeli.`;
                if (_issue.format === "regex")
                    return `Fâsit metin: ${_issue.pattern} nakşına uymalı.`;
                return `Fâsit ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Fâsit sayı: ${issue.divisor} katı olmalıydı.`;
            case "unrecognized_keys":
                return `Tanınmayan anahtar ${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} için tanınmayan anahtar var.`;
            case "invalid_union":
                return "Giren tanınamadı.";
            case "invalid_element":
                return `${issue.origin} için tanınmayan kıymet var.`;
            default:
                return `Kıymet tanınamadı.`;
        }
    };
};
/* harmony default export */ function ota() {
    return {
        localeError: ota_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ps.js

const ps_error = () => {
    const Sizable = {
        string: { unit: "توکي", verb: "ولري" },
        file: { unit: "بایټس", verb: "ولري" },
        array: { unit: "توکي", verb: "ولري" },
        set: { unit: "توکي", verb: "ولري" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ورودي",
        email: "بریښنالیک",
        url: "یو آر ال",
        emoji: "ایموجي",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "نیټه او وخت",
        date: "نېټه",
        time: "وخت",
        duration: "موده",
        ipv4: "د IPv4 پته",
        ipv6: "د IPv6 پته",
        cidrv4: "د IPv4 ساحه",
        cidrv6: "د IPv6 ساحه",
        base64: "base64-encoded متن",
        base64url: "base64url-encoded متن",
        json_string: "JSON متن",
        e164: "د E.164 شمېره",
        jwt: "JWT",
        template_literal: "ورودي",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "عدد",
        array: "ارې",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `ناسم ورودي: باید instanceof ${issue.expected} وای, مګر ${received} ترلاسه شو`;
                }
                return `ناسم ورودي: باید ${expected} وای, مګر ${received} ترلاسه شو`;
            }
            case "invalid_value":
                if (issue.values.length === 1) {
                    return `ناسم ورودي: باید ${util.stringifyPrimitive(issue.values[0])} وای`;
                }
                return `ناسم انتخاب: باید یو له ${util.joinValues(issue.values, "|")} څخه وای`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `ډیر لوی: ${issue.origin ?? "ارزښت"} باید ${adj}${issue.maximum.toString()} ${sizing.unit ?? "عنصرونه"} ولري`;
                }
                return `ډیر لوی: ${issue.origin ?? "ارزښت"} باید ${adj}${issue.maximum.toString()} وي`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `ډیر کوچنی: ${issue.origin} باید ${adj}${issue.minimum.toString()} ${sizing.unit} ولري`;
                }
                return `ډیر کوچنی: ${issue.origin} باید ${adj}${issue.minimum.toString()} وي`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `ناسم متن: باید د "${_issue.prefix}" سره پیل شي`;
                }
                if (_issue.format === "ends_with") {
                    return `ناسم متن: باید د "${_issue.suffix}" سره پای ته ورسيږي`;
                }
                if (_issue.format === "includes") {
                    return `ناسم متن: باید "${_issue.includes}" ولري`;
                }
                if (_issue.format === "regex") {
                    return `ناسم متن: باید د ${_issue.pattern} سره مطابقت ولري`;
                }
                return `${FormatDictionary[_issue.format] ?? issue.format} ناسم دی`;
            }
            case "not_multiple_of":
                return `ناسم عدد: باید د ${issue.divisor} مضرب وي`;
            case "unrecognized_keys":
                return `ناسم ${issue.keys.length > 1 ? "کلیډونه" : "کلیډ"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `ناسم کلیډ په ${issue.origin} کې`;
            case "invalid_union":
                return `ناسمه ورودي`;
            case "invalid_element":
                return `ناسم عنصر په ${issue.origin} کې`;
            default:
                return `ناسمه ورودي`;
        }
    };
};
/* harmony default export */ function ps() {
    return {
        localeError: ps_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/pl.js

const pl_error = () => {
    const Sizable = {
        string: { unit: "znaków", verb: "mieć" },
        file: { unit: "bajtów", verb: "mieć" },
        array: { unit: "elementów", verb: "mieć" },
        set: { unit: "elementów", verb: "mieć" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "wyrażenie",
        email: "adres email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data i godzina w formacie ISO",
        date: "data w formacie ISO",
        time: "godzina w formacie ISO",
        duration: "czas trwania ISO",
        ipv4: "adres IPv4",
        ipv6: "adres IPv6",
        cidrv4: "zakres IPv4",
        cidrv6: "zakres IPv6",
        base64: "ciąg znaków zakodowany w formacie base64",
        base64url: "ciąg znaków zakodowany w formacie base64url",
        json_string: "ciąg znaków w formacie JSON",
        e164: "liczba E.164",
        jwt: "JWT",
        template_literal: "wejście",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "liczba",
        array: "tablica",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Nieprawidłowe dane wejściowe: oczekiwano instanceof ${issue.expected}, otrzymano ${received}`;
                }
                return `Nieprawidłowe dane wejściowe: oczekiwano ${expected}, otrzymano ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Nieprawidłowe dane wejściowe: oczekiwano ${util.stringifyPrimitive(issue.values[0])}`;
                return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Za duża wartość: oczekiwano, że ${issue.origin ?? "wartość"} będzie mieć ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementów"}`;
                }
                return `Zbyt duż(y/a/e): oczekiwano, że ${issue.origin ?? "wartość"} będzie wynosić ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Za mała wartość: oczekiwano, że ${issue.origin ?? "wartość"} będzie mieć ${adj}${issue.minimum.toString()} ${sizing.unit ?? "elementów"}`;
                }
                return `Zbyt mał(y/a/e): oczekiwano, że ${issue.origin ?? "wartość"} będzie wynosić ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${_issue.pattern}`;
                return `Nieprawidłow(y/a/e) ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Nieprawidłowa liczba: musi być wielokrotnością ${issue.divisor}`;
            case "unrecognized_keys":
                return `Nierozpoznane klucze${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Nieprawidłowy klucz w ${issue.origin}`;
            case "invalid_union":
                return "Nieprawidłowe dane wejściowe";
            case "invalid_element":
                return `Nieprawidłowa wartość w ${issue.origin}`;
            default:
                return `Nieprawidłowe dane wejściowe`;
        }
    };
};
/* harmony default export */ function pl() {
    return {
        localeError: pl_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/pt.js

const pt_error = () => {
    const Sizable = {
        string: { unit: "caracteres", verb: "ter" },
        file: { unit: "bytes", verb: "ter" },
        array: { unit: "itens", verb: "ter" },
        set: { unit: "itens", verb: "ter" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "padrão",
        email: "endereço de e-mail",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data e hora ISO",
        date: "data ISO",
        time: "hora ISO",
        duration: "duração ISO",
        ipv4: "endereço IPv4",
        ipv6: "endereço IPv6",
        cidrv4: "faixa de IPv4",
        cidrv6: "faixa de IPv6",
        base64: "texto codificado em base64",
        base64url: "URL codificada em base64",
        json_string: "texto JSON",
        e164: "número E.164",
        jwt: "JWT",
        template_literal: "entrada",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "número",
        null: "nulo",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Tipo inválido: esperado instanceof ${issue.expected}, recebido ${received}`;
                }
                return `Tipo inválido: esperado ${expected}, recebido ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Entrada inválida: esperado ${util.stringifyPrimitive(issue.values[0])}`;
                return `Opção inválida: esperada uma das ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Muito grande: esperado que ${issue.origin ?? "valor"} tivesse ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementos"}`;
                return `Muito grande: esperado que ${issue.origin ?? "valor"} fosse ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Muito pequeno: esperado que ${issue.origin} tivesse ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Muito pequeno: esperado que ${issue.origin} fosse ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Texto inválido: deve começar com "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Texto inválido: deve terminar com "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Texto inválido: deve incluir "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Texto inválido: deve corresponder ao padrão ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} inválido`;
            }
            case "not_multiple_of":
                return `Número inválido: deve ser múltiplo de ${issue.divisor}`;
            case "unrecognized_keys":
                return `Chave${issue.keys.length > 1 ? "s" : ""} desconhecida${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Chave inválida em ${issue.origin}`;
            case "invalid_union":
                return "Entrada inválida";
            case "invalid_element":
                return `Valor inválido em ${issue.origin}`;
            default:
                return `Campo inválido`;
        }
    };
};
/* harmony default export */ function pt() {
    return {
        localeError: pt_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ru.js

function getRussianPlural(count, one, few, many) {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return many;
    }
    if (lastDigit === 1) {
        return one;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
        return few;
    }
    return many;
}
const ru_error = () => {
    const Sizable = {
        string: {
            unit: {
                one: "символ",
                few: "символа",
                many: "символов",
            },
            verb: "иметь",
        },
        file: {
            unit: {
                one: "байт",
                few: "байта",
                many: "байт",
            },
            verb: "иметь",
        },
        array: {
            unit: {
                one: "элемент",
                few: "элемента",
                many: "элементов",
            },
            verb: "иметь",
        },
        set: {
            unit: {
                one: "элемент",
                few: "элемента",
                many: "элементов",
            },
            verb: "иметь",
        },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ввод",
        email: "email адрес",
        url: "URL",
        emoji: "эмодзи",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO дата и время",
        date: "ISO дата",
        time: "ISO время",
        duration: "ISO длительность",
        ipv4: "IPv4 адрес",
        ipv6: "IPv6 адрес",
        cidrv4: "IPv4 диапазон",
        cidrv6: "IPv6 диапазон",
        base64: "строка в формате base64",
        base64url: "строка в формате base64url",
        json_string: "JSON строка",
        e164: "номер E.164",
        jwt: "JWT",
        template_literal: "ввод",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "число",
        array: "массив",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Неверный ввод: ожидалось instanceof ${issue.expected}, получено ${received}`;
                }
                return `Неверный ввод: ожидалось ${expected}, получено ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Неверный ввод: ожидалось ${util.stringifyPrimitive(issue.values[0])}`;
                return `Неверный вариант: ожидалось одно из ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    const maxValue = Number(issue.maximum);
                    const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
                    return `Слишком большое значение: ожидалось, что ${issue.origin ?? "значение"} будет иметь ${adj}${issue.maximum.toString()} ${unit}`;
                }
                return `Слишком большое значение: ожидалось, что ${issue.origin ?? "значение"} будет ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    const minValue = Number(issue.minimum);
                    const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
                    return `Слишком маленькое значение: ожидалось, что ${issue.origin} будет иметь ${adj}${issue.minimum.toString()} ${unit}`;
                }
                return `Слишком маленькое значение: ожидалось, что ${issue.origin} будет ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Неверная строка: должна начинаться с "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Неверная строка: должна заканчиваться на "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Неверная строка: должна содержать "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Неверная строка: должна соответствовать шаблону ${_issue.pattern}`;
                return `Неверный ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Неверное число: должно быть кратным ${issue.divisor}`;
            case "unrecognized_keys":
                return `Нераспознанн${issue.keys.length > 1 ? "ые" : "ый"} ключ${issue.keys.length > 1 ? "и" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Неверный ключ в ${issue.origin}`;
            case "invalid_union":
                return "Неверные входные данные";
            case "invalid_element":
                return `Неверное значение в ${issue.origin}`;
            default:
                return `Неверные входные данные`;
        }
    };
};
/* harmony default export */ function ru() {
    return {
        localeError: ru_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/sl.js

const sl_error = () => {
    const Sizable = {
        string: { unit: "znakov", verb: "imeti" },
        file: { unit: "bajtov", verb: "imeti" },
        array: { unit: "elementov", verb: "imeti" },
        set: { unit: "elementov", verb: "imeti" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "vnos",
        email: "e-poštni naslov",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum in čas",
        date: "ISO datum",
        time: "ISO čas",
        duration: "ISO trajanje",
        ipv4: "IPv4 naslov",
        ipv6: "IPv6 naslov",
        cidrv4: "obseg IPv4",
        cidrv6: "obseg IPv6",
        base64: "base64 kodiran niz",
        base64url: "base64url kodiran niz",
        json_string: "JSON niz",
        e164: "E.164 številka",
        jwt: "JWT",
        template_literal: "vnos",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "število",
        array: "tabela",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Neveljaven vnos: pričakovano instanceof ${issue.expected}, prejeto ${received}`;
                }
                return `Neveljaven vnos: pričakovano ${expected}, prejeto ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Neveljaven vnos: pričakovano ${util.stringifyPrimitive(issue.values[0])}`;
                return `Neveljavna možnost: pričakovano eno izmed ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Preveliko: pričakovano, da bo ${issue.origin ?? "vrednost"} imelo ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementov"}`;
                return `Preveliko: pričakovano, da bo ${issue.origin ?? "vrednost"} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Premajhno: pričakovano, da bo ${issue.origin} imelo ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Premajhno: pričakovano, da bo ${issue.origin} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Neveljaven niz: mora se začeti z "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Neveljaven niz: mora se končati z "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
                return `Neveljaven ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Neveljavno število: mora biti večkratnik ${issue.divisor}`;
            case "unrecognized_keys":
                return `Neprepoznan${issue.keys.length > 1 ? "i ključi" : " ključ"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Neveljaven ključ v ${issue.origin}`;
            case "invalid_union":
                return "Neveljaven vnos";
            case "invalid_element":
                return `Neveljavna vrednost v ${issue.origin}`;
            default:
                return "Neveljaven vnos";
        }
    };
};
/* harmony default export */ function sl() {
    return {
        localeError: sl_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/sv.js

const sv_error = () => {
    const Sizable = {
        string: { unit: "tecken", verb: "att ha" },
        file: { unit: "bytes", verb: "att ha" },
        array: { unit: "objekt", verb: "att innehålla" },
        set: { unit: "objekt", verb: "att innehålla" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "reguljärt uttryck",
        email: "e-postadress",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-datum och tid",
        date: "ISO-datum",
        time: "ISO-tid",
        duration: "ISO-varaktighet",
        ipv4: "IPv4-intervall",
        ipv6: "IPv6-intervall",
        cidrv4: "IPv4-spektrum",
        cidrv6: "IPv6-spektrum",
        base64: "base64-kodad sträng",
        base64url: "base64url-kodad sträng",
        json_string: "JSON-sträng",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "mall-literal",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "antal",
        array: "lista",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Ogiltig inmatning: förväntat instanceof ${issue.expected}, fick ${received}`;
                }
                return `Ogiltig inmatning: förväntat ${expected}, fick ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Ogiltig inmatning: förväntat ${util.stringifyPrimitive(issue.values[0])}`;
                return `Ogiltigt val: förväntade en av ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `För stor(t): förväntade ${issue.origin ?? "värdet"} att ha ${adj}${issue.maximum.toString()} ${sizing.unit ?? "element"}`;
                }
                return `För stor(t): förväntat ${issue.origin ?? "värdet"} att ha ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `För lite(t): förväntade ${issue.origin ?? "värdet"} att ha ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `För lite(t): förväntade ${issue.origin ?? "värdet"} att ha ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `Ogiltig sträng: måste börja med "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `Ogiltig sträng: måste sluta med "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Ogiltig sträng: måste innehålla "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Ogiltig sträng: måste matcha mönstret "${_issue.pattern}"`;
                return `Ogiltig(t) ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Ogiltigt tal: måste vara en multipel av ${issue.divisor}`;
            case "unrecognized_keys":
                return `${issue.keys.length > 1 ? "Okända nycklar" : "Okänd nyckel"}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Ogiltig nyckel i ${issue.origin ?? "värdet"}`;
            case "invalid_union":
                return "Ogiltig input";
            case "invalid_element":
                return `Ogiltigt värde i ${issue.origin ?? "värdet"}`;
            default:
                return `Ogiltig input`;
        }
    };
};
/* harmony default export */ function sv() {
    return {
        localeError: sv_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ta.js

const ta_error = () => {
    const Sizable = {
        string: { unit: "எழுத்துக்கள்", verb: "கொண்டிருக்க வேண்டும்" },
        file: { unit: "பைட்டுகள்", verb: "கொண்டிருக்க வேண்டும்" },
        array: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" },
        set: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "உள்ளீடு",
        email: "மின்னஞ்சல் முகவரி",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO தேதி நேரம்",
        date: "ISO தேதி",
        time: "ISO நேரம்",
        duration: "ISO கால அளவு",
        ipv4: "IPv4 முகவரி",
        ipv6: "IPv6 முகவரி",
        cidrv4: "IPv4 வரம்பு",
        cidrv6: "IPv6 வரம்பு",
        base64: "base64-encoded சரம்",
        base64url: "base64url-encoded சரம்",
        json_string: "JSON சரம்",
        e164: "E.164 எண்",
        jwt: "JWT",
        template_literal: "input",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "எண்",
        array: "அணி",
        null: "வெறுமை",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது instanceof ${issue.expected}, பெறப்பட்டது ${received}`;
                }
                return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${expected}, பெறப்பட்டது ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${util.stringifyPrimitive(issue.values[0])}`;
                return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${util.joinValues(issue.values, "|")} இல் ஒன்று`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue.origin ?? "மதிப்பு"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "உறுப்புகள்"} ஆக இருக்க வேண்டும்`;
                }
                return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue.origin ?? "மதிப்பு"} ${adj}${issue.maximum.toString()} ஆக இருக்க வேண்டும்`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} ஆக இருக்க வேண்டும்`; //
                }
                return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue.origin} ${adj}${issue.minimum.toString()} ஆக இருக்க வேண்டும்`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `தவறான சரம்: "${_issue.prefix}" இல் தொடங்க வேண்டும்`;
                if (_issue.format === "ends_with")
                    return `தவறான சரம்: "${_issue.suffix}" இல் முடிவடைய வேண்டும்`;
                if (_issue.format === "includes")
                    return `தவறான சரம்: "${_issue.includes}" ஐ உள்ளடக்க வேண்டும்`;
                if (_issue.format === "regex")
                    return `தவறான சரம்: ${_issue.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
                return `தவறான ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `தவறான எண்: ${issue.divisor} இன் பலமாக இருக்க வேண்டும்`;
            case "unrecognized_keys":
                return `அடையாளம் தெரியாத விசை${issue.keys.length > 1 ? "கள்" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} இல் தவறான விசை`;
            case "invalid_union":
                return "தவறான உள்ளீடு";
            case "invalid_element":
                return `${issue.origin} இல் தவறான மதிப்பு`;
            default:
                return `தவறான உள்ளீடு`;
        }
    };
};
/* harmony default export */ function ta() {
    return {
        localeError: ta_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/th.js

const th_error = () => {
    const Sizable = {
        string: { unit: "ตัวอักษร", verb: "ควรมี" },
        file: { unit: "ไบต์", verb: "ควรมี" },
        array: { unit: "รายการ", verb: "ควรมี" },
        set: { unit: "รายการ", verb: "ควรมี" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ข้อมูลที่ป้อน",
        email: "ที่อยู่อีเมล",
        url: "URL",
        emoji: "อิโมจิ",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "วันที่เวลาแบบ ISO",
        date: "วันที่แบบ ISO",
        time: "เวลาแบบ ISO",
        duration: "ช่วงเวลาแบบ ISO",
        ipv4: "ที่อยู่ IPv4",
        ipv6: "ที่อยู่ IPv6",
        cidrv4: "ช่วง IP แบบ IPv4",
        cidrv6: "ช่วง IP แบบ IPv6",
        base64: "ข้อความแบบ Base64",
        base64url: "ข้อความแบบ Base64 สำหรับ URL",
        json_string: "ข้อความแบบ JSON",
        e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
        jwt: "โทเคน JWT",
        template_literal: "ข้อมูลที่ป้อน",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "ตัวเลข",
        array: "อาร์เรย์ (Array)",
        null: "ไม่มีค่า (null)",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น instanceof ${issue.expected} แต่ได้รับ ${received}`;
                }
                return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${expected} แต่ได้รับ ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `ค่าไม่ถูกต้อง: ควรเป็น ${util.stringifyPrimitive(issue.values[0])}`;
                return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "ไม่เกิน" : "น้อยกว่า";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `เกินกำหนด: ${issue.origin ?? "ค่า"} ควรมี${adj} ${issue.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
                return `เกินกำหนด: ${issue.origin ?? "ค่า"} ควรมี${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? "อย่างน้อย" : "มากกว่า";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `น้อยกว่ากำหนด: ${issue.origin} ควรมี${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `น้อยกว่ากำหนด: ${issue.origin} ควรมี${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อความ`;
                if (_issue.format === "regex")
                    return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${_issue.pattern}`;
                return `รูปแบบไม่ถูกต้อง: ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${issue.divisor} ได้ลงตัว`;
            case "unrecognized_keys":
                return `พบคีย์ที่ไม่รู้จัก: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `คีย์ไม่ถูกต้องใน ${issue.origin}`;
            case "invalid_union":
                return "ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";
            case "invalid_element":
                return `ข้อมูลไม่ถูกต้องใน ${issue.origin}`;
            default:
                return `ข้อมูลไม่ถูกต้อง`;
        }
    };
};
/* harmony default export */ function th() {
    return {
        localeError: th_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/tr.js

const tr_error = () => {
    const Sizable = {
        string: { unit: "karakter", verb: "olmalı" },
        file: { unit: "bayt", verb: "olmalı" },
        array: { unit: "öğe", verb: "olmalı" },
        set: { unit: "öğe", verb: "olmalı" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "girdi",
        email: "e-posta adresi",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO tarih ve saat",
        date: "ISO tarih",
        time: "ISO saat",
        duration: "ISO süre",
        ipv4: "IPv4 adresi",
        ipv6: "IPv6 adresi",
        cidrv4: "IPv4 aralığı",
        cidrv6: "IPv6 aralığı",
        base64: "base64 ile şifrelenmiş metin",
        base64url: "base64url ile şifrelenmiş metin",
        json_string: "JSON dizesi",
        e164: "E.164 sayısı",
        jwt: "JWT",
        template_literal: "Şablon dizesi",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Geçersiz değer: beklenen instanceof ${issue.expected}, alınan ${received}`;
                }
                return `Geçersiz değer: beklenen ${expected}, alınan ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Geçersiz değer: beklenen ${util.stringifyPrimitive(issue.values[0])}`;
                return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Çok büyük: beklenen ${issue.origin ?? "değer"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "öğe"}`;
                return `Çok büyük: beklenen ${issue.origin ?? "değer"} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Çok küçük: beklenen ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                return `Çok küçük: beklenen ${issue.origin} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Geçersiz metin: "${_issue.prefix}" ile başlamalı`;
                if (_issue.format === "ends_with")
                    return `Geçersiz metin: "${_issue.suffix}" ile bitmeli`;
                if (_issue.format === "includes")
                    return `Geçersiz metin: "${_issue.includes}" içermeli`;
                if (_issue.format === "regex")
                    return `Geçersiz metin: ${_issue.pattern} desenine uymalı`;
                return `Geçersiz ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Geçersiz sayı: ${issue.divisor} ile tam bölünebilmeli`;
            case "unrecognized_keys":
                return `Tanınmayan anahtar${issue.keys.length > 1 ? "lar" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} içinde geçersiz anahtar`;
            case "invalid_union":
                return "Geçersiz değer";
            case "invalid_element":
                return `${issue.origin} içinde geçersiz değer`;
            default:
                return `Geçersiz değer`;
        }
    };
};
/* harmony default export */ function tr() {
    return {
        localeError: tr_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/uk.js

const uk_error = () => {
    const Sizable = {
        string: { unit: "символів", verb: "матиме" },
        file: { unit: "байтів", verb: "матиме" },
        array: { unit: "елементів", verb: "матиме" },
        set: { unit: "елементів", verb: "матиме" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "вхідні дані",
        email: "адреса електронної пошти",
        url: "URL",
        emoji: "емодзі",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "дата та час ISO",
        date: "дата ISO",
        time: "час ISO",
        duration: "тривалість ISO",
        ipv4: "адреса IPv4",
        ipv6: "адреса IPv6",
        cidrv4: "діапазон IPv4",
        cidrv6: "діапазон IPv6",
        base64: "рядок у кодуванні base64",
        base64url: "рядок у кодуванні base64url",
        json_string: "рядок JSON",
        e164: "номер E.164",
        jwt: "JWT",
        template_literal: "вхідні дані",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "число",
        array: "масив",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Неправильні вхідні дані: очікується instanceof ${issue.expected}, отримано ${received}`;
                }
                return `Неправильні вхідні дані: очікується ${expected}, отримано ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Неправильні вхідні дані: очікується ${util.stringifyPrimitive(issue.values[0])}`;
                return `Неправильна опція: очікується одне з ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Занадто велике: очікується, що ${issue.origin ?? "значення"} ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "елементів"}`;
                return `Занадто велике: очікується, що ${issue.origin ?? "значення"} буде ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Занадто мале: очікується, що ${issue.origin} ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Занадто мале: очікується, що ${issue.origin} буде ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Неправильний рядок: повинен починатися з "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Неправильний рядок: повинен закінчуватися на "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Неправильний рядок: повинен містити "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Неправильний рядок: повинен відповідати шаблону ${_issue.pattern}`;
                return `Неправильний ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Неправильне число: повинно бути кратним ${issue.divisor}`;
            case "unrecognized_keys":
                return `Нерозпізнаний ключ${issue.keys.length > 1 ? "і" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Неправильний ключ у ${issue.origin}`;
            case "invalid_union":
                return "Неправильні вхідні дані";
            case "invalid_element":
                return `Неправильне значення у ${issue.origin}`;
            default:
                return `Неправильні вхідні дані`;
        }
    };
};
/* harmony default export */ function locales_uk() {
    return {
        localeError: uk_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ua.js

/** @deprecated Use `uk` instead. */
/* harmony default export */ function ua() {
    return uk();
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/ur.js

const ur_error = () => {
    const Sizable = {
        string: { unit: "حروف", verb: "ہونا" },
        file: { unit: "بائٹس", verb: "ہونا" },
        array: { unit: "آئٹمز", verb: "ہونا" },
        set: { unit: "آئٹمز", verb: "ہونا" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ان پٹ",
        email: "ای میل ایڈریس",
        url: "یو آر ایل",
        emoji: "ایموجی",
        uuid: "یو یو آئی ڈی",
        uuidv4: "یو یو آئی ڈی وی 4",
        uuidv6: "یو یو آئی ڈی وی 6",
        nanoid: "نینو آئی ڈی",
        guid: "جی یو آئی ڈی",
        cuid: "سی یو آئی ڈی",
        cuid2: "سی یو آئی ڈی 2",
        ulid: "یو ایل آئی ڈی",
        xid: "ایکس آئی ڈی",
        ksuid: "کے ایس یو آئی ڈی",
        datetime: "آئی ایس او ڈیٹ ٹائم",
        date: "آئی ایس او تاریخ",
        time: "آئی ایس او وقت",
        duration: "آئی ایس او مدت",
        ipv4: "آئی پی وی 4 ایڈریس",
        ipv6: "آئی پی وی 6 ایڈریس",
        cidrv4: "آئی پی وی 4 رینج",
        cidrv6: "آئی پی وی 6 رینج",
        base64: "بیس 64 ان کوڈڈ سٹرنگ",
        base64url: "بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",
        json_string: "جے ایس او این سٹرنگ",
        e164: "ای 164 نمبر",
        jwt: "جے ڈبلیو ٹی",
        template_literal: "ان پٹ",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "نمبر",
        array: "آرے",
        null: "نل",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `غلط ان پٹ: instanceof ${issue.expected} متوقع تھا، ${received} موصول ہوا`;
                }
                return `غلط ان پٹ: ${expected} متوقع تھا، ${received} موصول ہوا`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `غلط ان پٹ: ${util.stringifyPrimitive(issue.values[0])} متوقع تھا`;
                return `غلط آپشن: ${util.joinValues(issue.values, "|")} میں سے ایک متوقع تھا`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `بہت بڑا: ${issue.origin ?? "ویلیو"} کے ${adj}${issue.maximum.toString()} ${sizing.unit ?? "عناصر"} ہونے متوقع تھے`;
                return `بہت بڑا: ${issue.origin ?? "ویلیو"} کا ${adj}${issue.maximum.toString()} ہونا متوقع تھا`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `بہت چھوٹا: ${issue.origin} کے ${adj}${issue.minimum.toString()} ${sizing.unit} ہونے متوقع تھے`;
                }
                return `بہت چھوٹا: ${issue.origin} کا ${adj}${issue.minimum.toString()} ہونا متوقع تھا`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `غلط سٹرنگ: "${_issue.prefix}" سے شروع ہونا چاہیے`;
                }
                if (_issue.format === "ends_with")
                    return `غلط سٹرنگ: "${_issue.suffix}" پر ختم ہونا چاہیے`;
                if (_issue.format === "includes")
                    return `غلط سٹرنگ: "${_issue.includes}" شامل ہونا چاہیے`;
                if (_issue.format === "regex")
                    return `غلط سٹرنگ: پیٹرن ${_issue.pattern} سے میچ ہونا چاہیے`;
                return `غلط ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `غلط نمبر: ${issue.divisor} کا مضاعف ہونا چاہیے`;
            case "unrecognized_keys":
                return `غیر تسلیم شدہ کی${issue.keys.length > 1 ? "ز" : ""}: ${util.joinValues(issue.keys, "، ")}`;
            case "invalid_key":
                return `${issue.origin} میں غلط کی`;
            case "invalid_union":
                return "غلط ان پٹ";
            case "invalid_element":
                return `${issue.origin} میں غلط ویلیو`;
            default:
                return `غلط ان پٹ`;
        }
    };
};
/* harmony default export */ function ur() {
    return {
        localeError: ur_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/uz.js

const uz_error = () => {
    const Sizable = {
        string: { unit: "belgi", verb: "bo‘lishi kerak" },
        file: { unit: "bayt", verb: "bo‘lishi kerak" },
        array: { unit: "element", verb: "bo‘lishi kerak" },
        set: { unit: "element", verb: "bo‘lishi kerak" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "kirish",
        email: "elektron pochta manzili",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO sana va vaqti",
        date: "ISO sana",
        time: "ISO vaqt",
        duration: "ISO davomiylik",
        ipv4: "IPv4 manzil",
        ipv6: "IPv6 manzil",
        mac: "MAC manzil",
        cidrv4: "IPv4 diapazon",
        cidrv6: "IPv6 diapazon",
        base64: "base64 kodlangan satr",
        base64url: "base64url kodlangan satr",
        json_string: "JSON satr",
        e164: "E.164 raqam",
        jwt: "JWT",
        template_literal: "kirish",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "raqam",
        array: "massiv",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Noto‘g‘ri kirish: kutilgan instanceof ${issue.expected}, qabul qilingan ${received}`;
                }
                return `Noto‘g‘ri kirish: kutilgan ${expected}, qabul qilingan ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Noto‘g‘ri kirish: kutilgan ${util.stringifyPrimitive(issue.values[0])}`;
                return `Noto‘g‘ri variant: quyidagilardan biri kutilgan ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Juda katta: kutilgan ${issue.origin ?? "qiymat"} ${adj}${issue.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
                return `Juda katta: kutilgan ${issue.origin ?? "qiymat"} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Juda kichik: kutilgan ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
                }
                return `Juda kichik: kutilgan ${issue.origin} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Noto‘g‘ri satr: "${_issue.prefix}" bilan boshlanishi kerak`;
                if (_issue.format === "ends_with")
                    return `Noto‘g‘ri satr: "${_issue.suffix}" bilan tugashi kerak`;
                if (_issue.format === "includes")
                    return `Noto‘g‘ri satr: "${_issue.includes}" ni o‘z ichiga olishi kerak`;
                if (_issue.format === "regex")
                    return `Noto‘g‘ri satr: ${_issue.pattern} shabloniga mos kelishi kerak`;
                return `Noto‘g‘ri ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Noto‘g‘ri raqam: ${issue.divisor} ning karralisi bo‘lishi kerak`;
            case "unrecognized_keys":
                return `Noma’lum kalit${issue.keys.length > 1 ? "lar" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} dagi kalit noto‘g‘ri`;
            case "invalid_union":
                return "Noto‘g‘ri kirish";
            case "invalid_element":
                return `${issue.origin} da noto‘g‘ri qiymat`;
            default:
                return `Noto‘g‘ri kirish`;
        }
    };
};
/* harmony default export */ function uz() {
    return {
        localeError: uz_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/vi.js

const vi_error = () => {
    const Sizable = {
        string: { unit: "ký tự", verb: "có" },
        file: { unit: "byte", verb: "có" },
        array: { unit: "phần tử", verb: "có" },
        set: { unit: "phần tử", verb: "có" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "đầu vào",
        email: "địa chỉ email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ngày giờ ISO",
        date: "ngày ISO",
        time: "giờ ISO",
        duration: "khoảng thời gian ISO",
        ipv4: "địa chỉ IPv4",
        ipv6: "địa chỉ IPv6",
        cidrv4: "dải IPv4",
        cidrv6: "dải IPv6",
        base64: "chuỗi mã hóa base64",
        base64url: "chuỗi mã hóa base64url",
        json_string: "chuỗi JSON",
        e164: "số E.164",
        jwt: "JWT",
        template_literal: "đầu vào",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "số",
        array: "mảng",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Đầu vào không hợp lệ: mong đợi instanceof ${issue.expected}, nhận được ${received}`;
                }
                return `Đầu vào không hợp lệ: mong đợi ${expected}, nhận được ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Đầu vào không hợp lệ: mong đợi ${util.stringifyPrimitive(issue.values[0])}`;
                return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Quá lớn: mong đợi ${issue.origin ?? "giá trị"} ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "phần tử"}`;
                return `Quá lớn: mong đợi ${issue.origin ?? "giá trị"} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Quá nhỏ: mong đợi ${issue.origin} ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `Quá nhỏ: mong đợi ${issue.origin} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Chuỗi không hợp lệ: phải bắt đầu bằng "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Chuỗi không hợp lệ: phải kết thúc bằng "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Chuỗi không hợp lệ: phải bao gồm "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Chuỗi không hợp lệ: phải khớp với mẫu ${_issue.pattern}`;
                return `${FormatDictionary[_issue.format] ?? issue.format} không hợp lệ`;
            }
            case "not_multiple_of":
                return `Số không hợp lệ: phải là bội số của ${issue.divisor}`;
            case "unrecognized_keys":
                return `Khóa không được nhận dạng: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Khóa không hợp lệ trong ${issue.origin}`;
            case "invalid_union":
                return "Đầu vào không hợp lệ";
            case "invalid_element":
                return `Giá trị không hợp lệ trong ${issue.origin}`;
            default:
                return `Đầu vào không hợp lệ`;
        }
    };
};
/* harmony default export */ function vi() {
    return {
        localeError: vi_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/zh-CN.js

const zh_CN_error = () => {
    const Sizable = {
        string: { unit: "字符", verb: "包含" },
        file: { unit: "字节", verb: "包含" },
        array: { unit: "项", verb: "包含" },
        set: { unit: "项", verb: "包含" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "输入",
        email: "电子邮件",
        url: "URL",
        emoji: "表情符号",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO日期时间",
        date: "ISO日期",
        time: "ISO时间",
        duration: "ISO时长",
        ipv4: "IPv4地址",
        ipv6: "IPv6地址",
        cidrv4: "IPv4网段",
        cidrv6: "IPv6网段",
        base64: "base64编码字符串",
        base64url: "base64url编码字符串",
        json_string: "JSON字符串",
        e164: "E.164号码",
        jwt: "JWT",
        template_literal: "输入",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "数字",
        array: "数组",
        null: "空值(null)",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `无效输入：期望 instanceof ${issue.expected}，实际接收 ${received}`;
                }
                return `无效输入：期望 ${expected}，实际接收 ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `无效输入：期望 ${util.stringifyPrimitive(issue.values[0])}`;
                return `无效选项：期望以下之一 ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `数值过大：期望 ${issue.origin ?? "值"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "个元素"}`;
                return `数值过大：期望 ${issue.origin ?? "值"} ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `数值过小：期望 ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `数值过小：期望 ${issue.origin} ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `无效字符串：必须以 "${_issue.prefix}" 开头`;
                if (_issue.format === "ends_with")
                    return `无效字符串：必须以 "${_issue.suffix}" 结尾`;
                if (_issue.format === "includes")
                    return `无效字符串：必须包含 "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `无效字符串：必须满足正则表达式 ${_issue.pattern}`;
                return `无效${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `无效数字：必须是 ${issue.divisor} 的倍数`;
            case "unrecognized_keys":
                return `出现未知的键(key): ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} 中的键(key)无效`;
            case "invalid_union":
                return "无效输入";
            case "invalid_element":
                return `${issue.origin} 中包含无效值(value)`;
            default:
                return `无效输入`;
        }
    };
};
/* harmony default export */ function zh_CN() {
    return {
        localeError: zh_CN_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/zh-TW.js

const zh_TW_error = () => {
    const Sizable = {
        string: { unit: "字元", verb: "擁有" },
        file: { unit: "位元組", verb: "擁有" },
        array: { unit: "項目", verb: "擁有" },
        set: { unit: "項目", verb: "擁有" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "輸入",
        email: "郵件地址",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO 日期時間",
        date: "ISO 日期",
        time: "ISO 時間",
        duration: "ISO 期間",
        ipv4: "IPv4 位址",
        ipv6: "IPv6 位址",
        cidrv4: "IPv4 範圍",
        cidrv6: "IPv6 範圍",
        base64: "base64 編碼字串",
        base64url: "base64url 編碼字串",
        json_string: "JSON 字串",
        e164: "E.164 數值",
        jwt: "JWT",
        template_literal: "輸入",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `無效的輸入值：預期為 instanceof ${issue.expected}，但收到 ${received}`;
                }
                return `無效的輸入值：預期為 ${expected}，但收到 ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `無效的輸入值：預期為 ${util.stringifyPrimitive(issue.values[0])}`;
                return `無效的選項：預期為以下其中之一 ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `數值過大：預期 ${issue.origin ?? "值"} 應為 ${adj}${issue.maximum.toString()} ${sizing.unit ?? "個元素"}`;
                return `數值過大：預期 ${issue.origin ?? "值"} 應為 ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `數值過小：預期 ${issue.origin} 應為 ${adj}${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `數值過小：預期 ${issue.origin} 應為 ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `無效的字串：必須以 "${_issue.prefix}" 開頭`;
                }
                if (_issue.format === "ends_with")
                    return `無效的字串：必須以 "${_issue.suffix}" 結尾`;
                if (_issue.format === "includes")
                    return `無效的字串：必須包含 "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `無效的字串：必須符合格式 ${_issue.pattern}`;
                return `無效的 ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `無效的數字：必須為 ${issue.divisor} 的倍數`;
            case "unrecognized_keys":
                return `無法識別的鍵值${issue.keys.length > 1 ? "們" : ""}：${util.joinValues(issue.keys, "、")}`;
            case "invalid_key":
                return `${issue.origin} 中有無效的鍵值`;
            case "invalid_union":
                return "無效的輸入值";
            case "invalid_element":
                return `${issue.origin} 中有無效的值`;
            default:
                return `無效的輸入值`;
        }
    };
};
/* harmony default export */ function zh_TW() {
    return {
        localeError: zh_TW_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/yo.js

const yo_error = () => {
    const Sizable = {
        string: { unit: "àmi", verb: "ní" },
        file: { unit: "bytes", verb: "ní" },
        array: { unit: "nkan", verb: "ní" },
        set: { unit: "nkan", verb: "ní" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ẹ̀rọ ìbáwọlé",
        email: "àdírẹ́sì ìmẹ́lì",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "àkókò ISO",
        date: "ọjọ́ ISO",
        time: "àkókò ISO",
        duration: "àkókò tó pé ISO",
        ipv4: "àdírẹ́sì IPv4",
        ipv6: "àdírẹ́sì IPv6",
        cidrv4: "àgbègbè IPv4",
        cidrv6: "àgbègbè IPv6",
        base64: "ọ̀rọ̀ tí a kọ́ ní base64",
        base64url: "ọ̀rọ̀ base64url",
        json_string: "ọ̀rọ̀ JSON",
        e164: "nọ́mbà E.164",
        jwt: "JWT",
        template_literal: "ẹ̀rọ ìbáwọlé",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "nọ́mbà",
        array: "akopọ",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Ìbáwọlé aṣìṣe: a ní láti fi instanceof ${issue.expected}, àmọ̀ a rí ${received}`;
                }
                return `Ìbáwọlé aṣìṣe: a ní láti fi ${expected}, àmọ̀ a rí ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Ìbáwọlé aṣìṣe: a ní láti fi ${util.stringifyPrimitive(issue.values[0])}`;
                return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Tó pọ̀ jù: a ní láti jẹ́ pé ${issue.origin ?? "iye"} ${sizing.verb} ${adj}${issue.maximum} ${sizing.unit}`;
                return `Tó pọ̀ jù: a ní láti jẹ́ ${adj}${issue.maximum}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Kéré ju: a ní láti jẹ́ pé ${issue.origin} ${sizing.verb} ${adj}${issue.minimum} ${sizing.unit}`;
                return `Kéré ju: a ní láti jẹ́ ${adj}${issue.minimum}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${_issue.pattern}`;
                return `Aṣìṣe: ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${issue.divisor}`;
            case "unrecognized_keys":
                return `Bọtìnì àìmọ̀: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Bọtìnì aṣìṣe nínú ${issue.origin}`;
            case "invalid_union":
                return "Ìbáwọlé aṣìṣe";
            case "invalid_element":
                return `Iye aṣìṣe nínú ${issue.origin}`;
            default:
                return "Ìbáwọlé aṣìṣe";
        }
    };
};
/* harmony default export */ function yo() {
    return {
        localeError: yo_error(),
    };
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/locales/index.js


















































;// CONCATENATED MODULE: ./node_modules/zod/v4/core/registries.js
var _a;
const $output = Symbol("ZodOutput");
const $input = Symbol("ZodInput");
class $ZodRegistry {
    constructor() {
        this._map = new WeakMap();
        this._idmap = new Map();
    }
    add(schema, ..._meta) {
        const meta = _meta[0];
        this._map.set(schema, meta);
        if (meta && typeof meta === "object" && "id" in meta) {
            this._idmap.set(meta.id, schema);
        }
        return this;
    }
    clear() {
        this._map = new WeakMap();
        this._idmap = new Map();
        return this;
    }
    remove(schema) {
        const meta = this._map.get(schema);
        if (meta && typeof meta === "object" && "id" in meta) {
            this._idmap.delete(meta.id);
        }
        this._map.delete(schema);
        return this;
    }
    get(schema) {
        // return this._map.get(schema) as any;
        // inherit metadata
        const p = schema._zod.parent;
        if (p) {
            const pm = { ...(this.get(p) ?? {}) };
            delete pm.id; // do not inherit id
            const f = { ...pm, ...this._map.get(schema) };
            return Object.keys(f).length ? f : undefined;
        }
        return this._map.get(schema);
    }
    has(schema) {
        return this._map.has(schema);
    }
}
// registries
function registry() {
    return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const registries_globalRegistry = globalThis.__zod_globalRegistry;

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/api.js




// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
    return new Class({
        type: "string",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedString(Class, params) {
    return new Class({
        type: "string",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
    return new Class({
        type: "string",
        format: "email",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
    return new Class({
        type: "string",
        format: "guid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        version: "v4",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        version: "v6",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        version: "v7",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
    return new Class({
        type: "string",
        format: "url",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function api_emoji(Class, params) {
    return new Class({
        type: "string",
        format: "emoji",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
    return new Class({
        type: "string",
        format: "nanoid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
    return new Class({
        type: "string",
        format: "cuid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
    return new Class({
        type: "string",
        format: "cuid2",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
    return new Class({
        type: "string",
        format: "ulid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
    return new Class({
        type: "string",
        format: "xid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
    return new Class({
        type: "string",
        format: "ksuid",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
    return new Class({
        type: "string",
        format: "ipv4",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
    return new Class({
        type: "string",
        format: "ipv6",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _mac(Class, params) {
    return new Class({
        type: "string",
        format: "mac",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
    return new Class({
        type: "string",
        format: "cidrv4",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
    return new Class({
        type: "string",
        format: "cidrv6",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
    return new Class({
        type: "string",
        format: "base64",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
    return new Class({
        type: "string",
        format: "base64url",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
    return new Class({
        type: "string",
        format: "e164",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
    return new Class({
        type: "string",
        format: "jwt",
        check: "string_format",
        abort: false,
        ...normalizeParams(params),
    });
}
const TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6,
};
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
    return new Class({
        type: "string",
        format: "datetime",
        check: "string_format",
        offset: false,
        local: false,
        precision: null,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
    return new Class({
        type: "string",
        format: "date",
        check: "string_format",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
    return new Class({
        type: "string",
        format: "time",
        check: "string_format",
        precision: null,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
    return new Class({
        type: "string",
        format: "duration",
        check: "string_format",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
    return new Class({
        type: "number",
        checks: [],
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class, params) {
    return new Class({
        type: "number",
        coerce: true,
        checks: [],
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "safeint",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _float32(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "float32",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _float64(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "float64",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _int32(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "int32",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uint32(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "uint32",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
    return new Class({
        type: "boolean",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedBoolean(Class, params) {
    return new Class({
        type: "boolean",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _bigint(Class, params) {
    return new Class({
        type: "bigint",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedBigint(Class, params) {
    return new Class({
        type: "bigint",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _int64(Class, params) {
    return new Class({
        type: "bigint",
        check: "bigint_format",
        abort: false,
        format: "int64",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uint64(Class, params) {
    return new Class({
        type: "bigint",
        check: "bigint_format",
        abort: false,
        format: "uint64",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _symbol(Class, params) {
    return new Class({
        type: "symbol",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function api_undefined(Class, params) {
    return new Class({
        type: "undefined",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function api_null(Class, params) {
    return new Class({
        type: "null",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
    return new Class({
        type: "any",
    });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
    return new Class({
        type: "unknown",
    });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
    return new Class({
        type: "never",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _void(Class, params) {
    return new Class({
        type: "void",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _date(Class, params) {
    return new Class({
        type: "date",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedDate(Class, params) {
    return new Class({
        type: "date",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _nan(Class, params) {
    return new Class({
        type: "nan",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
    return new $ZodCheckLessThan({
        check: "less_than",
        ...normalizeParams(params),
        value,
        inclusive: false,
    });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
    return new $ZodCheckLessThan({
        check: "less_than",
        ...normalizeParams(params),
        value,
        inclusive: true,
    });
}

// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
    return new $ZodCheckGreaterThan({
        check: "greater_than",
        ...normalizeParams(params),
        value,
        inclusive: false,
    });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
    return new $ZodCheckGreaterThan({
        check: "greater_than",
        ...normalizeParams(params),
        value,
        inclusive: true,
    });
}

// @__NO_SIDE_EFFECTS__
function _positive(params) {
    return _gt(0, params);
}
// negative
// @__NO_SIDE_EFFECTS__
function _negative(params) {
    return _lt(0, params);
}
// nonpositive
// @__NO_SIDE_EFFECTS__
function _nonpositive(params) {
    return _lte(0, params);
}
// nonnegative
// @__NO_SIDE_EFFECTS__
function _nonnegative(params) {
    return _gte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf({
        check: "multiple_of",
        ...normalizeParams(params),
        value,
    });
}
// @__NO_SIDE_EFFECTS__
function _maxSize(maximum, params) {
    return new $ZodCheckMaxSize({
        check: "max_size",
        ...normalizeParams(params),
        maximum,
    });
}
// @__NO_SIDE_EFFECTS__
function _minSize(minimum, params) {
    return new $ZodCheckMinSize({
        check: "min_size",
        ...normalizeParams(params),
        minimum,
    });
}
// @__NO_SIDE_EFFECTS__
function _size(size, params) {
    return new $ZodCheckSizeEquals({
        check: "size_equals",
        ...normalizeParams(params),
        size,
    });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength({
        check: "max_length",
        ...normalizeParams(params),
        maximum,
    });
    return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
    return new $ZodCheckMinLength({
        check: "min_length",
        ...normalizeParams(params),
        minimum,
    });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
    return new $ZodCheckLengthEquals({
        check: "length_equals",
        ...normalizeParams(params),
        length,
    });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
    return new $ZodCheckRegex({
        check: "string_format",
        format: "regex",
        ...normalizeParams(params),
        pattern,
    });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
    return new $ZodCheckLowerCase({
        check: "string_format",
        format: "lowercase",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
    return new $ZodCheckUpperCase({
        check: "string_format",
        format: "uppercase",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
    return new $ZodCheckIncludes({
        check: "string_format",
        format: "includes",
        ...normalizeParams(params),
        includes,
    });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith({
        check: "string_format",
        format: "starts_with",
        ...normalizeParams(params),
        prefix,
    });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith({
        check: "string_format",
        format: "ends_with",
        ...normalizeParams(params),
        suffix,
    });
}
// @__NO_SIDE_EFFECTS__
function _property(property, schema, params) {
    return new $ZodCheckProperty({
        check: "property",
        property,
        schema,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _mime(types, params) {
    return new $ZodCheckMimeType({
        check: "mime_type",
        mime: types,
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
    return new $ZodCheckOverwrite({
        check: "overwrite",
        tx,
    });
}
// normalize
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
    return _overwrite((input) => input.normalize(form));
}
// trim
// @__NO_SIDE_EFFECTS__
function _trim() {
    return _overwrite((input) => input.trim());
}
// toLowerCase
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
    return _overwrite((input) => input.toLowerCase());
}
// toUpperCase
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
    return _overwrite((input) => input.toUpperCase());
}
// slugify
// @__NO_SIDE_EFFECTS__
function _slugify() {
    return _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
    return new Class({
        type: "array",
        element,
        // get element() {
        //   return element;
        // },
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _union(Class, options, params) {
    return new Class({
        type: "union",
        options,
        ...util.normalizeParams(params),
    });
}
function _xor(Class, options, params) {
    return new Class({
        type: "union",
        options,
        inclusive: false,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _discriminatedUnion(Class, discriminator, options, params) {
    return new Class({
        type: "union",
        options,
        discriminator,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _intersection(Class, left, right) {
    return new Class({
        type: "intersection",
        left,
        right,
    });
}
// export function _tuple(
//   Class: util.SchemaClass<schemas.$ZodTuple>,
//   items: [],
//   params?: string | $ZodTupleParams
// ): schemas.$ZodTuple<[], null>;
// @__NO_SIDE_EFFECTS__
function _tuple(Class, items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof schemas.$ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new Class({
        type: "tuple",
        items,
        rest,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _record(Class, keyType, valueType, params) {
    return new Class({
        type: "record",
        keyType,
        valueType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _map(Class, keyType, valueType, params) {
    return new Class({
        type: "map",
        keyType,
        valueType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _set(Class, valueType, params) {
    return new Class({
        type: "set",
        valueType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _enum(Class, values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    // if (Array.isArray(values)) {
    //   for (const value of values) {
    //     entries[value] = value;
    //   }
    // } else {
    //   Object.assign(entries, values);
    // }
    // const entries: util.EnumLike = {};
    // for (const val of values) {
    //   entries[val] = val;
    // }
    return new Class({
        type: "enum",
        entries,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
 *
 * ```ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * ```
 */
function _nativeEnum(Class, entries, params) {
    return new Class({
        type: "enum",
        entries,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _literal(Class, value, params) {
    return new Class({
        type: "literal",
        values: Array.isArray(value) ? value : [value],
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _file(Class, params) {
    return new Class({
        type: "file",
        ...normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _transform(Class, fn) {
    return new Class({
        type: "transform",
        transform: fn,
    });
}
// @__NO_SIDE_EFFECTS__
function _optional(Class, innerType) {
    return new Class({
        type: "optional",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _nullable(Class, innerType) {
    return new Class({
        type: "nullable",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _default(Class, innerType, defaultValue) {
    return new Class({
        type: "default",
        innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : util.shallowClone(defaultValue);
        },
    });
}
// @__NO_SIDE_EFFECTS__
function _nonoptional(Class, innerType, params) {
    return new Class({
        type: "nonoptional",
        innerType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _success(Class, innerType) {
    return new Class({
        type: "success",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _catch(Class, innerType, catchValue) {
    return new Class({
        type: "catch",
        innerType,
        catchValue: (typeof catchValue === "function" ? catchValue : () => catchValue),
    });
}
// @__NO_SIDE_EFFECTS__
function _pipe(Class, in_, out) {
    return new Class({
        type: "pipe",
        in: in_,
        out,
    });
}
// @__NO_SIDE_EFFECTS__
function _readonly(Class, innerType) {
    return new Class({
        type: "readonly",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _templateLiteral(Class, parts, params) {
    return new Class({
        type: "template_literal",
        parts,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _lazy(Class, getter) {
    return new Class({
        type: "lazy",
        getter,
    });
}
// @__NO_SIDE_EFFECTS__
function _promise(Class, innerType) {
    return new Class({
        type: "promise",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class, fn, _params) {
    const norm = normalizeParams(_params);
    norm.abort ?? (norm.abort = true); // default to abort:false
    const schema = new Class({
        type: "custom",
        check: "custom",
        fn: fn,
        ...norm,
    });
    return schema;
}
// same as _custom but defaults to abort:false
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
    const schema = new Class({
        type: "custom",
        check: "custom",
        fn: fn,
        ...normalizeParams(_params),
    });
    return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn) {
    const ch = _check((payload) => {
        payload.addIssue = (issue) => {
            if (typeof issue === "string") {
                payload.issues.push(util_issue(issue, payload.value, ch._zod.def));
            }
            else {
                // for Zod 3 backwards compatibility
                const _issue = issue;
                if (_issue.fatal)
                    _issue.continue = false;
                _issue.code ?? (_issue.code = "custom");
                _issue.input ?? (_issue.input = payload.value);
                _issue.inst ?? (_issue.inst = ch);
                _issue.continue ?? (_issue.continue = !ch._zod.def.abort); // abort is always undefined, so this is always true...
                payload.issues.push(util_issue(_issue));
            }
        };
        return fn(payload.value, payload);
    });
    return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
    const ch = new $ZodCheck({
        check: "custom",
        ...normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
}
// @__NO_SIDE_EFFECTS__
function describe(description) {
    const ch = new $ZodCheck({ check: "describe" });
    ch._zod.onattach = [
        (inst) => {
            const existing = registries_globalRegistry.get(inst) ?? {};
            registries_globalRegistry.add(inst, { ...existing, description });
        },
    ];
    ch._zod.check = () => { }; // no-op check
    return ch;
}
// @__NO_SIDE_EFFECTS__
function meta(metadata) {
    const ch = new $ZodCheck({ check: "meta" });
    ch._zod.onattach = [
        (inst) => {
            const existing = registries_globalRegistry.get(inst) ?? {};
            registries_globalRegistry.add(inst, { ...existing, ...metadata });
        },
    ];
    ch._zod.check = () => { }; // no-op check
    return ch;
}
// @__NO_SIDE_EFFECTS__
function _stringbool(Classes, _params) {
    const params = normalizeParams(_params);
    let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
    let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
    if (params.case !== "sensitive") {
        truthyArray = truthyArray.map((v) => (typeof v === "string" ? v.toLowerCase() : v));
        falsyArray = falsyArray.map((v) => (typeof v === "string" ? v.toLowerCase() : v));
    }
    const truthySet = new Set(truthyArray);
    const falsySet = new Set(falsyArray);
    const _Codec = Classes.Codec ?? $ZodCodec;
    const _Boolean = Classes.Boolean ?? $ZodBoolean;
    const _String = Classes.String ?? $ZodString;
    const stringSchema = new _String({ type: "string", error: params.error });
    const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
    const codec = new _Codec({
        type: "pipe",
        in: stringSchema,
        out: booleanSchema,
        transform: ((input, payload) => {
            let data = input;
            if (params.case !== "sensitive")
                data = data.toLowerCase();
            if (truthySet.has(data)) {
                return true;
            }
            else if (falsySet.has(data)) {
                return false;
            }
            else {
                payload.issues.push({
                    code: "invalid_value",
                    expected: "stringbool",
                    values: [...truthySet, ...falsySet],
                    input: payload.value,
                    inst: codec,
                    continue: false,
                });
                return {};
            }
        }),
        reverseTransform: ((input, _payload) => {
            if (input === true) {
                return truthyArray[0] || "true";
            }
            else {
                return falsyArray[0] || "false";
            }
        }),
        error: params.error,
    });
    return codec;
}
// @__NO_SIDE_EFFECTS__
function _stringFormat(Class, format, fnOrRegex, _params = {}) {
    const params = normalizeParams(_params);
    const def = {
        ...normalizeParams(_params),
        check: "string_format",
        type: "string",
        format,
        fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
        ...params,
    };
    if (fnOrRegex instanceof RegExp) {
        def.pattern = fnOrRegex;
    }
    const inst = new Class(def);
    return inst;
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/to-json-schema.js

// function initializeContext<T extends schemas.$ZodType>(inputs: JSONSchemaGeneratorParams<T>): ToJSONSchemaContext<T> {
//   return {
//     processor: inputs.processor,
//     metadataRegistry: inputs.metadata ?? globalRegistry,
//     target: inputs.target ?? "draft-2020-12",
//     unrepresentable: inputs.unrepresentable ?? "throw",
//   };
// }
function to_json_schema_initializeContext(params) {
    // Normalize target: convert old non-hyphenated versions to hyphenated versions
    let target = params?.target ?? "draft-2020-12";
    if (target === "draft-4")
        target = "draft-04";
    if (target === "draft-7")
        target = "draft-07";
    return {
        processors: params.processors ?? {},
        metadataRegistry: params?.metadata ?? registries_globalRegistry,
        target,
        unrepresentable: params?.unrepresentable ?? "throw",
        override: params?.override ?? (() => { }),
        io: params?.io ?? "output",
        counter: 0,
        seen: new Map(),
        cycles: params?.cycles ?? "ref",
        reused: params?.reused ?? "inline",
        external: params?.external ?? undefined,
    };
}
function to_json_schema_process(schema, ctx, _params = { path: [], schemaPath: [] }) {
    var _a;
    const def = schema._zod.def;
    // check for schema in seens
    const seen = ctx.seen.get(schema);
    if (seen) {
        seen.count++;
        // check if cycle
        const isCycle = _params.schemaPath.includes(schema);
        if (isCycle) {
            seen.cycle = _params.path;
        }
        return seen.schema;
    }
    // initialize
    const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
    ctx.seen.set(schema, result);
    // custom method overrides default behavior
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
        result.schema = overrideSchema;
    }
    else {
        const params = {
            ..._params,
            schemaPath: [..._params.schemaPath, schema],
            path: _params.path,
        };
        if (schema._zod.processJSONSchema) {
            schema._zod.processJSONSchema(ctx, result.schema, params);
        }
        else {
            const _json = result.schema;
            const processor = ctx.processors[def.type];
            if (!processor) {
                throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
            }
            processor(schema, ctx, _json, params);
        }
        const parent = schema._zod.parent;
        if (parent) {
            // Also set ref if processor didn't (for inheritance)
            if (!result.ref)
                result.ref = parent;
            to_json_schema_process(parent, ctx, params);
            ctx.seen.get(parent).isParent = true;
        }
    }
    // metadata
    const meta = ctx.metadataRegistry.get(schema);
    if (meta)
        Object.assign(result.schema, meta);
    if (ctx.io === "input" && isTransforming(schema)) {
        // examples/defaults only apply to output type of pipe
        delete result.schema.examples;
        delete result.schema.default;
    }
    // set prefault as default
    if (ctx.io === "input" && result.schema._prefault)
        (_a = result.schema).default ?? (_a.default = result.schema._prefault);
    delete result.schema._prefault;
    // pulling fresh from ctx.seen in case it was overwritten
    const _result = ctx.seen.get(schema);
    return _result.schema;
}
function to_json_schema_extractDefs(ctx, schema
// params: EmitParams
) {
    // iterate over seen map;
    const root = ctx.seen.get(schema);
    if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
    // Track ids to detect duplicates across different schemas
    const idToSchema = new Map();
    for (const entry of ctx.seen.entries()) {
        const id = ctx.metadataRegistry.get(entry[0])?.id;
        if (id) {
            const existing = idToSchema.get(id);
            if (existing && existing !== entry[0]) {
                throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
            }
            idToSchema.set(id, entry[0]);
        }
    }
    // returns a ref to the schema
    // defId will be empty if the ref points to an external schema (or #)
    const makeURI = (entry) => {
        // comparing the seen objects because sometimes
        // multiple schemas map to the same seen object.
        // e.g. lazy
        // external is configured
        const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
        if (ctx.external) {
            const externalId = ctx.external.registry.get(entry[0])?.id; // ?? "__shared";// `__schema${ctx.counter++}`;
            // check if schema is in the external registry
            const uriGenerator = ctx.external.uri ?? ((id) => id);
            if (externalId) {
                return { ref: uriGenerator(externalId) };
            }
            // otherwise, add to __shared
            const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
            entry[1].defId = id; // set defId so it will be reused if needed
            return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
        }
        if (entry[1] === root) {
            return { ref: "#" };
        }
        // self-contained schema
        const uriPrefix = `#`;
        const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
        const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
        return { defId, ref: defUriPrefix + defId };
    };
    // stored cached version in `def` property
    // remove all properties, set $ref
    const extractToDef = (entry) => {
        // if the schema is already a reference, do not extract it
        if (entry[1].schema.$ref) {
            return;
        }
        const seen = entry[1];
        const { ref, defId } = makeURI(entry);
        seen.def = { ...seen.schema };
        // defId won't be set if the schema is a reference to an external schema
        // or if the schema is the root schema
        if (defId)
            seen.defId = defId;
        // wipe away all properties except $ref
        const schema = seen.schema;
        for (const key in schema) {
            delete schema[key];
        }
        schema.$ref = ref;
    };
    // throw on cycles
    // break cycles
    if (ctx.cycles === "throw") {
        for (const entry of ctx.seen.entries()) {
            const seen = entry[1];
            if (seen.cycle) {
                throw new Error("Cycle detected: " +
                    `#/${seen.cycle?.join("/")}/<root>` +
                    '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
            }
        }
    }
    // extract schemas into $defs
    for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        // convert root schema to # $ref
        if (schema === entry[0]) {
            extractToDef(entry); // this has special handling for the root schema
            continue;
        }
        // extract schemas that are in the external registry
        if (ctx.external) {
            const ext = ctx.external.registry.get(entry[0])?.id;
            if (schema !== entry[0] && ext) {
                extractToDef(entry);
                continue;
            }
        }
        // extract schemas with `id` meta
        const id = ctx.metadataRegistry.get(entry[0])?.id;
        if (id) {
            extractToDef(entry);
            continue;
        }
        // break cycles
        if (seen.cycle) {
            // any
            extractToDef(entry);
            continue;
        }
        // extract reused schemas
        if (seen.count > 1) {
            if (ctx.reused === "ref") {
                extractToDef(entry);
                // biome-ignore lint:
                continue;
            }
        }
    }
}
function to_json_schema_finalize(ctx, schema) {
    const root = ctx.seen.get(schema);
    if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
    // flatten refs - inherit properties from parent schemas
    const flattenRef = (zodSchema) => {
        const seen = ctx.seen.get(zodSchema);
        // already processed
        if (seen.ref === null)
            return;
        const schema = seen.def ?? seen.schema;
        const _cached = { ...schema };
        const ref = seen.ref;
        seen.ref = null; // prevent infinite recursion
        if (ref) {
            flattenRef(ref);
            const refSeen = ctx.seen.get(ref);
            const refSchema = refSeen.schema;
            // merge referenced schema into current
            if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
                // older drafts can't combine $ref with other properties
                schema.allOf = schema.allOf ?? [];
                schema.allOf.push(refSchema);
            }
            else {
                Object.assign(schema, refSchema);
            }
            // restore child's own properties (child wins)
            Object.assign(schema, _cached);
            const isParentRef = zodSchema._zod.parent === ref;
            // For parent chain, child is a refinement - remove parent-only properties
            if (isParentRef) {
                for (const key in schema) {
                    if (key === "$ref" || key === "allOf")
                        continue;
                    if (!(key in _cached)) {
                        delete schema[key];
                    }
                }
            }
            // When ref was extracted to $defs, remove properties that match the definition
            if (refSchema.$ref && refSeen.def) {
                for (const key in schema) {
                    if (key === "$ref" || key === "allOf")
                        continue;
                    if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) {
                        delete schema[key];
                    }
                }
            }
        }
        // If parent was extracted (has $ref), propagate $ref to this schema
        // This handles cases like: readonly().meta({id}).describe()
        // where processor sets ref to innerType but parent should be referenced
        const parent = zodSchema._zod.parent;
        if (parent && parent !== ref) {
            // Ensure parent is processed first so its def has inherited properties
            flattenRef(parent);
            const parentSeen = ctx.seen.get(parent);
            if (parentSeen?.schema.$ref) {
                schema.$ref = parentSeen.schema.$ref;
                // De-duplicate with parent's definition
                if (parentSeen.def) {
                    for (const key in schema) {
                        if (key === "$ref" || key === "allOf")
                            continue;
                        if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) {
                            delete schema[key];
                        }
                    }
                }
            }
        }
        // execute overrides
        ctx.override({
            zodSchema: zodSchema,
            jsonSchema: schema,
            path: seen.path ?? [],
        });
    };
    for (const entry of [...ctx.seen.entries()].reverse()) {
        flattenRef(entry[0]);
    }
    const result = {};
    if (ctx.target === "draft-2020-12") {
        result.$schema = "https://json-schema.org/draft/2020-12/schema";
    }
    else if (ctx.target === "draft-07") {
        result.$schema = "http://json-schema.org/draft-07/schema#";
    }
    else if (ctx.target === "draft-04") {
        result.$schema = "http://json-schema.org/draft-04/schema#";
    }
    else if (ctx.target === "openapi-3.0") {
        // OpenAPI 3.0 schema objects should not include a $schema property
    }
    else {
        // Arbitrary string values are allowed but won't have a $schema property set
    }
    if (ctx.external?.uri) {
        const id = ctx.external.registry.get(schema)?.id;
        if (!id)
            throw new Error("Schema is missing an `id` property");
        result.$id = ctx.external.uri(id);
    }
    Object.assign(result, root.def ?? root.schema);
    // build defs object
    const defs = ctx.external?.defs ?? {};
    for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        if (seen.def && seen.defId) {
            defs[seen.defId] = seen.def;
        }
    }
    // set definitions in result
    if (ctx.external) {
    }
    else {
        if (Object.keys(defs).length > 0) {
            if (ctx.target === "draft-2020-12") {
                result.$defs = defs;
            }
            else {
                result.definitions = defs;
            }
        }
    }
    try {
        // this "finalizes" this schema and ensures all cycles are removed
        // each call to finalize() is functionally independent
        // though the seen map is shared
        const finalized = JSON.parse(JSON.stringify(result));
        Object.defineProperty(finalized, "~standard", {
            value: {
                ...schema["~standard"],
                jsonSchema: {
                    input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
                    output: createStandardJSONSchemaMethod(schema, "output", ctx.processors),
                },
            },
            enumerable: false,
            writable: false,
        });
        return finalized;
    }
    catch (_err) {
        throw new Error("Error converting schema to JSON.");
    }
}
function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: new Set() };
    if (ctx.seen.has(_schema))
        return false;
    ctx.seen.add(_schema);
    const def = _schema._zod.def;
    if (def.type === "transform")
        return true;
    if (def.type === "array")
        return isTransforming(def.element, ctx);
    if (def.type === "set")
        return isTransforming(def.valueType, ctx);
    if (def.type === "lazy")
        return isTransforming(def.getter(), ctx);
    if (def.type === "promise" ||
        def.type === "optional" ||
        def.type === "nonoptional" ||
        def.type === "nullable" ||
        def.type === "readonly" ||
        def.type === "default" ||
        def.type === "prefault") {
        return isTransforming(def.innerType, ctx);
    }
    if (def.type === "intersection") {
        return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    if (def.type === "record" || def.type === "map") {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    if (def.type === "pipe") {
        return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
        for (const key in def.shape) {
            if (isTransforming(def.shape[key], ctx))
                return true;
        }
        return false;
    }
    if (def.type === "union") {
        for (const option of def.options) {
            if (isTransforming(option, ctx))
                return true;
        }
        return false;
    }
    if (def.type === "tuple") {
        for (const item of def.items) {
            if (isTransforming(item, ctx))
                return true;
        }
        if (def.rest && isTransforming(def.rest, ctx))
            return true;
        return false;
    }
    return false;
}
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
    const ctx = to_json_schema_initializeContext({ ...params, processors });
    to_json_schema_process(schema, ctx);
    to_json_schema_extractDefs(ctx, schema);
    return to_json_schema_finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
    const { libraryOptions, target } = params ?? {};
    const ctx = to_json_schema_initializeContext({ ...(libraryOptions ?? {}), target, io, processors });
    to_json_schema_process(schema, ctx);
    to_json_schema_extractDefs(ctx, schema);
    return to_json_schema_finalize(ctx, schema);
};

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/json-schema-processors.js


const formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: "", // do not set
};
// ==================== SIMPLE TYPE PROCESSORS ====================
const stringProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    json.type = "string";
    const { minimum, maximum, format, patterns, contentEncoding } = schema._zod
        .bag;
    if (typeof minimum === "number")
        json.minLength = minimum;
    if (typeof maximum === "number")
        json.maxLength = maximum;
    // custom pattern overrides format
    if (format) {
        json.format = formatMap[format] ?? format;
        if (json.format === "")
            delete json.format; // empty format is not valid
        // JSON Schema format: "time" requires a full time with offset or Z
        // z.iso.time() does not include timezone information, so format: "time" should never be used
        if (format === "time") {
            delete json.format;
        }
    }
    if (contentEncoding)
        json.contentEncoding = contentEncoding;
    if (patterns && patterns.size > 0) {
        const regexes = [...patterns];
        if (regexes.length === 1)
            json.pattern = regexes[0].source;
        else if (regexes.length > 1) {
            json.allOf = [
                ...regexes.map((regex) => ({
                    ...(ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0"
                        ? { type: "string" }
                        : {}),
                    pattern: regex.source,
                })),
            ];
        }
    }
};
const numberProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
    if (typeof format === "string" && format.includes("int"))
        json.type = "integer";
    else
        json.type = "number";
    if (typeof exclusiveMinimum === "number") {
        if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
            json.minimum = exclusiveMinimum;
            json.exclusiveMinimum = true;
        }
        else {
            json.exclusiveMinimum = exclusiveMinimum;
        }
    }
    if (typeof minimum === "number") {
        json.minimum = minimum;
        if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
            if (exclusiveMinimum >= minimum)
                delete json.minimum;
            else
                delete json.exclusiveMinimum;
        }
    }
    if (typeof exclusiveMaximum === "number") {
        if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
            json.maximum = exclusiveMaximum;
            json.exclusiveMaximum = true;
        }
        else {
            json.exclusiveMaximum = exclusiveMaximum;
        }
    }
    if (typeof maximum === "number") {
        json.maximum = maximum;
        if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
            if (exclusiveMaximum <= maximum)
                delete json.maximum;
            else
                delete json.exclusiveMaximum;
        }
    }
    if (typeof multipleOf === "number")
        json.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
};
const bigintProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt cannot be represented in JSON Schema");
    }
};
const symbolProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Symbols cannot be represented in JSON Schema");
    }
};
const nullProcessor = (_schema, ctx, json, _params) => {
    if (ctx.target === "openapi-3.0") {
        json.type = "string";
        json.nullable = true;
        json.enum = [null];
    }
    else {
        json.type = "null";
    }
};
const undefinedProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Undefined cannot be represented in JSON Schema");
    }
};
const voidProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Void cannot be represented in JSON Schema");
    }
};
const neverProcessor = (_schema, _ctx, json, _params) => {
    json.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {
    // empty schema accepts anything
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {
    // empty schema accepts anything
};
const dateProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Date cannot be represented in JSON Schema");
    }
};
const enumProcessor = (schema, _ctx, json, _params) => {
    const def = schema._zod.def;
    const values = getEnumValues(def.entries);
    // Number enums can have both string and number values
    if (values.every((v) => typeof v === "number"))
        json.type = "number";
    if (values.every((v) => typeof v === "string"))
        json.type = "string";
    json.enum = values;
};
const literalProcessor = (schema, ctx, json, _params) => {
    const def = schema._zod.def;
    const vals = [];
    for (const val of def.values) {
        if (val === undefined) {
            if (ctx.unrepresentable === "throw") {
                throw new Error("Literal `undefined` cannot be represented in JSON Schema");
            }
            else {
                // do not add to vals
            }
        }
        else if (typeof val === "bigint") {
            if (ctx.unrepresentable === "throw") {
                throw new Error("BigInt literals cannot be represented in JSON Schema");
            }
            else {
                vals.push(Number(val));
            }
        }
        else {
            vals.push(val);
        }
    }
    if (vals.length === 0) {
        // do nothing (an undefined literal was stripped)
    }
    else if (vals.length === 1) {
        const val = vals[0];
        json.type = val === null ? "null" : typeof val;
        if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
            json.enum = [val];
        }
        else {
            json.const = val;
        }
    }
    else {
        if (vals.every((v) => typeof v === "number"))
            json.type = "number";
        if (vals.every((v) => typeof v === "string"))
            json.type = "string";
        if (vals.every((v) => typeof v === "boolean"))
            json.type = "boolean";
        if (vals.every((v) => v === null))
            json.type = "null";
        json.enum = vals;
    }
};
const nanProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("NaN cannot be represented in JSON Schema");
    }
};
const templateLiteralProcessor = (schema, _ctx, json, _params) => {
    const _json = json;
    const pattern = schema._zod.pattern;
    if (!pattern)
        throw new Error("Pattern not found in template literal");
    _json.type = "string";
    _json.pattern = pattern.source;
};
const fileProcessor = (schema, _ctx, json, _params) => {
    const _json = json;
    const file = {
        type: "string",
        format: "binary",
        contentEncoding: "binary",
    };
    const { minimum, maximum, mime } = schema._zod.bag;
    if (minimum !== undefined)
        file.minLength = minimum;
    if (maximum !== undefined)
        file.maxLength = maximum;
    if (mime) {
        if (mime.length === 1) {
            file.contentMediaType = mime[0];
            Object.assign(_json, file);
        }
        else {
            Object.assign(_json, file); // shared props at root
            _json.anyOf = mime.map((m) => ({ contentMediaType: m })); // only contentMediaType differs
        }
    }
    else {
        Object.assign(_json, file);
    }
};
const successProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
};
const customProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Custom types cannot be represented in JSON Schema");
    }
};
const functionProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Function types cannot be represented in JSON Schema");
    }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Transforms cannot be represented in JSON Schema");
    }
};
const mapProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Map cannot be represented in JSON Schema");
    }
};
const setProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Set cannot be represented in JSON Schema");
    }
};
// ==================== COMPOSITE TYPE PROCESSORS ====================
const arrayProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
        json.minItems = minimum;
    if (typeof maximum === "number")
        json.maxItems = maximum;
    json.type = "array";
    json.items = to_json_schema_process(def.element, ctx, { ...params, path: [...params.path, "items"] });
};
const objectProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    json.properties = {};
    const shape = def.shape;
    for (const key in shape) {
        json.properties[key] = to_json_schema_process(shape[key], ctx, {
            ...params,
            path: [...params.path, "properties", key],
        });
    }
    // required keys
    const allKeys = new Set(Object.keys(shape));
    const requiredKeys = new Set([...allKeys].filter((key) => {
        const v = def.shape[key]._zod;
        if (ctx.io === "input") {
            return v.optin === undefined;
        }
        else {
            return v.optout === undefined;
        }
    }));
    if (requiredKeys.size > 0) {
        json.required = Array.from(requiredKeys);
    }
    // catchall
    if (def.catchall?._zod.def.type === "never") {
        // strict
        json.additionalProperties = false;
    }
    else if (!def.catchall) {
        // regular
        if (ctx.io === "output")
            json.additionalProperties = false;
    }
    else if (def.catchall) {
        json.additionalProperties = to_json_schema_process(def.catchall, ctx, {
            ...params,
            path: [...params.path, "additionalProperties"],
        });
    }
};
const unionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    // Exclusive unions (inclusive === false) use oneOf (exactly one match) instead of anyOf (one or more matches)
    // This includes both z.xor() and discriminated unions
    const isExclusive = def.inclusive === false;
    const options = def.options.map((x, i) => to_json_schema_process(x, ctx, {
        ...params,
        path: [...params.path, isExclusive ? "oneOf" : "anyOf", i],
    }));
    if (isExclusive) {
        json.oneOf = options;
    }
    else {
        json.anyOf = options;
    }
};
const intersectionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const a = to_json_schema_process(def.left, ctx, {
        ...params,
        path: [...params.path, "allOf", 0],
    });
    const b = to_json_schema_process(def.right, ctx, {
        ...params,
        path: [...params.path, "allOf", 1],
    });
    const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
    const allOf = [
        ...(isSimpleIntersection(a) ? a.allOf : [a]),
        ...(isSimpleIntersection(b) ? b.allOf : [b]),
    ];
    json.allOf = allOf;
};
const tupleProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "array";
    const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
    const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
    const prefixItems = def.items.map((x, i) => to_json_schema_process(x, ctx, {
        ...params,
        path: [...params.path, prefixPath, i],
    }));
    const rest = def.rest
        ? to_json_schema_process(def.rest, ctx, {
            ...params,
            path: [...params.path, restPath, ...(ctx.target === "openapi-3.0" ? [def.items.length] : [])],
        })
        : null;
    if (ctx.target === "draft-2020-12") {
        json.prefixItems = prefixItems;
        if (rest) {
            json.items = rest;
        }
    }
    else if (ctx.target === "openapi-3.0") {
        json.items = {
            anyOf: prefixItems,
        };
        if (rest) {
            json.items.anyOf.push(rest);
        }
        json.minItems = prefixItems.length;
        if (!rest) {
            json.maxItems = prefixItems.length;
        }
    }
    else {
        json.items = prefixItems;
        if (rest) {
            json.additionalItems = rest;
        }
    }
    // length
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
        json.minItems = minimum;
    if (typeof maximum === "number")
        json.maxItems = maximum;
};
const recordProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    // For looseRecord with regex patterns, use patternProperties
    // This correctly represents "only validate keys matching the pattern" semantics
    // and composes well with allOf (intersections)
    const keyType = def.keyType;
    const keyBag = keyType._zod.bag;
    const patterns = keyBag?.patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
        // Use patternProperties for looseRecord with regex patterns
        const valueSchema = to_json_schema_process(def.valueType, ctx, {
            ...params,
            path: [...params.path, "patternProperties", "*"],
        });
        json.patternProperties = {};
        for (const pattern of patterns) {
            json.patternProperties[pattern.source] = valueSchema;
        }
    }
    else {
        // Default behavior: use propertyNames + additionalProperties
        if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
            json.propertyNames = to_json_schema_process(def.keyType, ctx, {
                ...params,
                path: [...params.path, "propertyNames"],
            });
        }
        json.additionalProperties = to_json_schema_process(def.valueType, ctx, {
            ...params,
            path: [...params.path, "additionalProperties"],
        });
    }
    // Add required for keys with discrete values (enum, literal, etc.)
    const keyValues = keyType._zod.values;
    if (keyValues) {
        const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
        if (validKeyValues.length > 0) {
            json.required = validKeyValues;
        }
    }
};
const nullableProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const inner = to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (ctx.target === "openapi-3.0") {
        seen.ref = def.innerType;
        json.nullable = true;
    }
    else {
        json.anyOf = [inner, { type: "null" }];
    }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    if (ctx.io === "input")
        json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let catchValue;
    try {
        catchValue = def.catchValue(undefined);
    }
    catch {
        throw new Error("Dynamic catch values are not supported in JSON Schema");
    }
    json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    const innerType = ctx.io === "input" ? (def.in._zod.def.type === "transform" ? def.out : def.in) : def.out;
    to_json_schema_process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.readOnly = true;
};
const promiseProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
};
const optionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    to_json_schema_process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
};
const lazyProcessor = (schema, ctx, _json, params) => {
    const innerType = schema._zod.innerType;
    to_json_schema_process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
};
// ==================== ALL PROCESSORS ====================
const json_schema_processors_allProcessors = {
    string: stringProcessor,
    number: numberProcessor,
    boolean: booleanProcessor,
    bigint: bigintProcessor,
    symbol: symbolProcessor,
    null: nullProcessor,
    undefined: undefinedProcessor,
    void: voidProcessor,
    never: neverProcessor,
    any: anyProcessor,
    unknown: unknownProcessor,
    date: dateProcessor,
    enum: enumProcessor,
    literal: literalProcessor,
    nan: nanProcessor,
    template_literal: templateLiteralProcessor,
    file: fileProcessor,
    success: successProcessor,
    custom: customProcessor,
    function: functionProcessor,
    transform: transformProcessor,
    map: mapProcessor,
    set: setProcessor,
    array: arrayProcessor,
    object: objectProcessor,
    union: unionProcessor,
    intersection: intersectionProcessor,
    tuple: tupleProcessor,
    record: recordProcessor,
    nullable: nullableProcessor,
    nonoptional: nonoptionalProcessor,
    default: defaultProcessor,
    prefault: prefaultProcessor,
    catch: catchProcessor,
    pipe: pipeProcessor,
    readonly: readonlyProcessor,
    promise: promiseProcessor,
    optional: optionalProcessor,
    lazy: lazyProcessor,
};
function toJSONSchema(input, params) {
    if ("_idmap" in input) {
        // Registry case
        const registry = input;
        const ctx = initializeContext({ ...params, processors: json_schema_processors_allProcessors });
        const defs = {};
        // First pass: process all schemas to build the seen map
        for (const entry of registry._idmap.entries()) {
            const [_, schema] = entry;
            process(schema, ctx);
        }
        const schemas = {};
        const external = {
            registry,
            uri: params?.uri,
            defs,
        };
        // Update the context with external configuration
        ctx.external = external;
        // Second pass: emit each schema
        for (const entry of registry._idmap.entries()) {
            const [key, schema] = entry;
            extractDefs(ctx, schema);
            schemas[key] = finalize(ctx, schema);
        }
        if (Object.keys(defs).length > 0) {
            const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
            schemas.__shared = {
                [defsSegment]: defs,
            };
        }
        return { schemas };
    }
    // Single schema case
    const ctx = initializeContext({ ...params, processors: json_schema_processors_allProcessors });
    process(input, ctx);
    extractDefs(ctx, input);
    return finalize(ctx, input);
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/json-schema-generator.js


/**
 * Legacy class-based interface for JSON Schema generation.
 * This class wraps the new functional implementation to provide backward compatibility.
 *
 * @deprecated Use the `toJSONSchema` function instead for new code.
 *
 * @example
 * ```typescript
 * // Legacy usage (still supported)
 * const gen = new JSONSchemaGenerator({ target: "draft-07" });
 * gen.process(schema);
 * const result = gen.emit(schema);
 *
 * // Preferred modern usage
 * const result = toJSONSchema(schema, { target: "draft-07" });
 * ```
 */
class JSONSchemaGenerator {
    /** @deprecated Access via ctx instead */
    get metadataRegistry() {
        return this.ctx.metadataRegistry;
    }
    /** @deprecated Access via ctx instead */
    get target() {
        return this.ctx.target;
    }
    /** @deprecated Access via ctx instead */
    get unrepresentable() {
        return this.ctx.unrepresentable;
    }
    /** @deprecated Access via ctx instead */
    get override() {
        return this.ctx.override;
    }
    /** @deprecated Access via ctx instead */
    get io() {
        return this.ctx.io;
    }
    /** @deprecated Access via ctx instead */
    get counter() {
        return this.ctx.counter;
    }
    set counter(value) {
        this.ctx.counter = value;
    }
    /** @deprecated Access via ctx instead */
    get seen() {
        return this.ctx.seen;
    }
    constructor(params) {
        // Normalize target for internal context
        let normalizedTarget = params?.target ?? "draft-2020-12";
        if (normalizedTarget === "draft-4")
            normalizedTarget = "draft-04";
        if (normalizedTarget === "draft-7")
            normalizedTarget = "draft-07";
        this.ctx = initializeContext({
            processors: allProcessors,
            target: normalizedTarget,
            ...(params?.metadata && { metadata: params.metadata }),
            ...(params?.unrepresentable && { unrepresentable: params.unrepresentable }),
            ...(params?.override && { override: params.override }),
            ...(params?.io && { io: params.io }),
        });
    }
    /**
     * Process a schema to prepare it for JSON Schema generation.
     * This must be called before emit().
     */
    process(schema, _params = { path: [], schemaPath: [] }) {
        return process(schema, this.ctx, _params);
    }
    /**
     * Emit the final JSON Schema after processing.
     * Must call process() first.
     */
    emit(schema, _params) {
        // Apply emit params to the context
        if (_params) {
            if (_params.cycles)
                this.ctx.cycles = _params.cycles;
            if (_params.reused)
                this.ctx.reused = _params.reused;
            if (_params.external)
                this.ctx.external = _params.external;
        }
        extractDefs(this.ctx, schema);
        const result = finalize(this.ctx, schema);
        // Strip ~standard property to match old implementation's return type
        const { "~standard": _, ...plainResult } = result;
        return plainResult;
    }
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/core/index.js

















;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/checks.js


;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/iso.js


const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function iso_datetime(params) {
    return _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function iso_date(params) {
    return _isoDate(ZodISODate, params);
}
const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function iso_time(params) {
    return _isoTime(ZodISOTime, params);
}
const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function iso_duration(params) {
    return _isoDuration(ZodISODuration, params);
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/errors.js



const errors_initializer = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
        format: {
            value: (mapper) => formatError(inst, mapper),
            // enumerable: false,
        },
        flatten: {
            value: (mapper) => flattenError(inst, mapper),
            // enumerable: false,
        },
        addIssue: {
            value: (issue) => {
                inst.issues.push(issue);
                inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
            },
            // enumerable: false,
        },
        addIssues: {
            value: (issues) => {
                inst.issues.push(...issues);
                inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
            },
            // enumerable: false,
        },
        isEmpty: {
            get() {
                return inst.issues.length === 0;
            },
            // enumerable: false,
        },
    });
    // Object.defineProperty(inst, "isEmpty", {
    //   get() {
    //     return inst.issues.length === 0;
    //   },
    // });
};
const ZodError = $constructor("ZodError", errors_initializer);
const ZodRealError = $constructor("ZodError", errors_initializer, {
    Parent: Error,
});
// /** @deprecated Use `z.core.$ZodErrorMapCtx` instead. */
// export type ErrorMapCtx = core.$ZodErrorMapCtx;

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/parse.js


const parse_parse = /* @__PURE__ */ _parse(ZodRealError);
const parse_parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const parse_safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const parse_safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
// Codec functions
const parse_encode = /* @__PURE__ */ _encode(ZodRealError);
const parse_decode = /* @__PURE__ */ _decode(ZodRealError);
const parse_encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const parse_decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const parse_safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const parse_safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const parse_safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const parse_safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/schemas.js







const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    Object.assign(inst["~standard"], {
        jsonSchema: {
            input: createStandardJSONSchemaMethod(inst, "input"),
            output: createStandardJSONSchemaMethod(inst, "output"),
        },
    });
    inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    // base methods
    inst.check = (...checks) => {
        return inst.clone(mergeDefs(def, {
            checks: [
                ...(def.checks ?? []),
                ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch),
            ],
        }), {
            parent: true,
        });
    };
    inst.with = inst.check;
    inst.clone = (def, params) => clone(inst, def, params);
    inst.brand = () => inst;
    inst.register = ((reg, meta) => {
        reg.add(inst, meta);
        return inst;
    });
    // parsing
    inst.parse = (data, params) => parse_parse(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => parse_safeParse(inst, data, params);
    inst.parseAsync = async (data, params) => parse_parseAsync(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => parse_safeParseAsync(inst, data, params);
    inst.spa = inst.safeParseAsync;
    // encoding/decoding
    inst.encode = (data, params) => parse_encode(inst, data, params);
    inst.decode = (data, params) => parse_decode(inst, data, params);
    inst.encodeAsync = async (data, params) => parse_encodeAsync(inst, data, params);
    inst.decodeAsync = async (data, params) => parse_decodeAsync(inst, data, params);
    inst.safeEncode = (data, params) => parse_safeEncode(inst, data, params);
    inst.safeDecode = (data, params) => parse_safeDecode(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => parse_safeEncodeAsync(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => parse_safeDecodeAsync(inst, data, params);
    // refinements
    inst.refine = (check, params) => inst.check(refine(check, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn) => inst.check(_overwrite(fn));
    // wrappers
    inst.optional = () => optional(inst);
    inst.exactOptional = () => exactOptional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def) => schemas_default(inst, def);
    inst.prefault = (def) => prefault(inst, def);
    // inst.coalesce = (def, params) => coalesce(inst, def, params);
    inst.catch = (params) => schemas_catch(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    // meta
    inst.describe = (description) => {
        const cl = inst.clone();
        registries_globalRegistry.add(cl, { description });
        return cl;
    };
    Object.defineProperty(inst, "description", {
        get() {
            return registries_globalRegistry.get(inst)?.description;
        },
        configurable: true,
    });
    inst.meta = (...args) => {
        if (args.length === 0) {
            return registries_globalRegistry.get(inst);
        }
        const cl = inst.clone();
        registries_globalRegistry.add(cl, args[0]);
        return cl;
    };
    // helpers
    inst.isOptional = () => inst.safeParse(undefined).success;
    inst.isNullable = () => inst.safeParse(null).success;
    inst.apply = (fn) => fn(inst);
    return inst;
});
/** @internal */
const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    // validations
    inst.regex = (...args) => inst.check(_regex(...args));
    inst.includes = (...args) => inst.check(_includes(...args));
    inst.startsWith = (...args) => inst.check(_startsWith(...args));
    inst.endsWith = (...args) => inst.check(_endsWith(...args));
    inst.min = (...args) => inst.check(_minLength(...args));
    inst.max = (...args) => inst.check(_maxLength(...args));
    inst.length = (...args) => inst.check(_length(...args));
    inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
    inst.lowercase = (params) => inst.check(_lowercase(params));
    inst.uppercase = (params) => inst.check(_uppercase(params));
    // transforms
    inst.trim = () => inst.check(_trim());
    inst.normalize = (...args) => inst.check(_normalize(...args));
    inst.toLowerCase = () => inst.check(_toLowerCase());
    inst.toUpperCase = () => inst.check(_toUpperCase());
    inst.slugify = () => inst.check(_slugify());
});
const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(api_emoji(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    // iso
    inst.datetime = (params) => inst.check(iso_datetime(params));
    inst.date = (params) => inst.check(iso_date(params));
    inst.time = (params) => inst.check(iso_time(params));
    inst.duration = (params) => inst.check(iso_duration(params));
});
function schemas_string(params) {
    return _string(ZodString, params);
}
const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
});
const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_email(params) {
    return _email(ZodEmail, params);
}
const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_guid(params) {
    return _guid(ZodGUID, params);
}
const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_uuid(params) {
    return _uuid(ZodUUID, params);
}
function uuidv4(params) {
    return _uuidv4(ZodUUID, params);
}
// ZodUUIDv6
function uuidv6(params) {
    return _uuidv6(ZodUUID, params);
}
// ZodUUIDv7
function uuidv7(params) {
    return _uuidv7(ZodUUID, params);
}
const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function url(params) {
    return _url(ZodURL, params);
}
function httpUrl(params) {
    return _url(ZodURL, {
        protocol: /^https?$/,
        hostname: domain,
        ...normalizeParams(params),
    });
}
const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_emoji(params) {
    return api_emoji(ZodEmoji, params);
}
const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_nanoid(params) {
    return _nanoid(ZodNanoID, params);
}
const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_cuid(params) {
    return _cuid(ZodCUID, params);
}
const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_cuid2(params) {
    return _cuid2(ZodCUID2, params);
}
const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_ulid(params) {
    return _ulid(ZodULID, params);
}
const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_xid(params) {
    return _xid(ZodXID, params);
}
const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_ksuid(params) {
    return _ksuid(ZodKSUID, params);
}
const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_ipv4(params) {
    return _ipv4(ZodIPv4, params);
}
const ZodMAC = /*@__PURE__*/ $constructor("ZodMAC", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodMAC.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_mac(params) {
    return _mac(ZodMAC, params);
}
const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_ipv6(params) {
    return _ipv6(ZodIPv6, params);
}
const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_cidrv4(params) {
    return _cidrv4(ZodCIDRv4, params);
}
const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_cidrv6(params) {
    return _cidrv6(ZodCIDRv6, params);
}
const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_base64(params) {
    return _base64(ZodBase64, params);
}
const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_base64url(params) {
    return _base64url(ZodBase64URL, params);
}
const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function schemas_e164(params) {
    return _e164(ZodE164, params);
}
const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function jwt(params) {
    return _jwt(ZodJWT, params);
}
const ZodCustomStringFormat = /*@__PURE__*/ $constructor("ZodCustomStringFormat", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    $ZodCustomStringFormat.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
    return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function schemas_hostname(_params) {
    return _stringFormat(ZodCustomStringFormat, "hostname", hostname, _params);
}
function schemas_hex(_params) {
    return _stringFormat(ZodCustomStringFormat, "hex", hex, _params);
}
function hash(alg, params) {
    const enc = params?.enc ?? "hex";
    const format = `${alg}_${enc}`;
    const regex = regexes_namespaceObject[format];
    if (!regex)
        throw new Error(`Unrecognized hash format: ${format}`);
    return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.int = (params) => inst.check(schemas_int(params));
    inst.safe = (params) => inst.check(schemas_int(params));
    inst.positive = (params) => inst.check(_gt(0, params));
    inst.nonnegative = (params) => inst.check(_gte(0, params));
    inst.negative = (params) => inst.check(_lt(0, params));
    inst.nonpositive = (params) => inst.check(_lte(0, params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    inst.step = (value, params) => inst.check(_multipleOf(value, params));
    // inst.finite = (params) => inst.check(core.finite(params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue =
        Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue =
        Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
});
function schemas_number(params) {
    return _number(ZodNumber, params);
}
const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
});
function schemas_int(params) {
    return _int(ZodNumberFormat, params);
}
function float32(params) {
    return _float32(ZodNumberFormat, params);
}
function float64(params) {
    return _float64(ZodNumberFormat, params);
}
function int32(params) {
    return _int32(ZodNumberFormat, params);
}
function uint32(params) {
    return _uint32(ZodNumberFormat, params);
}
const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function schemas_boolean(params) {
    return _boolean(ZodBoolean, params);
}
const ZodBigInt = /*@__PURE__*/ $constructor("ZodBigInt", (inst, def) => {
    $ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => bigintProcessor(inst, ctx, json, params);
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.positive = (params) => inst.check(_gt(BigInt(0), params));
    inst.negative = (params) => inst.check(_lt(BigInt(0), params));
    inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
    inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    const bag = inst._zod.bag;
    inst.minValue = bag.minimum ?? null;
    inst.maxValue = bag.maximum ?? null;
    inst.format = bag.format ?? null;
});
function schemas_bigint(params) {
    return _bigint(ZodBigInt, params);
}
const ZodBigIntFormat = /*@__PURE__*/ $constructor("ZodBigIntFormat", (inst, def) => {
    $ZodBigIntFormat.init(inst, def);
    ZodBigInt.init(inst, def);
});
// int64
function int64(params) {
    return _int64(ZodBigIntFormat, params);
}
// uint64
function uint64(params) {
    return _uint64(ZodBigIntFormat, params);
}
const ZodSymbol = /*@__PURE__*/ $constructor("ZodSymbol", (inst, def) => {
    $ZodSymbol.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => symbolProcessor(inst, ctx, json, params);
});
function symbol(params) {
    return _symbol(ZodSymbol, params);
}
const ZodUndefined = /*@__PURE__*/ $constructor("ZodUndefined", (inst, def) => {
    $ZodUndefined.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
});
function schemas_undefined(params) {
    return api_undefined(ZodUndefined, params);
}

const ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
});
function schemas_null(params) {
    return api_null(ZodNull, params);
}

const ZodAny = /*@__PURE__*/ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => anyProcessor(inst, ctx, json, params);
});
function any() {
    return _any(ZodAny);
}
const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
function unknown() {
    return _unknown(ZodUnknown);
}
const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
    return _never(ZodNever, params);
}
const ZodVoid = /*@__PURE__*/ $constructor("ZodVoid", (inst, def) => {
    $ZodVoid.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => voidProcessor(inst, ctx, json, params);
});
function schemas_void(params) {
    return _void(ZodVoid, params);
}

const ZodDate = /*@__PURE__*/ $constructor("ZodDate", (inst, def) => {
    $ZodDate.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => dateProcessor(inst, ctx, json, params);
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    const c = inst._zod.bag;
    inst.minDate = c.minimum ? new Date(c.minimum) : null;
    inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function schemas_date(params) {
    return _date(ZodDate, params);
}
const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
    inst.nonempty = (params) => inst.check(_minLength(1, params));
    inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(_length(len, params));
    inst.unwrap = () => inst.element;
});
function array(element, params) {
    return _array(ZodArray, element, params);
}
// .keyof
function keyof(schema) {
    const shape = schema._zod.def.shape;
    return schemas_enum(Object.keys(shape));
}
const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    defineLazy(inst, "shape", () => {
        return def.shape;
    });
    inst.keyof = () => schemas_enum(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall: catchall });
    inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
    inst.strip = () => inst.clone({ ...inst._zod.def, catchall: undefined });
    inst.extend = (incoming) => {
        return extend(inst, incoming);
    };
    inst.safeExtend = (incoming) => {
        return safeExtend(inst, incoming);
    };
    inst.merge = (other) => merge(inst, other);
    inst.pick = (mask) => pick(inst, mask);
    inst.omit = (mask) => omit(inst, mask);
    inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
    inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
    const def = {
        type: "object",
        shape: shape ?? {},
        ...normalizeParams(params),
    };
    return new ZodObject(def);
}
// strictObject
function strictObject(shape, params) {
    return new ZodObject({
        type: "object",
        shape,
        catchall: never(),
        ...normalizeParams(params),
    });
}
// looseObject
function looseObject(shape, params) {
    return new ZodObject({
        type: "object",
        shape,
        catchall: unknown(),
        ...normalizeParams(params),
    });
}
const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
});
function union(options, params) {
    return new ZodUnion({
        type: "union",
        options: options,
        ...normalizeParams(params),
    });
}
const ZodXor = /*@__PURE__*/ $constructor("ZodXor", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodXor.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
});
/** Creates an exclusive union (XOR) where exactly one option must match.
 * Unlike regular unions that succeed when any option matches, xor fails if
 * zero or more than one option matches the input. */
function xor(options, params) {
    return new ZodXor({
        type: "union",
        options: options,
        inclusive: false,
        ...normalizeParams(params),
    });
}
const ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
    // const [options, params] = args;
    return new ZodDiscriminatedUnion({
        type: "union",
        options,
        discriminator,
        ...normalizeParams(params),
    });
}
const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
    return new ZodIntersection({
        type: "intersection",
        left: left,
        right: right,
    });
}
const ZodTuple = /*@__PURE__*/ $constructor("ZodTuple", (inst, def) => {
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => tupleProcessor(inst, ctx, json, params);
    inst.rest = (rest) => inst.clone({
        ...inst._zod.def,
        rest: rest,
    });
});
function tuple(items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof $ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new ZodTuple({
        type: "tuple",
        items: items,
        rest,
        ...normalizeParams(params),
    });
}
const ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
    return new ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        ...normalizeParams(params),
    });
}
// type alksjf = core.output<core.$ZodRecordKey>;
function partialRecord(keyType, valueType, params) {
    const k = clone(keyType);
    k._zod.values = undefined;
    return new ZodRecord({
        type: "record",
        keyType: k,
        valueType: valueType,
        ...normalizeParams(params),
    });
}
function looseRecord(keyType, valueType, params) {
    return new ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        mode: "loose",
        ...normalizeParams(params),
    });
}
const ZodMap = /*@__PURE__*/ $constructor("ZodMap", (inst, def) => {
    $ZodMap.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => mapProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
});
function map(keyType, valueType, params) {
    return new ZodMap({
        type: "map",
        keyType: keyType,
        valueType: valueType,
        ...normalizeParams(params),
    });
}
const ZodSet = /*@__PURE__*/ $constructor("ZodSet", (inst, def) => {
    $ZodSet.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => setProcessor(inst, ctx, json, params);
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
});
function set(valueType, params) {
    return new ZodSet({
        type: "set",
        valueType: valueType,
        ...normalizeParams(params),
    });
}
const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
        const newEntries = {};
        for (const value of values) {
            if (keys.has(value)) {
                newEntries[value] = def.entries[value];
            }
            else
                throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
            ...def,
            checks: [],
            ...normalizeParams(params),
            entries: newEntries,
        });
    };
    inst.exclude = (values, params) => {
        const newEntries = { ...def.entries };
        for (const value of values) {
            if (keys.has(value)) {
                delete newEntries[value];
            }
            else
                throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
            ...def,
            checks: [],
            ...normalizeParams(params),
            entries: newEntries,
        });
    };
});
function schemas_enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum({
        type: "enum",
        entries,
        ...normalizeParams(params),
    });
}

/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
 *
 * ```ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * ```
 */
function nativeEnum(entries, params) {
    return new ZodEnum({
        type: "enum",
        entries,
        ...normalizeParams(params),
    });
}
const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
        get() {
            if (def.values.length > 1) {
                throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
            }
            return def.values[0];
        },
    });
});
function literal(value, params) {
    return new ZodLiteral({
        type: "literal",
        values: Array.isArray(value) ? value : [value],
        ...normalizeParams(params),
    });
}
const ZodFile = /*@__PURE__*/ $constructor("ZodFile", (inst, def) => {
    $ZodFile.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => fileProcessor(inst, ctx, json, params);
    inst.min = (size, params) => inst.check(_minSize(size, params));
    inst.max = (size, params) => inst.check(_maxSize(size, params));
    inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
    return _file(ZodFile, params);
}
const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
        if (_ctx.direction === "backward") {
            throw new $ZodEncodeError(inst.constructor.name);
        }
        payload.addIssue = (issue) => {
            if (typeof issue === "string") {
                payload.issues.push(util_issue(issue, payload.value, def));
            }
            else {
                // for Zod 3 backwards compatibility
                const _issue = issue;
                if (_issue.fatal)
                    _issue.continue = false;
                _issue.code ?? (_issue.code = "custom");
                _issue.input ?? (_issue.input = payload.value);
                _issue.inst ?? (_issue.inst = inst);
                // _issue.continue ??= true;
                payload.issues.push(util_issue(_issue));
            }
        };
        const output = def.transform(payload.value, payload);
        if (output instanceof Promise) {
            return output.then((output) => {
                payload.value = output;
                return payload;
            });
        }
        payload.value = output;
        return payload;
    };
});
function transform(fn) {
    return new ZodTransform({
        type: "transform",
        transform: fn,
    });
}
const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
    return new ZodOptional({
        type: "optional",
        innerType: innerType,
    });
}
const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
    return new ZodExactOptional({
        type: "optional",
        innerType: innerType,
    });
}
const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
    return new ZodNullable({
        type: "nullable",
        innerType: innerType,
    });
}
// nullish
function schemas_nullish(innerType) {
    return optional(nullable(innerType));
}
const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
});
function schemas_default(innerType, defaultValue) {
    return new ZodDefault({
        type: "default",
        innerType: innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
        },
    });
}
const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
    return new ZodPrefault({
        type: "prefault",
        innerType: innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
        },
    });
}
const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
    return new ZodNonOptional({
        type: "nonoptional",
        innerType: innerType,
        ...normalizeParams(params),
    });
}
const ZodSuccess = /*@__PURE__*/ $constructor("ZodSuccess", (inst, def) => {
    $ZodSuccess.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => successProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
    return new ZodSuccess({
        type: "success",
        innerType: innerType,
    });
}
const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
});
function schemas_catch(innerType, catchValue) {
    return new ZodCatch({
        type: "catch",
        innerType: innerType,
        catchValue: (typeof catchValue === "function" ? catchValue : () => catchValue),
    });
}

const ZodNaN = /*@__PURE__*/ $constructor("ZodNaN", (inst, def) => {
    $ZodNaN.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nanProcessor(inst, ctx, json, params);
});
function nan(params) {
    return _nan(ZodNaN, params);
}
const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
});
function pipe(in_, out) {
    return new ZodPipe({
        type: "pipe",
        in: in_,
        out: out,
        // ...util.normalizeParams(params),
    });
}
const ZodCodec = /*@__PURE__*/ $constructor("ZodCodec", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
    return new ZodCodec({
        type: "pipe",
        in: in_,
        out: out,
        transform: params.decode,
        reverseTransform: params.encode,
    });
}
const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
    return new ZodReadonly({
        type: "readonly",
        innerType: innerType,
    });
}
const ZodTemplateLiteral = /*@__PURE__*/ $constructor("ZodTemplateLiteral", (inst, def) => {
    $ZodTemplateLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => templateLiteralProcessor(inst, ctx, json, params);
});
function templateLiteral(parts, params) {
    return new ZodTemplateLiteral({
        type: "template_literal",
        parts,
        ...normalizeParams(params),
    });
}
const ZodLazy = /*@__PURE__*/ $constructor("ZodLazy", (inst, def) => {
    $ZodLazy.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
    return new ZodLazy({
        type: "lazy",
        getter: getter,
    });
}
const ZodPromise = /*@__PURE__*/ $constructor("ZodPromise", (inst, def) => {
    $ZodPromise.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => promiseProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
    return new ZodPromise({
        type: "promise",
        innerType: innerType,
    });
}
const ZodFunction = /*@__PURE__*/ $constructor("ZodFunction", (inst, def) => {
    $ZodFunction.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => functionProcessor(inst, ctx, json, params);
});
function _function(params) {
    return new ZodFunction({
        type: "function",
        input: Array.isArray(params?.input) ? tuple(params?.input) : (params?.input ?? array(unknown())),
        output: params?.output ?? unknown(),
    });
}

const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
// custom checks
function check(fn) {
    const ch = new $ZodCheck({
        check: "custom",
        // ...util.normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
}
function custom(fn, _params) {
    return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
    return _refine(ZodCustom, fn, _params);
}
// superRefine
function superRefine(fn) {
    return _superRefine(fn);
}
// Re-export describe and meta from core
const schemas_describe = describe;
const schemas_meta = meta;
function _instanceof(cls, params = {}) {
    const inst = new ZodCustom({
        type: "custom",
        check: "custom",
        fn: (data) => data instanceof cls,
        abort: true,
        ...normalizeParams(params),
    });
    inst._zod.bag.Class = cls;
    // Override check to emit invalid_type instead of custom
    inst._zod.check = (payload) => {
        if (!(payload.value instanceof cls)) {
            payload.issues.push({
                code: "invalid_type",
                expected: cls.name,
                input: payload.value,
                inst,
                path: [...(inst._zod.def.path ?? [])],
            });
        }
    };
    return inst;
}

// stringbool
const stringbool = (...args) => _stringbool({
    Codec: ZodCodec,
    Boolean: ZodBoolean,
    String: ZodString,
}, ...args);
function json(params) {
    const jsonSchema = lazy(() => {
        return union([schemas_string(params), schemas_number(), schemas_boolean(), schemas_null(), array(jsonSchema), record(schemas_string(), jsonSchema)]);
    });
    return jsonSchema;
}
// preprocess
// /** @deprecated Use `z.pipe()` and `z.transform()` instead. */
function preprocess(fn, schema) {
    return pipe(transform(fn), schema);
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/compat.js
// Zod 3 compat layer

/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
const ZodIssueCode = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom",
};

/** @deprecated Use `z.config(params)` instead. */
function setErrorMap(map) {
    core.config({
        customError: map,
    });
}
/** @deprecated Use `z.config()` instead. */
function getErrorMap() {
    return core.config().customError;
}
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
var ZodFirstPartyTypeKind;
(function (ZodFirstPartyTypeKind) {
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/from-json-schema.js




// Local z object to avoid circular dependency with ../index.js
const z = {
    ...classic_schemas_namespaceObject,
    ...classic_checks_namespaceObject,
    iso: iso_namespaceObject,
};
// Keys that are recognized and handled by the conversion logic
const RECOGNIZED_KEYS = new Set([
    // Schema identification
    "$schema",
    "$ref",
    "$defs",
    "definitions",
    // Core schema keywords
    "$id",
    "id",
    "$comment",
    "$anchor",
    "$vocabulary",
    "$dynamicRef",
    "$dynamicAnchor",
    // Type
    "type",
    "enum",
    "const",
    // Composition
    "anyOf",
    "oneOf",
    "allOf",
    "not",
    // Object
    "properties",
    "required",
    "additionalProperties",
    "patternProperties",
    "propertyNames",
    "minProperties",
    "maxProperties",
    // Array
    "items",
    "prefixItems",
    "additionalItems",
    "minItems",
    "maxItems",
    "uniqueItems",
    "contains",
    "minContains",
    "maxContains",
    // String
    "minLength",
    "maxLength",
    "pattern",
    "format",
    // Number
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    // Already handled metadata
    "description",
    "default",
    // Content
    "contentEncoding",
    "contentMediaType",
    "contentSchema",
    // Unsupported (error-throwing)
    "unevaluatedItems",
    "unevaluatedProperties",
    "if",
    "then",
    "else",
    "dependentSchemas",
    "dependentRequired",
    // OpenAPI
    "nullable",
    "readOnly",
]);
function detectVersion(schema, defaultTarget) {
    const $schema = schema.$schema;
    if ($schema === "https://json-schema.org/draft/2020-12/schema") {
        return "draft-2020-12";
    }
    if ($schema === "http://json-schema.org/draft-07/schema#") {
        return "draft-7";
    }
    if ($schema === "http://json-schema.org/draft-04/schema#") {
        return "draft-4";
    }
    // Use defaultTarget if provided, otherwise default to draft-2020-12
    return defaultTarget ?? "draft-2020-12";
}
function resolveRef(ref, ctx) {
    if (!ref.startsWith("#")) {
        throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
    }
    const path = ref.slice(1).split("/").filter(Boolean);
    // Handle root reference "#"
    if (path.length === 0) {
        return ctx.rootSchema;
    }
    const defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
    if (path[0] === defsKey) {
        const key = path[1];
        if (!key || !ctx.defs[key]) {
            throw new Error(`Reference not found: ${ref}`);
        }
        return ctx.defs[key];
    }
    throw new Error(`Reference not found: ${ref}`);
}
function convertBaseSchema(schema, ctx) {
    // Handle unsupported features
    if (schema.not !== undefined) {
        // Special case: { not: {} } represents never
        if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) {
            return z.never();
        }
        throw new Error("not is not supported in Zod (except { not: {} } for never)");
    }
    if (schema.unevaluatedItems !== undefined) {
        throw new Error("unevaluatedItems is not supported");
    }
    if (schema.unevaluatedProperties !== undefined) {
        throw new Error("unevaluatedProperties is not supported");
    }
    if (schema.if !== undefined || schema.then !== undefined || schema.else !== undefined) {
        throw new Error("Conditional schemas (if/then/else) are not supported");
    }
    if (schema.dependentSchemas !== undefined || schema.dependentRequired !== undefined) {
        throw new Error("dependentSchemas and dependentRequired are not supported");
    }
    // Handle $ref
    if (schema.$ref) {
        const refPath = schema.$ref;
        if (ctx.refs.has(refPath)) {
            return ctx.refs.get(refPath);
        }
        if (ctx.processing.has(refPath)) {
            // Circular reference - use lazy
            return z.lazy(() => {
                if (!ctx.refs.has(refPath)) {
                    throw new Error(`Circular reference not resolved: ${refPath}`);
                }
                return ctx.refs.get(refPath);
            });
        }
        ctx.processing.add(refPath);
        const resolved = resolveRef(refPath, ctx);
        const zodSchema = convertSchema(resolved, ctx);
        ctx.refs.set(refPath, zodSchema);
        ctx.processing.delete(refPath);
        return zodSchema;
    }
    // Handle enum
    if (schema.enum !== undefined) {
        const enumValues = schema.enum;
        // Special case: OpenAPI 3.0 null representation { type: "string", nullable: true, enum: [null] }
        if (ctx.version === "openapi-3.0" &&
            schema.nullable === true &&
            enumValues.length === 1 &&
            enumValues[0] === null) {
            return z.null();
        }
        if (enumValues.length === 0) {
            return z.never();
        }
        if (enumValues.length === 1) {
            return z.literal(enumValues[0]);
        }
        // Check if all values are strings
        if (enumValues.every((v) => typeof v === "string")) {
            return z.enum(enumValues);
        }
        // Mixed types - use union of literals
        const literalSchemas = enumValues.map((v) => z.literal(v));
        if (literalSchemas.length < 2) {
            return literalSchemas[0];
        }
        return z.union([literalSchemas[0], literalSchemas[1], ...literalSchemas.slice(2)]);
    }
    // Handle const
    if (schema.const !== undefined) {
        return z.literal(schema.const);
    }
    // Handle type
    const type = schema.type;
    if (Array.isArray(type)) {
        // Expand type array into anyOf union
        const typeSchemas = type.map((t) => {
            const typeSchema = { ...schema, type: t };
            return convertBaseSchema(typeSchema, ctx);
        });
        if (typeSchemas.length === 0) {
            return z.never();
        }
        if (typeSchemas.length === 1) {
            return typeSchemas[0];
        }
        return z.union(typeSchemas);
    }
    if (!type) {
        // No type specified - empty schema (any)
        return z.any();
    }
    let zodSchema;
    switch (type) {
        case "string": {
            let stringSchema = z.string();
            // Apply format using .check() with Zod format functions
            if (schema.format) {
                const format = schema.format;
                // Map common formats to Zod check functions
                if (format === "email") {
                    stringSchema = stringSchema.check(z.email());
                }
                else if (format === "uri" || format === "uri-reference") {
                    stringSchema = stringSchema.check(z.url());
                }
                else if (format === "uuid" || format === "guid") {
                    stringSchema = stringSchema.check(z.uuid());
                }
                else if (format === "date-time") {
                    stringSchema = stringSchema.check(z.iso.datetime());
                }
                else if (format === "date") {
                    stringSchema = stringSchema.check(z.iso.date());
                }
                else if (format === "time") {
                    stringSchema = stringSchema.check(z.iso.time());
                }
                else if (format === "duration") {
                    stringSchema = stringSchema.check(z.iso.duration());
                }
                else if (format === "ipv4") {
                    stringSchema = stringSchema.check(z.ipv4());
                }
                else if (format === "ipv6") {
                    stringSchema = stringSchema.check(z.ipv6());
                }
                else if (format === "mac") {
                    stringSchema = stringSchema.check(z.mac());
                }
                else if (format === "cidr") {
                    stringSchema = stringSchema.check(z.cidrv4());
                }
                else if (format === "cidr-v6") {
                    stringSchema = stringSchema.check(z.cidrv6());
                }
                else if (format === "base64") {
                    stringSchema = stringSchema.check(z.base64());
                }
                else if (format === "base64url") {
                    stringSchema = stringSchema.check(z.base64url());
                }
                else if (format === "e164") {
                    stringSchema = stringSchema.check(z.e164());
                }
                else if (format === "jwt") {
                    stringSchema = stringSchema.check(z.jwt());
                }
                else if (format === "emoji") {
                    stringSchema = stringSchema.check(z.emoji());
                }
                else if (format === "nanoid") {
                    stringSchema = stringSchema.check(z.nanoid());
                }
                else if (format === "cuid") {
                    stringSchema = stringSchema.check(z.cuid());
                }
                else if (format === "cuid2") {
                    stringSchema = stringSchema.check(z.cuid2());
                }
                else if (format === "ulid") {
                    stringSchema = stringSchema.check(z.ulid());
                }
                else if (format === "xid") {
                    stringSchema = stringSchema.check(z.xid());
                }
                else if (format === "ksuid") {
                    stringSchema = stringSchema.check(z.ksuid());
                }
                // Note: json-string format is not currently supported by Zod
                // Custom formats are ignored - keep as plain string
            }
            // Apply constraints
            if (typeof schema.minLength === "number") {
                stringSchema = stringSchema.min(schema.minLength);
            }
            if (typeof schema.maxLength === "number") {
                stringSchema = stringSchema.max(schema.maxLength);
            }
            if (schema.pattern) {
                // JSON Schema patterns are not implicitly anchored (match anywhere in string)
                stringSchema = stringSchema.regex(new RegExp(schema.pattern));
            }
            zodSchema = stringSchema;
            break;
        }
        case "number":
        case "integer": {
            let numberSchema = type === "integer" ? z.number().int() : z.number();
            // Apply constraints
            if (typeof schema.minimum === "number") {
                numberSchema = numberSchema.min(schema.minimum);
            }
            if (typeof schema.maximum === "number") {
                numberSchema = numberSchema.max(schema.maximum);
            }
            if (typeof schema.exclusiveMinimum === "number") {
                numberSchema = numberSchema.gt(schema.exclusiveMinimum);
            }
            else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") {
                numberSchema = numberSchema.gt(schema.minimum);
            }
            if (typeof schema.exclusiveMaximum === "number") {
                numberSchema = numberSchema.lt(schema.exclusiveMaximum);
            }
            else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") {
                numberSchema = numberSchema.lt(schema.maximum);
            }
            if (typeof schema.multipleOf === "number") {
                numberSchema = numberSchema.multipleOf(schema.multipleOf);
            }
            zodSchema = numberSchema;
            break;
        }
        case "boolean": {
            zodSchema = z.boolean();
            break;
        }
        case "null": {
            zodSchema = z.null();
            break;
        }
        case "object": {
            const shape = {};
            const properties = schema.properties || {};
            const requiredSet = new Set(schema.required || []);
            // Convert properties - mark optional ones
            for (const [key, propSchema] of Object.entries(properties)) {
                const propZodSchema = convertSchema(propSchema, ctx);
                // If not in required array, make it optional
                shape[key] = requiredSet.has(key) ? propZodSchema : propZodSchema.optional();
            }
            // Handle propertyNames
            if (schema.propertyNames) {
                const keySchema = convertSchema(schema.propertyNames, ctx);
                const valueSchema = schema.additionalProperties && typeof schema.additionalProperties === "object"
                    ? convertSchema(schema.additionalProperties, ctx)
                    : z.any();
                // Case A: No properties (pure record)
                if (Object.keys(shape).length === 0) {
                    zodSchema = z.record(keySchema, valueSchema);
                    break;
                }
                // Case B: With properties (intersection of object and looseRecord)
                const objectSchema = z.object(shape).passthrough();
                const recordSchema = z.looseRecord(keySchema, valueSchema);
                zodSchema = z.intersection(objectSchema, recordSchema);
                break;
            }
            // Handle patternProperties
            if (schema.patternProperties) {
                // patternProperties: keys matching pattern must satisfy corresponding schema
                // Use loose records so non-matching keys pass through
                const patternProps = schema.patternProperties;
                const patternKeys = Object.keys(patternProps);
                const looseRecords = [];
                for (const pattern of patternKeys) {
                    const patternValue = convertSchema(patternProps[pattern], ctx);
                    const keySchema = z.string().regex(new RegExp(pattern));
                    looseRecords.push(z.looseRecord(keySchema, patternValue));
                }
                // Build intersection: object schema + all pattern property records
                const schemasToIntersect = [];
                if (Object.keys(shape).length > 0) {
                    // Use passthrough so patternProperties can validate additional keys
                    schemasToIntersect.push(z.object(shape).passthrough());
                }
                schemasToIntersect.push(...looseRecords);
                if (schemasToIntersect.length === 0) {
                    zodSchema = z.object({}).passthrough();
                }
                else if (schemasToIntersect.length === 1) {
                    zodSchema = schemasToIntersect[0];
                }
                else {
                    // Chain intersections: (A & B) & C & D ...
                    let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
                    for (let i = 2; i < schemasToIntersect.length; i++) {
                        result = z.intersection(result, schemasToIntersect[i]);
                    }
                    zodSchema = result;
                }
                break;
            }
            // Handle additionalProperties
            // In JSON Schema, additionalProperties defaults to true (allow any extra properties)
            // In Zod, objects strip unknown keys by default, so we need to handle this explicitly
            const objectSchema = z.object(shape);
            if (schema.additionalProperties === false) {
                // Strict mode - no extra properties allowed
                zodSchema = objectSchema.strict();
            }
            else if (typeof schema.additionalProperties === "object") {
                // Extra properties must match the specified schema
                zodSchema = objectSchema.catchall(convertSchema(schema.additionalProperties, ctx));
            }
            else {
                // additionalProperties is true or undefined - allow any extra properties (passthrough)
                zodSchema = objectSchema.passthrough();
            }
            break;
        }
        case "array": {
            // TODO: uniqueItems is not supported
            // TODO: contains/minContains/maxContains are not supported
            // Check if this is a tuple (prefixItems or items as array)
            const prefixItems = schema.prefixItems;
            const items = schema.items;
            if (prefixItems && Array.isArray(prefixItems)) {
                // Tuple with prefixItems (draft-2020-12)
                const tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
                const rest = items && typeof items === "object" && !Array.isArray(items)
                    ? convertSchema(items, ctx)
                    : undefined;
                if (rest) {
                    zodSchema = z.tuple(tupleItems).rest(rest);
                }
                else {
                    zodSchema = z.tuple(tupleItems);
                }
                // Apply minItems/maxItems constraints to tuples
                if (typeof schema.minItems === "number") {
                    zodSchema = zodSchema.check(z.minLength(schema.minItems));
                }
                if (typeof schema.maxItems === "number") {
                    zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
                }
            }
            else if (Array.isArray(items)) {
                // Tuple with items array (draft-7)
                const tupleItems = items.map((item) => convertSchema(item, ctx));
                const rest = schema.additionalItems && typeof schema.additionalItems === "object"
                    ? convertSchema(schema.additionalItems, ctx)
                    : undefined; // additionalItems: false means no rest, handled by default tuple behavior
                if (rest) {
                    zodSchema = z.tuple(tupleItems).rest(rest);
                }
                else {
                    zodSchema = z.tuple(tupleItems);
                }
                // Apply minItems/maxItems constraints to tuples
                if (typeof schema.minItems === "number") {
                    zodSchema = zodSchema.check(z.minLength(schema.minItems));
                }
                if (typeof schema.maxItems === "number") {
                    zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
                }
            }
            else if (items !== undefined) {
                // Regular array
                const element = convertSchema(items, ctx);
                let arraySchema = z.array(element);
                // Apply constraints
                if (typeof schema.minItems === "number") {
                    arraySchema = arraySchema.min(schema.minItems);
                }
                if (typeof schema.maxItems === "number") {
                    arraySchema = arraySchema.max(schema.maxItems);
                }
                zodSchema = arraySchema;
            }
            else {
                // No items specified - array of any
                zodSchema = z.array(z.any());
            }
            break;
        }
        default:
            throw new Error(`Unsupported type: ${type}`);
    }
    // Apply metadata
    if (schema.description) {
        zodSchema = zodSchema.describe(schema.description);
    }
    if (schema.default !== undefined) {
        zodSchema = zodSchema.default(schema.default);
    }
    return zodSchema;
}
function convertSchema(schema, ctx) {
    if (typeof schema === "boolean") {
        return schema ? z.any() : z.never();
    }
    // Convert base schema first (ignoring composition keywords)
    let baseSchema = convertBaseSchema(schema, ctx);
    const hasExplicitType = schema.type || schema.enum !== undefined || schema.const !== undefined;
    // Process composition keywords LAST (they can appear together)
    // Handle anyOf - wrap base schema with union
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
        const options = schema.anyOf.map((s) => convertSchema(s, ctx));
        const anyOfUnion = z.union(options);
        baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
    }
    // Handle oneOf - exclusive union (exactly one must match)
    if (schema.oneOf && Array.isArray(schema.oneOf)) {
        const options = schema.oneOf.map((s) => convertSchema(s, ctx));
        const oneOfUnion = z.xor(options);
        baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
    }
    // Handle allOf - wrap base schema with intersection
    if (schema.allOf && Array.isArray(schema.allOf)) {
        if (schema.allOf.length === 0) {
            baseSchema = hasExplicitType ? baseSchema : z.any();
        }
        else {
            let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
            const startIdx = hasExplicitType ? 0 : 1;
            for (let i = startIdx; i < schema.allOf.length; i++) {
                result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
            }
            baseSchema = result;
        }
    }
    // Handle nullable (OpenAPI 3.0)
    if (schema.nullable === true && ctx.version === "openapi-3.0") {
        baseSchema = z.nullable(baseSchema);
    }
    // Handle readOnly
    if (schema.readOnly === true) {
        baseSchema = z.readonly(baseSchema);
    }
    // Collect metadata: core schema keywords and unrecognized keys
    const extraMeta = {};
    // Core schema keywords that should be captured as metadata
    const coreMetadataKeys = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
    for (const key of coreMetadataKeys) {
        if (key in schema) {
            extraMeta[key] = schema[key];
        }
    }
    // Content keywords - store as metadata
    const contentMetadataKeys = ["contentEncoding", "contentMediaType", "contentSchema"];
    for (const key of contentMetadataKeys) {
        if (key in schema) {
            extraMeta[key] = schema[key];
        }
    }
    // Unrecognized keys (custom metadata)
    for (const key of Object.keys(schema)) {
        if (!RECOGNIZED_KEYS.has(key)) {
            extraMeta[key] = schema[key];
        }
    }
    if (Object.keys(extraMeta).length > 0) {
        ctx.registry.add(baseSchema, extraMeta);
    }
    return baseSchema;
}
/**
 * Converts a JSON Schema to a Zod schema. This function should be considered semi-experimental. It's behavior is liable to change. */
function fromJSONSchema(schema, params) {
    // Handle boolean schemas
    if (typeof schema === "boolean") {
        return schema ? z.any() : z.never();
    }
    const version = detectVersion(schema, params?.defaultTarget);
    const defs = (schema.$defs || schema.definitions || {});
    const ctx = {
        version,
        defs,
        refs: new Map(),
        processing: new Set(),
        rootSchema: schema,
        registry: params?.registry ?? globalRegistry,
    };
    return convertSchema(schema, ctx);
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/coerce.js


function coerce_string(params) {
    return core._coercedString(schemas.ZodString, params);
}
function coerce_number(params) {
    return core._coercedNumber(schemas.ZodNumber, params);
}
function coerce_boolean(params) {
    return core._coercedBoolean(schemas.ZodBoolean, params);
}
function coerce_bigint(params) {
    return core._coercedBigint(schemas.ZodBigInt, params);
}
function coerce_date(params) {
    return core._coercedDate(schemas.ZodDate, params);
}

;// CONCATENATED MODULE: ./node_modules/zod/v4/classic/external.js






// zod-specified


config(en());




// iso
// must be exported from top-level
// https://github.com/colinhacks/zod/issues/4491




;// CONCATENATED MODULE: ./src/repair/types.ts

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------
const repairConfidenceValues = ["high", "medium", "low"];
const repairAuditWeightValues = (/* unused pure expression or super */ null && (["normal", "elevated", "critical"]));
const repairVerdictValues = (/* unused pure expression or super */ null && (["pass", "requires_review", "requires_scope_expansion", "requires_replan", "fail"]));
const repairAuditGateValues = ["bug_intake", "repair_plan", "post_repair"];
const repairAuditDecisionValues = [
    "accept_report",
    "reject_report",
    "needs_more_evidence",
    "mark_duplicate",
    "convert_to_backlog",
    "approve_repair_plan",
    "restrict_scope",
    "expand_review_scope",
    "add_must_preserve",
    "add_forbidden_area",
    "require_manual_repair",
    "approve_repair",
    "request_revert",
    "request_scope_expansion",
    "keep_for_human_review",
    "close_as_invalid",
];
// ---------------------------------------------------------------------------
// Bug reports
// ---------------------------------------------------------------------------
const bugEvidenceSchema = object({
    kind: schemas_enum(["failing_test", "code_observation", "stack_trace", "user_reference"]),
    path: schemas_string().optional(),
    test_name: schemas_string().optional(),
    summary: schemas_string().optional(),
    excerpt: schemas_string().optional(),
});
const suspectedFileSchema = object({
    path: schemas_string(),
    confidence: schemas_enum(repairConfidenceValues),
    reason: schemas_string(),
});
const agentBugReportSchema = object({
    schema_version: literal("agent_bug_report@0.1.0"),
    report_id: schemas_string(),
    reported_by: object({
        agent: schemas_string(),
        session_id: schemas_string().optional(),
    }),
    summary: schemas_string().min(1),
    observed_behavior: schemas_string().min(1),
    expected_behavior: schemas_string().min(1),
    evidence: array(bugEvidenceSchema),
    suspected_files: array(suspectedFileSchema),
    agent_hypothesis: schemas_string().optional(),
    requested_action: literal("repair_analysis"),
});
const userBugReportSchema = object({
    schema_version: literal("user_bug_report@0.1.0"),
    report_id: schemas_string(),
    reported_by: object({
        operator_id: schemas_string().default("user"),
    }),
    summary: schemas_string().min(1),
    observed_behavior: schemas_string().optional(),
    expected_behavior: schemas_string().optional(),
    evidence: array(bugEvidenceSchema),
    suspected_files: array(suspectedFileSchema),
    must_preserve: array(schemas_string()).default([]),
    requested_action: literal("repair_analysis"),
});
// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------
const BUG_FINDING_V1_LIMITATION = "BugFinding v1 validates report structure and references; it does not prove the bug is real.";
const REPAIR_RELATION_GRAPH_V1_LIMITATION = "Repair relation graph v1 is an evidence-based candidate graph, not a complete dependency graph or call graph.";
// ---------------------------------------------------------------------------
// Human audit + log
// ---------------------------------------------------------------------------
const humanAuditDecisionSchema = object({
    schema_version: literal("human_audit_decision@0.1.0"),
    decision_id: schemas_string(),
    repair_id: schemas_string(),
    target_revision: schemas_number().int().min(1),
    gate: schemas_enum(repairAuditGateValues),
    decision: schemas_enum(repairAuditDecisionValues),
    operator_id: schemas_string(),
    reason: schemas_string().min(1),
    changes_to_scope: object({
        add_review: array(schemas_string()).default([]),
        add_forbid: array(schemas_string()).default([]),
    }).default({ add_review: [], add_forbid: [] }),
    added_must_preserve: array(schemas_string()).default([]),
    created_at: schemas_string(),
});
// ---------------------------------------------------------------------------
// Synthetic diff (P28.2 Dogfood)
// ---------------------------------------------------------------------------
const syntheticRepairDiffSchema = object({
    schema_version: literal("synthetic_repair_diff@0.1.0"),
    changed_files: array(object({
        path: schemas_string()
            .min(1)
            .refine(p => !p.startsWith("/"), "Path must be repo-relative (no leading slash)")
            .refine(p => !/^[A-Za-z]:[\\/]/.test(p), "Path must not be a Windows drive path")
            .refine(p => !p.includes(".."), "Path must not contain '..'"),
        change_kind: schemas_enum(["added", "modified", "deleted", "renamed"]),
    })),
});

;// CONCATENATED MODULE: ./src/repair/repairUtils.ts




function deterministicId(prefix, payload) {
    const hash = (0,external_node_crypto_namespaceObject.createHash)("sha1")
        .update(JSON.stringify(payload))
        .digest("hex")
        .slice(0, 12);
    return `${prefix}_${hash}`;
}
function normalizeRepairPath(path) {
    try {
        return normalizeRepoRelativePath(path);
    }
    catch {
        return null;
    }
}
function pathExistsInRepo(repoRoot, repoPath) {
    const normalized = normalizeRepairPath(repoPath);
    if (!normalized)
        return false;
    return (0,external_node_fs_.existsSync)((0,external_node_path_.join)(repoRoot, normalized));
}
function readJsonFile(path) {
    return JSON.parse((0,external_node_fs_.readFileSync)(path, "utf-8"));
}
function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
const globRegexCache = new Map();
function globToRegex(glob) {
    const cached = globRegexCache.get(glob);
    if (cached)
        return cached;
    const regex = glob
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "___DOUBLESTAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/___DOUBLESTAR___/g, ".*");
    const compiled = new RegExp(`^${regex}$`);
    // Cap cache size to avoid unbounded growth from dynamic patterns
    if (globRegexCache.size < 2000) {
        globRegexCache.set(glob, compiled);
    }
    return compiled;
}
function matchesPattern(path, pattern) {
    return globToRegex(pattern).test(path);
}

;// CONCATENATED MODULE: ./src/repair/agentBugReportValidator.ts



function loadRepairSourceReport(path) {
    const parsed = JSON.parse((0,external_node_fs_.readFileSync)(path, "utf-8"));
    return parseRepairSourceReport(parsed);
}
function parseRepairSourceReport(value) {
    const asAgent = agentBugReportSchema.safeParse(value);
    if (asAgent.success)
        return asAgent.data;
    const asUser = userBugReportSchema.safeParse(value);
    if (asUser.success)
        return asUser.data;
    throw buildSchemaError(asAgent.error, asUser.error);
}
function validateRepairSourceReport(report, repoRoot) {
    const confirmedFacts = [];
    const unverifiedClaims = [];
    const invalidReferences = [];
    const validPathReferences = new Set();
    let validEvidenceCount = 0;
    for (const evidence of report.evidence) {
        if (evidence.path) {
            const normalized = normalizeRepairPath(evidence.path);
            if (!normalized || !pathExistsInRepo(repoRoot, normalized)) {
                invalidReferences.push(evidence.path);
                continue;
            }
            validPathReferences.add(normalized);
            confirmedFacts.push(`${normalized} exists`);
        }
        validEvidenceCount++;
        if (evidence.kind === "failing_test" && evidence.path) {
            unverifiedClaims.push(`Reported failing test: ${evidence.path}${evidence.test_name ? ` (${evidence.test_name})` : ""}`);
        }
        if (evidence.kind === "code_observation" && evidence.summary) {
            unverifiedClaims.push(evidence.summary);
        }
        if (evidence.kind === "stack_trace" && evidence.excerpt) {
            unverifiedClaims.push(`Stack trace excerpt: ${evidence.excerpt}`);
        }
    }
    for (const suspect of report.suspected_files) {
        const normalized = normalizeRepairPath(suspect.path);
        if (!normalized || !pathExistsInRepo(repoRoot, normalized)) {
            invalidReferences.push(suspect.path);
            continue;
        }
        validPathReferences.add(normalized);
        confirmedFacts.push(`${normalized} exists`);
    }
    if ("agent_hypothesis" in report && report.agent_hypothesis) {
        unverifiedClaims.push(report.agent_hypothesis);
    }
    if (report.observed_behavior)
        unverifiedClaims.push(report.observed_behavior);
    if (report.expected_behavior)
        unverifiedClaims.push(report.expected_behavior);
    const uniqueFacts = [...new Set(confirmedFacts)].sort();
    const uniqueClaims = [...new Set(unverifiedClaims)].filter(Boolean);
    const uniqueInvalid = [...new Set(invalidReferences)].sort();
    const status = deriveFindingStatus(report, validEvidenceCount, validPathReferences.size, uniqueInvalid.length);
    const evidenceQuality = deriveEvidenceQuality(validEvidenceCount, validPathReferences.size, uniqueInvalid.length);
    return {
        report,
        status,
        confirmedFacts: uniqueFacts,
        unverifiedClaims: uniqueClaims,
        invalidReferences: uniqueInvalid,
        evidenceQuality,
    };
}
function deriveFindingStatus(report, validEvidenceCount, validPathCount, invalidReferenceCount) {
    if (report.evidence.length === 0 && report.suspected_files.length === 0) {
        return "rejected";
    }
    if (report.suspected_files.length > 0 && validPathCount > 0) {
        return "accepted";
    }
    if (validEvidenceCount === 0 && validPathCount === 0) {
        return invalidReferenceCount > 0 ? "needs_more_evidence" : "rejected";
    }
    if (validEvidenceCount === 0 && validPathCount > 0) {
        return "needs_more_evidence";
    }
    return "accepted";
}
function deriveEvidenceQuality(validEvidenceCount, validPathCount, invalidReferenceCount) {
    if (validEvidenceCount >= 2 && validPathCount >= 1 && invalidReferenceCount === 0) {
        return "high";
    }
    if (validEvidenceCount >= 1 || validPathCount >= 1) {
        return "medium";
    }
    return "low";
}
function buildSchemaError(agentError, userError) {
    const details = [
        ...(agentError?.issues.map(issue => `agent: ${issue.path.join(".") || "(root)"} ${issue.message}`) ?? []),
        ...(userError?.issues.map(issue => `user: ${issue.path.join(".") || "(root)"} ${issue.message}`) ?? []),
    ];
    return new Error(`Invalid bug report schema.\n${details.join("\n")}`);
}

;// CONCATENATED MODULE: ./src/repair/bugFindingBuilder.ts


function buildBugFinding(input) {
    return {
        schema_version: "bug_finding@0.1.0",
        finding_id: deterministicId("finding", {
            report_id: input.report.report_id,
            status: input.status,
            confirmed: input.confirmedFacts,
            invalid: input.invalidReferences,
        }),
        source_report_id: input.report.report_id,
        status: input.status,
        limitation: BUG_FINDING_V1_LIMITATION,
        confirmed_facts: input.confirmedFacts,
        unverified_claims: input.unverifiedClaims,
        invalid_references: input.invalidReferences,
        evidence_quality: input.evidenceQuality,
        next_action: input.status === "accepted" ? "repair_analysis" : input.status === "needs_more_evidence" ? "await_more_evidence" : "none",
    };
}
function buildUserBugReport(input) {
    return {
        schema_version: "user_bug_report@0.1.0",
        report_id: deterministicId("user_bug_report", {
            intent: input.intent,
            suspectPaths: input.suspectPaths,
            failingTests: input.failingTests,
        }),
        reported_by: {
            operator_id: input.operatorId ?? "user",
        },
        summary: input.intent,
        observed_behavior: input.intent,
        expected_behavior: "The reported issue should be fixed without introducing new regressions.",
        evidence: input.failingTests.map(path => ({
            kind: "failing_test",
            path,
        })),
        suspected_files: input.suspectPaths.map(path => ({
            path,
            confidence: "high",
            reason: "Explicitly identified by the user as suspect repair surface.",
        })),
        must_preserve: [...input.mustPreserve],
        requested_action: "repair_analysis",
    };
}
function getReportKind(report) {
    return report.schema_version === "agent_bug_report@0.1.0" ? "agent_bug_report" : "user_bug_report";
}

;// CONCATENATED MODULE: ./src/repair/suspectSurfaceBuilder.ts

function buildSuspectSurface(input) {
    const fileSet = new Set(input.observations.observations.files.map(file => file.path));
    const byPath = new Map();
    for (const suspect of input.report.suspected_files) {
        if (!fileSet.has(suspect.path))
            continue;
        byPath.set(suspect.path, {
            path: suspect.path,
            confidence: suspect.confidence,
            reason: suspect.reason,
            evidence: ["explicit_suspect_file"],
        });
    }
    for (const evidence of input.report.evidence) {
        if (!evidence.path || !fileSet.has(evidence.path))
            continue;
        if (evidence.kind === "code_observation" || evidence.kind === "user_reference") {
            upsertSurface(byPath, {
                path: evidence.path,
                confidence: "medium",
                reason: evidence.summary ?? "Explicit file reference in bug report evidence.",
                evidence: [evidence.kind],
            });
        }
        if (evidence.kind === "failing_test") {
            const mappedSources = input.observations.observations.test_mappings
                .filter(mapping => mapping.test_path === evidence.path)
                .map(mapping => mapping.source_path);
            for (const sourcePath of uniqueSorted(mappedSources)) {
                upsertSurface(byPath, {
                    path: sourcePath,
                    confidence: "medium",
                    reason: `Mapped from failing test ${evidence.path}.`,
                    evidence: ["test_mapping"],
                });
            }
        }
    }
    if (byPath.size === 0) {
        for (const fact of input.finding.confirmed_facts) {
            const match = fact.match(/^(.+?) exists$/);
            if (!match)
                continue;
            const path = match[1];
            if (!fileSet.has(path))
                continue;
            upsertSurface(byPath, {
                path,
                confidence: "low",
                reason: "Confirmed path reference included in bug report.",
                evidence: ["confirmed_path_reference"],
            });
        }
    }
    return {
        files: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)),
        reason: "Derived from explicit suspect files, confirmed path references, and failing-test mappings.",
    };
}
function upsertSurface(target, item) {
    const existing = target.get(item.path);
    if (!existing) {
        target.set(item.path, item);
        return;
    }
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    const confidence = confidenceOrder[item.confidence] > confidenceOrder[existing.confidence]
        ? item.confidence
        : existing.confidence;
    const reason = existing.reason === item.reason ? existing.reason : `${existing.reason}; ${item.reason}`;
    const evidence = [...new Set([...existing.evidence, ...item.evidence])];
    target.set(item.path, {
        path: item.path,
        confidence,
        reason,
        evidence,
    });
}

;// CONCATENATED MODULE: ./src/repair/repairRelationGraphBuilder.ts


function buildRepairRelationGraph(input) {
    const startTime = Date.now();
    const edges = [];
    const truncationEntries = [];
    const observedFiles = input.observations.observations.files.map(file => file.path);
    const sameDirMap = buildSameDirectoryIndex(observedFiles);
    let patternsEvaluated = 0;
    // -- Suspect edges --
    for (const suspect of input.suspectSurface.files) {
        edges.push({
            from: suspect.path,
            to: suspect.path,
            relation: input.report.schema_version === "user_bug_report@0.1.0" ? "explicit_user_reference" : "suspect",
            confidence: suspect.confidence,
            reason: suspect.reason,
            evidence: suspect.evidence,
        });
    }
    // -- Test mapping edges --
    for (const evidence of input.report.evidence) {
        if (evidence.kind !== "failing_test" || !evidence.path)
            continue;
        const mappings = input.observations.observations.test_mappings
            .filter(mapping => mapping.test_path === evidence.path);
        for (const mapping of mappings) {
            edges.push({
                from: evidence.path,
                to: mapping.source_path,
                relation: "test_mapping",
                confidence: mapping.confidence === "high" ? "high" : "medium",
                reason: `Deterministic test mapping from ${evidence.path} to ${mapping.source_path}.`,
                evidence: mapping.evidence.map(item => `${item.type}:${item.value}`),
            });
        }
    }
    // -- Same package edges (capped at 8 per suspect) --
    for (const suspect of input.suspectSurface.files) {
        const directory = toDirectoryPrefix(suspect.path);
        const siblings = sameDirMap.get(directory) ?? [];
        const totalSiblings = siblings.filter(s => s !== suspect.path).length;
        const displayed = siblings.slice(0, 8);
        let displayedCount = 0;
        for (const candidate of displayed) {
            if (candidate === suspect.path)
                continue;
            edges.push({
                from: suspect.path,
                to: candidate,
                relation: "same_package",
                confidence: "medium",
                reason: `Same package or directory as suspect file ${suspect.path}.`,
                evidence: [`same_directory:${directory}`],
            });
            displayedCount++;
        }
        if (totalSiblings > displayedCount) {
            truncationEntries.push({
                relation: "same_package",
                pattern: directory,
                total_matches: totalSiblings,
                displayed_edges: displayedCount,
                truncated: true,
                omitted_count: totalSiblings - displayedCount,
            });
        }
    }
    // -- Risk preset edges (capped per suggestion and per suspect) --
    if (input.pythonSidecar) {
        const suggestions = [
            ...input.pythonSidecar.risk_preset_validation.suggested_review.map(entry => ({ ...entry, relation: "risk_preset" })),
            ...input.pythonSidecar.risk_preset_validation.suggested_forbidden.map(entry => ({ ...entry, relation: "risk_preset" })),
        ];
        for (const suspect of input.suspectSurface.files) {
            let suspectRiskEdgeCount = 0;
            for (const suggestion of suggestions) {
                let suggestionEdgeCount = 0;
                let suggestionTotalMatches = 0;
                patternsEvaluated++;
                for (const path of observedFiles) {
                    if (!matchesPattern(path, suggestion.pattern) || path === suspect.path)
                        continue;
                    suggestionTotalMatches++;
                    if (suggestionEdgeCount < 50 && suspectRiskEdgeCount < 200) {
                        edges.push({
                            from: suspect.path,
                            to: path,
                            relation: suggestion.relation,
                            confidence: suggestion.severity === "critical" ? "medium" : "low",
                            reason: suggestion.reason,
                            evidence: suggestion.evidence,
                        });
                        suggestionEdgeCount++;
                        suspectRiskEdgeCount++;
                    }
                }
                if (suggestionTotalMatches > suggestionEdgeCount) {
                    truncationEntries.push({
                        relation: "risk_preset",
                        pattern: suggestion.pattern,
                        total_matches: suggestionTotalMatches,
                        displayed_edges: suggestionEdgeCount,
                        truncated: true,
                        omitted_count: suggestionTotalMatches - suggestionEdgeCount,
                    });
                }
            }
        }
    }
    const rawEdgeCount = edges.length;
    const dedupedEdges = dedupeEdges(edges);
    const durationMs = Date.now() - startTime;
    const stats = {
        observed_files: observedFiles.length,
        patterns_evaluated: patternsEvaluated,
        edges_generated: rawEdgeCount,
        edges_after_dedup: dedupedEdges.length,
        truncation_entries: truncationEntries,
        limitation: REPAIR_RELATION_GRAPH_V1_LIMITATION,
        duration_ms: durationMs,
    };
    return { edges: dedupedEdges, stats };
}
function buildSameDirectoryIndex(paths) {
    const map = new Map();
    for (const path of paths) {
        const dir = toDirectoryPrefix(path);
        map.set(dir, [...(map.get(dir) ?? []), path].sort((a, b) => a.localeCompare(b)));
    }
    return map;
}
function toDirectoryPrefix(path) {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? "" : path.slice(0, idx);
}
function dedupeEdges(edges) {
    const seen = new Map();
    for (const edge of edges) {
        const key = `${edge.from}|${edge.to}|${edge.relation}`;
        if (!seen.has(key)) {
            seen.set(key, edge);
        }
    }
    return [...seen.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.relation.localeCompare(b.relation));
}

;// CONCATENATED MODULE: ./src/repair/impactSurfaceBuilder.ts

function buildImpactSurface(input) {
    const directFiles = [...input.suspectSurface.files];
    const directSet = new Set(directFiles.map(file => file.path));
    const relatedFiles = new Map();
    const relatedTests = new Map();
    const riskAreas = [];
    const unknowns = [];
    for (const edge of input.relationGraph) {
        if (edge.from === edge.to && edge.relation === "suspect")
            continue;
        if (edge.to.endsWith(".test.ts") || edge.to.includes("/test/") || edge.to.includes("/tests/")) {
            relatedTests.set(edge.to, {
                path: edge.to,
                confidence: edge.confidence,
                reason: edge.reason,
                evidence: edge.evidence,
            });
            continue;
        }
        if (!directSet.has(edge.to)) {
            relatedFiles.set(edge.to, {
                path: edge.to,
                confidence: edge.confidence,
                reason: edge.reason,
                evidence: edge.evidence,
            });
        }
    }
    for (const evidence of input.report.evidence) {
        if (evidence.kind === "failing_test" && evidence.path) {
            relatedTests.set(evidence.path, {
                path: evidence.path,
                confidence: "high",
                reason: "Explicit failing test supplied in bug report.",
                evidence: ["bug_report:failing_test"],
            });
        }
    }
    for (const direct of directFiles) {
        const repoMappings = input.observations.observations.test_mappings
            .filter(mapping => mapping.source_path === direct.path);
        for (const mapping of repoMappings) {
            relatedTests.set(mapping.test_path, {
                path: mapping.test_path,
                confidence: mapping.confidence === "high" ? "high" : "medium",
                reason: `Observed related test for ${direct.path}.`,
                evidence: mapping.evidence.map(item => `${item.type}:${item.value}`),
            });
        }
    }
    if (input.pythonSidecar) {
        for (const mapping of input.pythonSidecar.test_mappings) {
            if (!directSet.has(mapping.source_path))
                continue;
            for (const testPath of mapping.existing_test_paths) {
                relatedTests.set(testPath, {
                    path: testPath,
                    confidence: mapping.confidence === "high" ? "high" : "medium",
                    reason: `Python test mapping for ${mapping.source_path}.`,
                    evidence: [`python_test_mapping:${mapping.confidence}`],
                });
            }
        }
    }
    for (const sensitivePath of input.observations.observations.sensitive_paths) {
        if (!matchesAnyImpactPath(sensitivePath.path, directFiles, relatedFiles))
            continue;
        riskAreas.push({
            label: formatSensitiveReason(sensitivePath.reason),
            pattern: sensitivePath.path,
            bucket: sensitiveReasonToBucket(sensitivePath.reason),
            severity: sensitiveReasonToSeverity(sensitivePath.reason),
            source: "repo_sensitive_path",
            reason: `Observed sensitive path: ${sensitivePath.reason}.`,
            evidence: sensitivePath.evidence.map(item => `${item.type}:${item.value}`),
            matched_paths: [sensitivePath.path],
        });
    }
    if (input.pythonSidecar) {
        for (const zone of input.pythonSidecar.sensitive_zones) {
            const matchedPaths = zone.matched_paths.filter(path => matchesAnyImpactPath(path, directFiles, relatedFiles));
            if (matchedPaths.length === 0)
                continue;
            riskAreas.push({
                label: zone.category,
                pattern: zone.path_pattern,
                bucket: "review_required",
                severity: zone.severity,
                source: "python_sensitive_zone",
                reason: `Python sensitive zone ${zone.category}.`,
                evidence: zone.evidence,
                matched_paths: matchedPaths,
            });
        }
        for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_review) {
            const matchedPaths = uniqueSorted(input.observations.observations.files
                .map(file => file.path)
                .filter(path => matchesPattern(path, suggestion.pattern))
                .filter(path => matchesAnyImpactPath(path, directFiles, relatedFiles)));
            if (matchedPaths.length === 0)
                continue;
            riskAreas.push({
                label: input.pythonSidecar.risk_preset_validation.preset,
                pattern: suggestion.pattern,
                bucket: "review_required",
                severity: suggestion.severity,
                source: "risk_preset",
                reason: suggestion.reason,
                evidence: suggestion.evidence,
                matched_paths: matchedPaths,
            });
        }
        for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_forbidden) {
            const matchedPaths = uniqueSorted(input.observations.observations.files
                .map(file => file.path)
                .filter(path => matchesPattern(path, suggestion.pattern))
                .filter(path => matchesAnyImpactPath(path, directFiles, relatedFiles)));
            if (matchedPaths.length === 0)
                continue;
            riskAreas.push({
                label: input.pythonSidecar.risk_preset_validation.preset,
                pattern: suggestion.pattern,
                bucket: "forbidden",
                severity: suggestion.severity,
                source: "risk_preset",
                reason: suggestion.reason,
                evidence: suggestion.evidence,
                matched_paths: matchedPaths,
            });
        }
    }
    if (relatedTests.size === 0) {
        unknowns.push({
            kind: "missing_test_mapping",
            note: "No related tests could be mapped from the provided failing tests or suspect files.",
            evidence: ["repair:test_mapping_missing"],
        });
    }
    if (input.finding.invalid_references.length > 0) {
        unknowns.push({
            kind: "invalid_reference",
            note: "One or more references in the bug report could not be validated inside the repo.",
            evidence: input.finding.invalid_references,
        });
    }
    if (relatedFiles.size === 0) {
        unknowns.push({
            kind: "unknown_related_surface",
            note: "No additional related files were found beyond the direct suspect surface.",
            evidence: ["repair:no_related_files"],
        });
    }
    if (input.finding.unverified_claims.length > 0) {
        unknowns.push({
            kind: "unverified_bug_claim",
            note: "The report includes unverified bug claims or hypotheses that must not be treated as confirmed facts.",
            evidence: input.finding.unverified_claims,
        });
    }
    return {
        evidence_level: "bootstrap_conservative",
        direct_files: directFiles,
        related_files: [...relatedFiles.values()].sort((a, b) => a.path.localeCompare(b.path)),
        related_tests: [...relatedTests.values()].sort((a, b) => a.path.localeCompare(b.path)),
        risk_areas: dedupeRiskAreas(riskAreas),
        unknowns,
    };
}
function matchesAnyImpactPath(candidatePath, directFiles, relatedFiles) {
    const relatedPaths = new Set([...directFiles.map(file => file.path), ...relatedFiles.keys()]);
    if (relatedPaths.has(candidatePath))
        return true;
    for (const relatedPath of relatedPaths) {
        const prefix = impactSurfaceBuilder_toDirectoryPrefix(relatedPath);
        if (prefix && candidatePath.startsWith(`${prefix}/`))
            return true;
    }
    return false;
}
function dedupeRiskAreas(input) {
    const seen = new Map();
    for (const area of input) {
        const key = `${area.pattern}|${area.bucket}|${area.source}`;
        if (!seen.has(key))
            seen.set(key, area);
    }
    return [...seen.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}
function impactSurfaceBuilder_toDirectoryPrefix(path) {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? "" : path.slice(0, idx);
}
function sensitiveReasonToSeverity(reason) {
    switch (reason) {
        case "secret_keyword":
        case "migration_keyword":
            return "critical";
        case "payment_keyword":
        case "auth_keyword":
            return "high";
        default:
            return "medium";
    }
}
function sensitiveReasonToBucket(reason) {
    switch (reason) {
        case "secret_keyword":
        case "migration_keyword":
            return "forbidden";
        default:
            return "review_required";
    }
}
function formatSensitiveReason(reason) {
    return reason.replace(/_/g, " ");
}

;// CONCATENATED MODULE: ./src/repair/repairScopeBuilder.ts

function buildRepairScope(input) {
    const filesByPath = new Map(input.observations.observations.files.map(file => [file.path, file]));
    const allowed = new Map();
    const review = new Map();
    const forbidden = new Map();
    for (const pattern of [...input.protectedPatterns, ".pantheon/**", ".cursor/**", ".git/**"]) {
        forbidden.set(pattern, {
            pattern,
            source: "default_policy",
            confidence: "high",
            audit_weight: "critical",
            reason: "Pantheon protected path.",
            evidence: ["repair:default_protected"],
        });
    }
    for (const file of input.suspectSurface.files) {
        allowed.set(file.path, {
            pattern: file.path,
            source: "suspect_surface",
            confidence: file.confidence,
            audit_weight: "normal",
            reason: file.reason,
            evidence: file.evidence,
        });
    }
    for (const testFile of input.impactSurface.related_tests) {
        allowed.set(testFile.path, {
            pattern: testFile.path,
            source: "impact_candidate",
            confidence: testFile.confidence,
            audit_weight: "elevated",
            reason: testFile.reason,
            evidence: testFile.evidence,
        });
    }
    for (const relatedFile of input.impactSurface.related_files) {
        const observed = filesByPath.get(relatedFile.path);
        const target = classifyRelatedFileEntry(relatedFile.path, relatedFile.reason, observed);
        const entry = {
            pattern: relatedFile.path,
            source: target.bucket === "allowed" ? "impact_candidate" : "project_role",
            confidence: relatedFile.confidence,
            audit_weight: target.auditWeight,
            reason: relatedFile.reason,
            evidence: relatedFile.evidence,
        };
        if (target.bucket === "allowed") {
            allowed.set(relatedFile.path, entry);
        }
        else if (target.bucket === "review_required") {
            review.set(relatedFile.path, entry);
        }
        else {
            forbidden.set(relatedFile.path, entry);
        }
    }
    for (const riskArea of input.impactSurface.risk_areas) {
        const entry = {
            pattern: riskArea.pattern,
            source: riskArea.source === "risk_preset" ? "risk_preset" : "project_role",
            confidence: riskArea.severity === "critical" ? "high" : "medium",
            audit_weight: riskArea.bucket === "forbidden" ? "critical" : riskArea.severity === "critical" ? "critical" : "elevated",
            reason: riskArea.reason,
            evidence: riskArea.evidence,
        };
        if (riskArea.bucket === "forbidden") {
            forbidden.set(riskArea.pattern, entry);
        }
        else {
            review.set(riskArea.pattern, entry);
        }
    }
    if (input.pythonSidecar) {
        for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_review) {
            if (!review.has(suggestion.pattern) && !forbidden.has(suggestion.pattern)) {
                review.set(suggestion.pattern, {
                    pattern: suggestion.pattern,
                    source: "risk_preset",
                    confidence: input.pythonSidecar.risk_preset_validation.confidence,
                    audit_weight: suggestion.severity === "critical" ? "critical" : "elevated",
                    reason: suggestion.reason,
                    evidence: suggestion.evidence,
                });
            }
        }
        for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_forbidden) {
            forbidden.set(suggestion.pattern, {
                pattern: suggestion.pattern,
                source: "risk_preset",
                confidence: input.pythonSidecar.risk_preset_validation.confidence,
                audit_weight: "critical",
                reason: suggestion.reason,
                evidence: suggestion.evidence,
            });
        }
    }
    // Precedence: forbidden > review > allowed
    const forbidPatterns = [...forbidden.keys()];
    const reviewPatterns = [...review.keys()];
    for (const pattern of [...allowed.keys()]) {
        if (forbidPatterns.some(forbid => matchesPattern(pattern, forbid)) ||
            reviewPatterns.some(reviewPattern => matchesPattern(pattern, reviewPattern))) {
            allowed.delete(pattern);
        }
    }
    for (const pattern of [...review.keys()]) {
        if (forbidPatterns.some(forbid => matchesPattern(pattern, forbid))) {
            review.delete(pattern);
        }
    }
    return {
        allowed: sortEntries(allowed),
        review_required: sortEntries(review),
        forbidden: sortEntries(forbidden),
    };
}
function classifyRelatedFileEntry(path, reason, observedFile) {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes("migration") || lowerReason.includes("secret")) {
        return { bucket: "forbidden", auditWeight: "critical" };
    }
    if (observedFile?.bucket === "config" || lowerReason.includes("auth") || lowerReason.includes("payment")) {
        return { bucket: "review_required", auditWeight: "critical" };
    }
    if (observedFile?.bucket === "generated" || observedFile?.bucket === "docs") {
        return { bucket: "review_required", auditWeight: "elevated" };
    }
    return { bucket: "allowed", auditWeight: "elevated" };
}
function sortEntries(entries) {
    return [...entries.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}

;// CONCATENATED MODULE: ./src/repair/consistencyChecklistBuilder.ts

function buildConsistencyChecklist(input) {
    const checks = [];
    const profile = deriveRepairProfile(input.observations, input.pythonSidecar, input.impactSurface);
    for (const statement of uniqueSorted(input.userMustPreserve)) {
        checks.push(makeCheck(statement, "user_must_preserve", "hard", ["repair:user_must_preserve"], "Operator-specified hard constraint."));
    }
    if (profile === "sdk_library") {
        checks.push(makeCheck("Do not change exported public API symbols without review.", "project_role", "review", ["project_role:python_sdk_library"], "Library repairs can break downstream consumers through API drift."));
        checks.push(makeCheck("Preserve request/response configuration compatibility when touching client or transport modules.", "project_role", "review", ["project_role:python_sdk_library"], "Client behavior changes can silently break callers."));
    }
    else if (profile === "service_backend") {
        checks.push(makeCheck("Do not bypass authentication or authorization dependencies.", "project_role", "hard", ["project_role:service_backend"], "Service repairs must not weaken request-level security checks."));
        checks.push(makeCheck("Do not change schema or migration behavior without review.", "risk_preset", "review", ["project_role:service_backend"], "Database and migration-adjacent changes require human review."));
    }
    else if (profile === "commerce_backend") {
        checks.push(makeCheck("Do not alter payment, order, or tax behavior outside the intended fix.", "risk_preset", "hard", ["risk_area:commerce_backend"], "Commerce repairs are money-flow adjacent and can create hidden regressions."));
        checks.push(makeCheck("Do not modify migrations automatically.", "risk_preset", "hard", ["risk_area:migration"], "Schema changes require explicit human approval."));
    }
    else {
        checks.push(makeCheck("Keep the repair local to the reported issue and avoid broad unrelated refactors.", "project_role", "advisory", ["project_role:generic_application"], "P28 focuses on conservative, bounded repairs."));
    }
    if (input.testSignals.related.length > 0 || input.testSignals.recommended.length > 0) {
        checks.push(makeCheck("Update or inspect related tests when the repair changes behavior.", "test_signal", "review", [
            ...input.testSignals.related.map(path => `related_test:${path}`),
            ...input.testSignals.recommended.map(path => `recommended_test:${path}`),
        ], "Related tests are the best available deterministic proxy for behavioral impact in bootstrap mode."));
    }
    if (input.impactSurface.unknowns.length > 0) {
        checks.push(makeCheck("Unknown impact surface remains. Keep the repair conservative and escalate if scope expands.", "unknown_surface", "review", input.impactSurface.unknowns.map(item => item.kind), "Pantheon found unresolved impact signals; those must not be silently ignored."));
    }
    return checks;
}
function deriveRepairProfile(observations, pythonSidecar, impactSurface) {
    const preset = pythonSidecar?.risk_preset_validation.preset;
    if (preset === "python_sdk_library")
        return "sdk_library";
    if (preset === "fastapi_service" || preset === "generic_service" || preset === "flask_service") {
        return "service_backend";
    }
    if (preset === "django_commerce")
        return "commerce_backend";
    const sensitiveReasons = new Set(observations.observations.sensitive_paths.map(path => path.reason));
    if (sensitiveReasons.has("payment_keyword"))
        return "commerce_backend";
    if (impactSurface.risk_areas.some(area => area.label.includes("auth") || area.label.includes("security"))) {
        return "service_backend";
    }
    return "generic_application";
}
function makeCheck(statement, source, severity, evidence, reason) {
    return {
        id: deterministicId("check", { statement, source, evidence }),
        statement,
        source,
        severity,
        evidence: [...evidence],
        reason,
    };
}

;// CONCATENATED MODULE: ./src/repair/repairContractBuilder.ts







function buildRepairContract(input) {
    if (input.finding.status !== "accepted") {
        throw new Error("RepairContract can only be generated from an accepted BugFinding.");
    }
    const suspectSurface = buildSuspectSurface({
        report: input.report,
        finding: input.finding,
        observations: input.observations,
    });
    const relationGraphResult = buildRepairRelationGraph({
        report: input.report,
        suspectSurface,
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
    });
    const relationGraph = relationGraphResult.edges;
    const impactSurface = buildImpactSurface({
        report: input.report,
        finding: input.finding,
        suspectSurface,
        relationGraph,
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
    });
    const testSignals = buildRepairTestSignals({
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
        impactSurface,
    });
    const consistencyChecks = buildConsistencyChecklist({
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
        impactSurface,
        testSignals,
        userMustPreserve: input.userMustPreserve,
    });
    const derivedMustPreserve = deriveMustPreserve({
        userMustPreserve: input.userMustPreserve,
        impactSurface,
        pythonSidecar: input.pythonSidecar,
    });
    const repairScope = buildRepairScope({
        suspectSurface,
        impactSurface,
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
        protectedPatterns: input.protectedPatterns,
    });
    return {
        schema_version: "repair_contract@0.1.0",
        repair_id: input.repairId,
        revision: 1,
        source: {
            kind: getReportKind(input.report),
            id: input.report.report_id,
        },
        intent: input.report.summary,
        bug_finding_id: input.finding.finding_id,
        suspect_surface: suspectSurface,
        repair_relation_graph: relationGraph,
        graph_build_stats: relationGraphResult.stats,
        impact_surface: impactSurface,
        repair_scope: repairScope,
        must_preserve: derivedMustPreserve,
        consistency_checks: consistencyChecks,
        test_signals: testSignals,
        repo_state: input.repoState,
        audit_status: "pending_plan_audit",
        source_refs: {
            repo_observations_hash: input.observations.meta.observation_hash,
            repo_label: input.observations.repo.repo_root_label,
            head_commit_hash: input.observations.repo.head_commit_hash,
        },
    };
}
function buildRepairTestSignals(input) {
    const related = uniqueSorted(input.impactSurface.related_tests.map(test => test.path));
    const recommended = uniqueSorted([
        ...input.observations.observations.test_mappings.map(mapping => mapping.test_path),
        ...(input.pythonSidecar?.test_mappings.flatMap(mapping => mapping.existing_test_paths) ?? []),
    ]).filter(path => related.includes(path) === false).slice(0, 12);
    const missingMapping = input.impactSurface.unknowns
        .filter(item => item.kind === "missing_test_mapping")
        .map(item => item.note);
    return {
        related,
        recommended,
        missing_mapping: missingMapping,
    };
}
function deriveMustPreserve(input) {
    const mustPreserve = new Set(input.userMustPreserve);
    if (input.pythonSidecar?.risk_preset_validation.preset === "python_sdk_library") {
        mustPreserve.add("Do not change exported public API symbols without review.");
    }
    if (input.impactSurface.risk_areas.some(area => area.label.includes("payment") || area.label.includes("billing"))) {
        mustPreserve.add("Do not change payment or billing behavior outside the intended fix.");
    }
    if (input.impactSurface.risk_areas.some(area => area.label.includes("auth"))) {
        mustPreserve.add("Do not broaden authentication or permission behavior.");
    }
    return [...mustPreserve].sort((a, b) => a.localeCompare(b));
}

;// CONCATENATED MODULE: ./src/repair/repairTaskRenderer.ts
function renderRepairTaskMarkdown(input) {
    const lines = [];
    const hypothesis = "agent_hypothesis" in input.report ? input.report.agent_hypothesis : undefined;
    lines.push("# Pantheon Repair Task");
    lines.push("");
    lines.push("## Bug");
    lines.push("");
    lines.push(`> ${input.contract.intent}`);
    lines.push("");
    lines.push("## Confirmed facts");
    lines.push("");
    for (const fact of input.finding.confirmed_facts) {
        lines.push(`- ${fact}`);
    }
    if (input.finding.confirmed_facts.length === 0) {
        lines.push("- No confirmed facts were established beyond the report structure.");
    }
    lines.push("");
    if (hypothesis) {
        lines.push("## Agent suspected cause");
        lines.push("");
        lines.push(hypothesis);
        lines.push("");
        lines.push("This is an unverified hypothesis. Do not treat it as confirmed.");
        lines.push("");
    }
    lines.push("## Suspected repair surface");
    lines.push("");
    for (const file of input.contract.suspect_surface.files) {
        lines.push(`- \`${file.path}\` (${file.confidence}) — ${file.reason}`);
    }
    lines.push("");
    lines.push("## Repair relation graph summary");
    lines.push("");
    const graphPreview = input.contract.repair_relation_graph.slice(0, 12);
    for (const edge of graphPreview) {
        lines.push(`- \`${edge.from}\` -> \`${edge.to}\` (${edge.relation}, ${edge.confidence}) — ${edge.reason}`);
    }
    if (input.contract.repair_relation_graph.length > graphPreview.length) {
        lines.push(`- ... ${input.contract.repair_relation_graph.length - graphPreview.length} more relation edges`);
    }
    if (input.contract.graph_build_stats) {
        const stats = input.contract.graph_build_stats;
        const truncated = stats.truncation_entries.filter(t => t.truncated);
        if (truncated.length > 0) {
            lines.push("");
            lines.push("**Truncated areas:**");
            for (const t of truncated.slice(0, 5)) {
                lines.push(`- \`${t.pattern ?? t.relation}\` matched ${t.total_matches} files, showing ${t.displayed_edges}`);
            }
            if (truncated.length > 5) {
                lines.push(`- ... ${truncated.length - 5} more truncated areas`);
            }
        }
        lines.push("");
        lines.push(`> ${stats.limitation}`);
    }
    lines.push("");
    lines.push("## Allowed changes");
    lines.push("");
    const allowedPreview = input.contract.repair_scope.allowed.slice(0, 25);
    for (const entry of allowedPreview) {
        lines.push(`- \`${entry.pattern}\` — ${entry.reason}`);
    }
    if (input.contract.repair_scope.allowed.length > 25) {
        lines.push(`- ... ${input.contract.repair_scope.allowed.length - 25} more allowed entries`);
    }
    lines.push("");
    lines.push("## Review-required changes");
    lines.push("");
    if (input.contract.repair_scope.review_required.length === 0) {
        lines.push("- None");
    }
    else {
        for (const entry of input.contract.repair_scope.review_required) {
            lines.push(`- \`${entry.pattern}\` — ${entry.reason}`);
        }
    }
    lines.push("");
    lines.push("## Forbidden changes");
    lines.push("");
    const forbiddenPreview = input.contract.repair_scope.forbidden.slice(0, 25);
    for (const entry of forbiddenPreview) {
        lines.push(`- \`${entry.pattern}\` — ${entry.reason}`);
    }
    if (input.contract.repair_scope.forbidden.length > 25) {
        lines.push(`- ... ${input.contract.repair_scope.forbidden.length - 25} more forbidden entries`);
    }
    lines.push("");
    if (input.contract.must_preserve.length > 0) {
        lines.push("## Must preserve");
        lines.push("");
        for (const statement of input.contract.must_preserve) {
            lines.push(`- ${statement}`);
        }
        lines.push("");
    }
    lines.push("## Consistency checklist");
    lines.push("");
    for (const check of input.contract.consistency_checks) {
        lines.push(`- [${check.severity}] ${check.statement}`);
    }
    lines.push("");
    lines.push("## Test signals");
    lines.push("");
    if (input.contract.test_signals.related.length > 0) {
        lines.push("Related tests:");
        for (const path of input.contract.test_signals.related) {
            lines.push(`- \`${path}\``);
        }
    }
    if (input.contract.test_signals.recommended.length > 0) {
        lines.push("");
        lines.push("Recommended tests:");
        for (const path of input.contract.test_signals.recommended) {
            lines.push(`- \`${path}\``);
        }
    }
    if (input.contract.test_signals.missing_mapping.length > 0) {
        lines.push("");
        lines.push("Missing mapping warnings:");
        for (const item of input.contract.test_signals.missing_mapping) {
            lines.push(`- ${item}`);
        }
    }
    lines.push("");
    lines.push("## If you need to go outside scope");
    lines.push("");
    lines.push("Request scope expansion. Do not silently modify unrelated or forbidden files.");
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("_Auto-generated by Pantheon. Do not edit._");
    lines.push("");
    return lines.join("\n");
}
function renderRepairScopeMarkdown(contract) {
    const lines = [];
    lines.push("# Repair Scope");
    lines.push("");
    lines.push(`**Repair ID:** \`${contract.repair_id}\``);
    lines.push(`**Audit status:** \`${contract.audit_status}\``);
    lines.push("");
    lines.push("## Allowed");
    lines.push("");
    for (const entry of contract.repair_scope.allowed) {
        lines.push(`- \`${entry.pattern}\` (${entry.audit_weight}) — ${entry.reason}`);
    }
    lines.push("");
    lines.push("## Review required");
    lines.push("");
    if (contract.repair_scope.review_required.length === 0) {
        lines.push("- None");
    }
    else {
        for (const entry of contract.repair_scope.review_required) {
            lines.push(`- \`${entry.pattern}\` (${entry.audit_weight}) — ${entry.reason}`);
        }
    }
    lines.push("");
    lines.push("## Forbidden");
    lines.push("");
    for (const entry of contract.repair_scope.forbidden) {
        lines.push(`- \`${entry.pattern}\` (${entry.audit_weight}) — ${entry.reason}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("_Auto-generated by Pantheon. Do not edit._");
    lines.push("");
    return lines.join("\n");
}
function renderConsistencyChecklistMarkdown(contract) {
    const lines = [];
    lines.push("# Consistency Checklist");
    lines.push("");
    for (const check of contract.consistency_checks) {
        lines.push(`## ${check.statement}`);
        lines.push("");
        lines.push(`- **Severity:** ${check.severity}`);
        lines.push(`- **Source:** ${check.source}`);
        lines.push(`- **Reason:** ${check.reason}`);
        if (check.evidence.length > 0) {
            lines.push(`- **Evidence:** ${check.evidence.join(", ")}`);
        }
        lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push("_Auto-generated by Pantheon. Do not edit._");
    lines.push("");
    return lines.join("\n");
}

;// CONCATENATED MODULE: ./src/repair/humanAuditDecisionWriter.ts




function buildHumanAuditDecision(input) {
    const createdAt = new Date().toISOString();
    return humanAuditDecisionSchema.parse({
        schema_version: "human_audit_decision@0.1.0",
        decision_id: deterministicId("audit", {
            repairId: input.repairId,
            gate: input.gate,
            decision: input.decision,
            reason: input.reason,
            createdAt,
        }),
        repair_id: input.repairId,
        target_revision: input.targetRevision,
        gate: input.gate,
        decision: input.decision,
        operator_id: input.operatorId,
        reason: input.reason,
        changes_to_scope: {
            add_review: [...(input.addReview ?? [])],
            add_forbid: [...(input.addForbid ?? [])],
        },
        added_must_preserve: [...(input.addMustPreserve ?? [])],
        created_at: createdAt,
    });
}
function writeHumanAuditDecision(repoRoot, decision) {
    const target = repairArtifactLayout_repairRunPaths(repoRoot, decision.repair_id).humanAuditDecision(decision.decision_id);
    (0,external_node_fs_.writeFileSync)(target, JSON.stringify(decision, null, 2));
    return target;
}

;// CONCATENATED MODULE: ./src/repair/repairPlanRevisioner.ts

function applyHumanAuditDecision(contract, decision) {
    if (decision.repair_id !== contract.repair_id) {
        throw new Error(`Audit decision ${decision.decision_id} does not match repair ${contract.repair_id}.`);
    }
    if (decision.target_revision !== contract.revision) {
        throw new Error(`stale_audit_decision: decision targets revision ${decision.target_revision}, but current revision is ${contract.revision}.`);
    }
    const review = new Map(contract.repair_scope.review_required.map(entry => [entry.pattern, entry]));
    const forbid = new Map(contract.repair_scope.forbidden.map(entry => [entry.pattern, entry]));
    const allow = new Map(contract.repair_scope.allowed.map(entry => [entry.pattern, entry]));
    const mustPreserve = new Set(contract.must_preserve);
    for (const pattern of decision.changes_to_scope.add_review) {
        review.set(pattern, buildHumanScopeEntry(pattern, "review"));
    }
    for (const pattern of decision.changes_to_scope.add_forbid) {
        forbid.set(pattern, buildHumanScopeEntry(pattern, "forbid"));
    }
    for (const statement of decision.added_must_preserve) {
        mustPreserve.add(statement);
    }
    for (const pattern of [...forbid.keys()]) {
        for (const allowPattern of [...allow.keys()]) {
            if (matchesPattern(allowPattern, pattern) || matchesPattern(pattern, allowPattern)) {
                allow.delete(allowPattern);
            }
        }
        for (const reviewPattern of [...review.keys()]) {
            if (matchesPattern(reviewPattern, pattern) || matchesPattern(pattern, reviewPattern)) {
                review.delete(reviewPattern);
            }
        }
    }
    for (const pattern of [...review.keys()]) {
        for (const allowPattern of [...allow.keys()]) {
            if (matchesPattern(allowPattern, pattern) || matchesPattern(pattern, allowPattern)) {
                allow.delete(allowPattern);
            }
        }
    }
    const auditStatus = deriveAuditStatus(contract.audit_status, decision);
    return {
        ...contract,
        revision: contract.revision + 1,
        audit_status: auditStatus,
        repair_scope: {
            allowed: [...allow.values()].sort((a, b) => a.pattern.localeCompare(b.pattern)),
            review_required: [...review.values()].sort((a, b) => a.pattern.localeCompare(b.pattern)),
            forbidden: [...forbid.values()].sort((a, b) => a.pattern.localeCompare(b.pattern)),
        },
        must_preserve: uniqueSorted([...mustPreserve]),
        consistency_checks: decision.added_must_preserve.length > 0
            ? [
                ...contract.consistency_checks,
                ...decision.added_must_preserve.map(statement => ({
                    id: `human_audit_${contract.revision + 1}_${statement.length}`,
                    statement,
                    source: "human_audit_decision",
                    severity: "hard",
                    evidence: [`decision:${decision.decision_id}`],
                    reason: "Added by human audit decision.",
                })),
            ]
            : contract.consistency_checks,
    };
}
function buildHumanScopeEntry(pattern, target) {
    return {
        pattern,
        source: "human_audit_decision",
        confidence: "high",
        audit_weight: "critical",
        reason: target === "forbid"
            ? "Forbidden by human audit decision."
            : "Review-required by human audit decision.",
        evidence: ["human_audit_decision"],
    };
}
function deriveAuditStatus(previous, decision) {
    switch (decision.decision) {
        case "approve_repair_plan":
            return "approved_repair_plan";
        case "restrict_scope":
        case "expand_review_scope":
        case "add_must_preserve":
        case "add_forbidden_area":
            return "approved_with_modifications";
        case "require_manual_repair":
            return "manual_repair_required";
        case "approve_repair":
        case "request_revert":
        case "request_scope_expansion":
        case "keep_for_human_review":
        case "close_as_invalid":
            return "post_repair_reviewed";
        default:
            return previous;
    }
}

;// CONCATENATED MODULE: ./src/repair/repairVerifier.ts

function verifyRepairDiff(input) {
    const findings = [];
    let allowed = 0;
    let reviewRequired = 0;
    let forbidden = 0;
    let outsideScope = 0;
    for (const changed of input.diff.changed_files) {
        const path = changed.path;
        const forbiddenEntry = matchScopeEntry(path, input.contract.repair_scope.forbidden);
        if (forbiddenEntry) {
            forbidden++;
            findings.push({
                kind: "forbidden_file",
                severity: "blocking",
                file: path,
                message: `Forbidden repair change: ${path}`,
                allowed_actions: ["revert_file", "request_scope_expansion"],
                requires_human: true,
                bucket: "forbidden",
                evidence: forbiddenEntry.evidence,
            });
            continue;
        }
        const reviewEntry = matchScopeEntry(path, input.contract.repair_scope.review_required);
        if (reviewEntry) {
            reviewRequired++;
            findings.push({
                kind: "review_required_file",
                severity: "review_required",
                file: path,
                message: `Repair touches review-required file: ${path}`,
                allowed_actions: ["keep_for_human_review"],
                requires_human: true,
                bucket: "review_required",
                evidence: reviewEntry.evidence,
            });
            continue;
        }
        const allowedEntry = matchScopeEntry(path, input.contract.repair_scope.allowed);
        if (allowedEntry) {
            allowed++;
            continue;
        }
        outsideScope++;
        findings.push({
            kind: "outside_scope_file",
            severity: "blocking",
            file: path,
            message: `Repair change is outside the approved scope: ${path}`,
            allowed_actions: ["revert_file", "request_scope_expansion"],
            requires_human: true,
            bucket: "outside_scope",
            evidence: ["repair_scope:outside"],
        });
    }
    const changedPaths = input.diff.changed_files.map(file => file.path);
    const touchedAnyRelatedTest = input.contract.test_signals.related.some(path => changedPaths.includes(path));
    if (input.contract.test_signals.related.length > 0 && !touchedAnyRelatedTest) {
        findings.push({
            kind: "missing_related_test_signal",
            severity: "warning",
            message: "No related test file was included in the repair diff.",
            allowed_actions: ["add_or_run_related_test", "keep_for_human_review"],
            requires_human: false,
            evidence: input.contract.test_signals.related.map(path => `related_test:${path}`),
        });
    }
    const verdict = deriveRepairVerdictFromFindings(findings);
    const check = {
        schema_version: "repair_check.v1",
        repair_id: input.contract.repair_id,
        verdict,
        generated_at: new Date().toISOString(),
        summary: {
            changed_files: input.diff.changed_files.length,
            allowed,
            review_required: reviewRequired,
            forbidden,
            outside_scope: outsideScope,
            warnings: findings.filter(finding => finding.severity === "warning").length,
        },
        findings,
        concurrent_findings: [],
        changed_files: changedPaths,
        audit_status: input.contract.audit_status,
    };
    return {
        check,
        feedback: buildRepairFeedbackFromCheck(check),
    };
}
function deriveRepairVerdictFromFindings(findings) {
    if (findings.some(finding => finding.kind === "forbidden_file")) {
        return "fail";
    }
    if (findings.some(finding => finding.kind === "stale_repair_contract")) {
        return "requires_replan";
    }
    if (findings.some(finding => finding.kind === "outside_scope_file")) {
        return "requires_scope_expansion";
    }
    if (findings.some(finding => finding.severity === "review_required" || finding.severity === "requires_human_audit")) {
        return "requires_review";
    }
    return "pass";
}
function buildRepairFeedbackFromCheck(check) {
    const actions = check.findings.flatMap(finding => finding.allowed_actions.map(action => ({
        action,
        file: finding.file,
        message: finding.message,
    })));
    return {
        schema_version: "repair_feedback.v1",
        feedback_id: `repair_feedback_${check.repair_id}`,
        repair_id: check.repair_id,
        verdict: check.verdict,
        generated_at: new Date().toISOString(),
        actions,
        requires_human: check.findings.some(finding => finding.requires_human),
        notes: check.findings.map(finding => finding.message),
    };
}
function matchScopeEntry(path, entries) {
    return entries.find(entry => matchesPattern(path, entry.pattern));
}

;// CONCATENATED MODULE: ./src/repair/repairFeedbackRenderer.ts
function renderRepairFeedbackMarkdown(feedback) {
    const lines = [];
    lines.push("# Repair Feedback");
    lines.push("");
    lines.push(`**Verdict:** \`${feedback.verdict}\``);
    lines.push("");
    if (feedback.actions.length === 0) {
        lines.push("No repair boundary issues were found.");
        lines.push("");
    }
    else {
        lines.push("## Actions");
        lines.push("");
        for (const action of feedback.actions) {
            lines.push(`- \`${action.action}\`${action.file ? ` on \`${action.file}\`` : ""} — ${action.message}`);
        }
        lines.push("");
    }
    if (feedback.requires_human) {
        lines.push("> Human review is required before treating this repair as complete.");
        lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push("_Auto-generated by Pantheon. Do not edit._");
    lines.push("");
    return lines.join("\n");
}

;// CONCATENATED MODULE: ./src/repair/repairReportRenderer.ts
function renderRepairReportMarkdown(input) {
    const { report, contract, check } = input;
    const lines = [];
    lines.push("# Repair Report");
    lines.push("");
    lines.push(`**Verdict:** \`${check.verdict}\``);
    lines.push(`**Audit status:** \`${contract.audit_status}\``);
    lines.push(`**Bug source:** \`${contract.source.kind}\``);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("|---|---:|");
    lines.push(`| Changed files | ${check.summary.changed_files} |`);
    lines.push(`| Allowed | ${check.summary.allowed} |`);
    lines.push(`| Review required | ${check.summary.review_required} |`);
    lines.push(`| Forbidden | ${check.summary.forbidden} |`);
    lines.push(`| Outside scope | ${check.summary.outside_scope} |`);
    lines.push(`| Warnings | ${check.summary.warnings} |`);
    lines.push("");
    lines.push("## Confirmed facts");
    lines.push("");
    lines.push(`- Repair intent: ${report.summary}`);
    lines.push(`- Repair scope revision: ${contract.revision}`);
    lines.push("");
    if (check.findings.length > 0) {
        lines.push("## Findings");
        lines.push("");
        for (const finding of check.findings) {
            lines.push(`### ${finding.file ? `\`${finding.file}\`` : finding.kind}`);
            lines.push("");
            lines.push(`- **Severity:** ${finding.severity}`);
            lines.push(`- **Message:** ${finding.message}`);
            lines.push(`- **Allowed actions:** ${finding.allowed_actions.join(", ")}`);
            if (finding.requires_human) {
                lines.push("- **Human review:** required");
            }
            lines.push("");
        }
    }
    lines.push("---");
    lines.push("");
    lines.push("_Auto-generated by Pantheon. Do not edit._");
    lines.push("");
    return lines.join("\n");
}

;// CONCATENATED MODULE: ./src/repair/session/atomicWrite.ts


function atomicWriteText(target, text) {
    (0,external_node_fs_.mkdirSync)((0,external_node_path_.dirname)(target), { recursive: true });
    const temp = (0,external_node_path_.join)((0,external_node_path_.dirname)(target), `.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${target.split(/[\\/]/).pop()}.tmp`);
    (0,external_node_fs_.writeFileSync)(temp, text);
    (0,external_node_fs_.renameSync)(temp, target);
}
function atomicWriteJson(target, value) {
    atomicWriteText(target, `${JSON.stringify(value, null, 2)}\n`);
}

;// CONCATENATED MODULE: ./src/repair/session/repairSessionIndex.ts
function createEmptyRepairSessionIndex() {
    return {
        schema_version: "repair_session_index@0.1.0",
        active_repairs: [],
        closed_repairs: [],
    };
}
function upsertRepairSessionInIndex(index, session) {
    const isClosed = session.status === "closed" || session.status === "abandoned";
    const active = index.active_repairs.filter(item => item.repair_id !== session.repair_id);
    const closed = index.closed_repairs.filter(item => item.repair_id !== session.repair_id);
    if (isClosed) {
        closed.push(session);
    }
    else {
        active.push(session);
    }
    return {
        schema_version: "repair_session_index@0.1.0",
        active_repairs: active.sort((a, b) => a.created_at.localeCompare(b.created_at)),
        closed_repairs: closed.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
}

;// CONCATENATED MODULE: ./src/repair/session/repairSessionStore.ts






const LOCK_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 25;
function createRepairSession(input) {
    const repoRoot = input.repoRoot;
    ensureRepairDirs(repoRoot);
    const createdAt = new Date().toISOString();
    const repairId = deterministicId("repair", {
        source: input.source,
        agent_id: input.agentId ?? null,
        created_at: createdAt,
        nonce: Math.random().toString(36).slice(2),
    });
    const session = {
        schema_version: "repair_session@0.1.0",
        repair_id: repairId,
        agent_id: input.agentId,
        source: input.source,
        status: input.status,
        current_revision: 0,
        base_sha: null,
        risk_level: "unknown",
        scope_summary: emptyScopeSummary(),
        created_at: createdAt,
        updated_at: createdAt,
    };
    withRepairIndexLock(repoRoot, "create_repair_session", () => {
        const paths = repairArtifactLayout_repairRunPaths(repoRoot, repairId);
        ensureRepairRunDir(paths);
        atomicWriteJson(paths.session, session);
        writeLatestPointer(paths.root, repairId);
        const currentIndex = loadRepairSessionIndex(repoRoot);
        const updatedIndex = upsertRepairSessionInIndex(currentIndex, session);
        atomicWriteJson(paths.root.sessionsIndex, updatedIndex);
    });
    return session;
}
function repairSessionStore_loadRepairSession(repoRoot, repairId) {
    const path = repairArtifactLayout_repairRunPaths(repoRoot, repairId).session;
    if (!(0,external_node_fs_.existsSync)(path)) {
        throw new Error(`Unknown repair session: ${repairId}`);
    }
    return readJsonFile(path);
}
function saveRepairSession(repoRoot, session) {
    withRepairIndexLock(repoRoot, "save_repair_session", () => {
        const paths = repairArtifactLayout_repairRunPaths(repoRoot, session.repair_id);
        ensureRepairRunDir(paths);
        atomicWriteJson(paths.session, session);
        writeLatestPointer(paths.root, session.repair_id);
        const currentIndex = loadRepairSessionIndex(repoRoot);
        const updatedIndex = upsertRepairSessionInIndex(currentIndex, session);
        atomicWriteJson(paths.root.sessionsIndex, updatedIndex);
    });
}
function updateRepairSession(repoRoot, repairId, updater) {
    return withRepairSessionLock(repoRoot, repairId, "update_repair_session", () => {
        const current = repairSessionStore_loadRepairSession(repoRoot, repairId);
        const next = updater(current);
        saveRepairSession(repoRoot, next);
        return next;
    });
}
function repairSessionStore_closeRepairSession(input) {
    return updateRepairSession(input.repoRoot, input.repairId, session => ({
        ...session,
        status: input.status,
        close_reason: input.reason,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));
}
function loadRepairSessionIndex(repoRoot) {
    const paths = repairArtifactLayout_repairRootPaths(repoRoot);
    if (!(0,external_node_fs_.existsSync)(paths.sessionsIndex)) {
        return createEmptyRepairSessionIndex();
    }
    return readJsonFile(paths.sessionsIndex);
}
function repairSessionStore_listRepairSessions(repoRoot) {
    return loadRepairSessionIndex(repoRoot);
}
function repairSessionStore_loadLatestRepairId(repoRoot) {
    const path = repairRootPaths(repoRoot).latestPointer;
    if (!existsSync(path))
        return null;
    const text = readFileSync(path, "utf-8").trim();
    if (!text)
        return null;
    try {
        const parsed = JSON.parse(text);
        return parsed.repair_id ?? null;
    }
    catch {
        return null;
    }
}
function withRepairIndexLock(repoRoot, operation, fn) {
    const lockPath = repairArtifactLayout_repairRootPaths(repoRoot).globalLock;
    return withFileLock(lockPath, { operation }, fn);
}
function withRepairSessionLock(repoRoot, repairId, operation, fn) {
    const lockPath = repairArtifactLayout_repairRunPaths(repoRoot, repairId).lock;
    return withFileLock(lockPath, { operation, repair_id: repairId }, fn);
}
function emptyScopeSummary() {
    return {
        allowed: [],
        review_required: [],
        forbidden: [],
    };
}
function updateSessionFromContract(input) {
    return updateRepairSession(input.repoRoot, input.repairId, session => ({
        ...session,
        status: input.status,
        current_revision: input.revision,
        scope_summary: input.scopeSummary,
        risk_level: input.riskLevel,
        base_sha: input.baseSha ?? null,
        updated_at: new Date().toISOString(),
    }));
}
function ensureRepairRunDir(paths) {
    (0,external_node_fs_.mkdirSync)(paths.dir, { recursive: true });
}
function writeLatestPointer(root, repairId) {
    atomicWriteText(root.latestPointer, `${JSON.stringify({ repair_id: repairId, updated_at: new Date().toISOString() }, null, 2)}\n`);
}
function withFileLock(lockPath, input, fn) {
    const createdAt = new Date().toISOString();
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (true) {
        try {
            (0,external_node_fs_.mkdirSync)((0,external_node_path_.dirname)(lockPath), { recursive: true });
            const fd = (0,external_node_fs_.openSync)(lockPath, "wx");
            try {
                const metadata = {
                    pid: process.pid,
                    created_at: createdAt,
                    operation: input.operation,
                    repair_id: input.repair_id,
                };
                (0,external_node_fs_.writeFileSync)(fd, `${JSON.stringify(metadata, null, 2)}\n`);
            }
            finally {
                (0,external_node_fs_.closeSync)(fd);
            }
            break;
        }
        catch {
            if (Date.now() >= deadline) {
                throw new Error("Another Pantheon repair operation is active. Retry after it completes, or remove a stale lock if no process is running.");
            }
            sleepSync(LOCK_POLL_MS);
        }
    }
    try {
        return fn();
    }
    finally {
        (0,external_node_fs_.rmSync)(lockPath, { force: true });
    }
}
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

;// CONCATENATED MODULE: ./src/repair/session/repoStateSnapshot.ts

function captureRepoStateSnapshot(input) {
    if (input.source === "synthetic") {
        return {
            base_sha: input.diffBase ?? null,
            head_sha: input.diffBase ?? null,
            diff_base: input.diffBase ?? null,
            working_tree_status: "unknown",
            created_at: new Date().toISOString(),
            source: "synthetic",
        };
    }
    try {
        const headSha = (0,external_node_child_process_.execSync)("git rev-parse HEAD", {
            cwd: input.repoRoot,
            encoding: "utf-8",
            timeout: 10_000,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const status = (0,external_node_child_process_.execSync)("git status --porcelain", {
            cwd: input.repoRoot,
            encoding: "utf-8",
            timeout: 10_000,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return {
            base_sha: headSha || null,
            head_sha: headSha || null,
            diff_base: input.diffBase ?? headSha ?? null,
            working_tree_status: status ? "dirty" : "clean",
            created_at: new Date().toISOString(),
            source: input.source ?? "git",
        };
    }
    catch {
        return {
            base_sha: null,
            head_sha: null,
            diff_base: input.diffBase ?? null,
            working_tree_status: "unknown",
            created_at: new Date().toISOString(),
            source: input.source ?? "unknown",
        };
    }
}

;// CONCATENATED MODULE: ./src/repair/session/stalePlanDetector.ts
function detectStaleRepairPlan(input) {
    const findings = [];
    const { contractState, currentState } = input;
    const effectiveCurrentBase = currentState.diff_base ?? currentState.base_sha;
    if (contractState.base_sha &&
        effectiveCurrentBase &&
        contractState.base_sha !== effectiveCurrentBase) {
        findings.push({
            kind: "stale_repair_contract",
            severity: "blocking",
            reason: `Repair contract was generated at ${contractState.base_sha}, but repository base is now ${effectiveCurrentBase}.`,
            recommended_action: "request_replan",
        });
    }
    if (contractState.working_tree_status === "clean" &&
        currentState.working_tree_status === "dirty") {
        findings.push({
            kind: "working_tree_changed",
            severity: "warning",
            reason: "Repair contract was generated on a clean working tree, but the repository is now dirty.",
            recommended_action: "continue",
        });
    }
    return findings;
}

;// CONCATENATED MODULE: ./src/repair/session/activeRepairOverlapDetector.ts

function detectActiveScopePatternOverlaps(input) {
    const findings = [];
    for (const other of input.otherContracts) {
        const overlap = findPatternOverlap(input.contract, other);
        if (!overlap)
            continue;
        findings.push(overlap);
    }
    return findings;
}
function detectActualChangedFileOverlaps(input) {
    const findings = [];
    for (const other of input.otherContracts) {
        const matched = [];
        let bucket;
        for (const file of input.changedFiles) {
            const forbidden = other.repair_scope.forbidden.find(entry => matchesPattern(file, entry.pattern));
            if (forbidden) {
                matched.push(file);
                bucket = "forbidden";
                continue;
            }
            const review = other.repair_scope.review_required.find(entry => matchesPattern(file, entry.pattern));
            if (review) {
                matched.push(file);
                bucket = bucket === "forbidden" ? bucket : "review_required";
                continue;
            }
            const allowed = other.repair_scope.allowed.find(entry => matchesPattern(file, entry.pattern));
            if (allowed) {
                matched.push(file);
                bucket = bucket ?? "allowed";
            }
        }
        if (!bucket || matched.length === 0)
            continue;
        findings.push(buildActualOverlapFinding(input.repairId, other.repair_id, bucket, matched));
    }
    return findings;
}
function findPatternOverlap(contract, other) {
    const currentEntries = [
        ...contract.repair_scope.allowed.map(entry => ({ bucket: "allowed", pattern: entry.pattern })),
        ...contract.repair_scope.review_required.map(entry => ({ bucket: "review_required", pattern: entry.pattern })),
        ...contract.repair_scope.forbidden.map(entry => ({ bucket: "forbidden", pattern: entry.pattern })),
    ];
    const otherEntries = [
        ...other.repair_scope.allowed.map(entry => ({ bucket: "allowed", pattern: entry.pattern })),
        ...other.repair_scope.review_required.map(entry => ({ bucket: "review_required", pattern: entry.pattern })),
        ...other.repair_scope.forbidden.map(entry => ({ bucket: "forbidden", pattern: entry.pattern })),
    ];
    const overlappingPatterns = [];
    let strongestBucket = "allowed";
    for (const current of currentEntries) {
        for (const candidate of otherEntries) {
            if (patternsOverlap(current.pattern, candidate.pattern)) {
                overlappingPatterns.push(current.pattern, candidate.pattern);
                strongestBucket = strongerBucket(strongestBucket, strongerBucket(current.bucket, candidate.bucket));
            }
        }
    }
    if (overlappingPatterns.length === 0) {
        return null;
    }
    return buildPatternOverlapFinding(contract.repair_id, other.repair_id, strongestBucket, uniqueSorted(overlappingPatterns));
}
function buildPatternOverlapFinding(repairId, otherRepairId, bucket, patterns) {
    if (bucket === "forbidden") {
        return {
            kind: "active_scope_pattern_overlap",
            severity: "blocking",
            repair_id: repairId,
            other_repair_id: otherRepairId,
            overlap: { bucket, patterns },
            reason: `This repair overlaps a forbidden scope in active repair ${otherRepairId}.`,
            recommended_action: "request_replan",
        };
    }
    if (bucket === "review_required") {
        return {
            kind: "active_scope_pattern_overlap",
            severity: "requires_human_audit",
            repair_id: repairId,
            other_repair_id: otherRepairId,
            overlap: { bucket, patterns },
            reason: `This repair overlaps a review-required scope in active repair ${otherRepairId}.`,
            recommended_action: "human_review",
        };
    }
    return {
        kind: "active_scope_pattern_overlap",
        severity: "warning",
        repair_id: repairId,
        other_repair_id: otherRepairId,
        overlap: { bucket, patterns },
        reason: `This repair overlaps an allowed scope in active repair ${otherRepairId}.`,
        recommended_action: "continue",
    };
}
function buildActualOverlapFinding(repairId, otherRepairId, bucket, files) {
    if (bucket === "forbidden") {
        return {
            kind: "actual_changed_file_overlap",
            severity: "blocking",
            repair_id: repairId,
            other_repair_id: otherRepairId,
            overlap: { bucket, files },
            reason: `Changed files overlap a forbidden scope in active repair ${otherRepairId}.`,
            recommended_action: "request_replan",
        };
    }
    if (bucket === "review_required") {
        return {
            kind: "actual_changed_file_overlap",
            severity: "requires_human_audit",
            repair_id: repairId,
            other_repair_id: otherRepairId,
            overlap: { bucket, files },
            reason: `Changed files overlap a review-required scope in active repair ${otherRepairId}.`,
            recommended_action: "human_review",
        };
    }
    return {
        kind: "actual_changed_file_overlap",
        severity: "warning",
        repair_id: repairId,
        other_repair_id: otherRepairId,
        overlap: { bucket, files },
        reason: `Changed files overlap an allowed scope in active repair ${otherRepairId}.`,
        recommended_action: "continue",
    };
}
function patternsOverlap(left, right) {
    return matchesPattern(left, right) || matchesPattern(right, left) || left === right;
}
function strongerBucket(left, right) {
    const rank = { allowed: 0, review_required: 1, forbidden: 2 };
    return rank[left] >= rank[right] ? left : right;
}

;// CONCATENATED MODULE: ./src/cli/cmdRepair.ts

























function cmdRepair(args) {
    const subcommand = args[0];
    switch (subcommand) {
        case "intake":
            cmdRepairIntake({
                repoRoot: getFlag(args, "repo") ?? ".",
                fromPath: getFlag(args, "from"),
                intent: getFlag(args, "intent"),
                suspectPaths: getAllFlags(args, "suspect"),
                failingTests: getAllFlags(args, "failing-test"),
                mustPreserve: getAllFlags(args, "must-preserve"),
                agentId: getFlag(args, "agent-id"),
                operatorId: getFlag(args, "operator") ?? "user",
            });
            return;
        case "plan":
            cmdRepairPlan({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                configPath: getFlag(args, "config"),
            });
            return;
        case "audit":
            cmdRepairAudit({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                targetRevision: Number.parseInt(requireFlag(args, "target-revision", "repair audit requires --target-revision <n>."), 10),
                gate: normalizeGate(requireFlag(args, "gate", "repair audit requires --gate <bug_intake|repair_plan|post_repair>.")),
                decision: getFlag(args, "decision") ?? "approve",
                reason: requireFlag(args, "reason", "repair audit requires --reason."),
                operatorId: getFlag(args, "operator") ?? "human",
                addReview: getAllFlags(args, "add-review"),
                addForbid: getAllFlags(args, "add-forbid"),
                addMustPreserve: getAllFlags(args, "add-must-preserve"),
            });
            return;
        case "check":
            cmdRepairCheck({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                baseRef: getFlag(args, "base"),
                diffJsonPath: getFlag(args, "diff-json"),
            });
            return;
        case "list":
            cmdRepairList({
                repoRoot: getFlag(args, "repo") ?? ".",
            });
            return;
        case "status":
            cmdRepairStatus({
                repoRoot: getFlag(args, "repo") ?? ".",
            });
            return;
        case "show":
            cmdRepairShow({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
            });
            return;
        case "close":
            cmdRepairClose({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                reason: requireFlag(args, "reason", "repair close requires --reason."),
            });
            return;
        case "abandon":
            cmdRepairAbandon({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                reason: requireFlag(args, "reason", "repair abandon requires --reason."),
            });
            return;
        default:
            console.error("Usage:");
            console.error("  pantheon repair intake --from agent_bug_report.json [--agent-id claude-code]");
            console.error("  pantheon repair intake --intent \"...\" --suspect path [--failing-test path]");
            console.error("  pantheon repair plan --repair-id repair_abc123 [--config pantheon.alpha.json]");
            console.error("  pantheon repair audit --repair-id repair_abc123 --target-revision 1 --gate repair_plan --decision approve --reason \"...\"");
            console.error("  pantheon repair check --repair-id repair_abc123 [--base HEAD] [--diff-json path/to/synthetic_diff.json]");
            console.error("  pantheon repair list");
            console.error("  pantheon repair status");
            console.error("  pantheon repair show --repair-id repair_abc123");
            console.error("  pantheon repair close --repair-id repair_abc123 --reason \"merged\"");
            console.error("  pantheon repair abandon --repair-id repair_abc123 --reason \"superseded\"");
            process.exit(1);
    }
}
function cmdRepairIntake(input) {
    const repoRoot = (0,external_node_path_.resolve)(input.repoRoot);
    ensureRepairDirs(repoRoot);
    const report = resolveIntakeReport(repoRoot, input);
    const validation = validateRepairSourceReport(report, repoRoot);
    const finding = buildBugFinding(validation);
    const session = createRepairSession({
        repoRoot,
        agentId: input.agentId,
        source: report.schema_version === "agent_bug_report@0.1.0" ? "agent_bug_report" : "user_report",
        status: mapFindingStatusToSessionStatus(finding.status),
    });
    const paths = repairArtifactLayout_repairRunPaths(repoRoot, session.repair_id);
    if (report.schema_version === "agent_bug_report@0.1.0") {
        (0,external_node_fs_.writeFileSync)(paths.agentBugReport, JSON.stringify(report, null, 2));
    }
    else {
        (0,external_node_fs_.writeFileSync)(paths.userBugReport, JSON.stringify(report, null, 2));
    }
    (0,external_node_fs_.writeFileSync)(paths.bugFinding, JSON.stringify(finding, null, 2));
    repairAuditLog_appendRepairAuditEvent(repoRoot, session.repair_id, {
        timestamp: new Date().toISOString(),
        event: report.schema_version === "agent_bug_report@0.1.0" ? "agent_report_submitted" : "user_report_submitted",
        repair_id: session.repair_id,
        report_id: report.report_id,
        detail: report.summary,
    });
    repairAuditLog_appendRepairAuditEvent(repoRoot, session.repair_id, {
        timestamp: new Date().toISOString(),
        event: "bug_report_validated",
        repair_id: session.repair_id,
        report_id: report.report_id,
        finding_id: finding.finding_id,
        detail: finding.status,
    });
    console.log("Pantheon Repair Intake\n");
    console.log(`  Repair session: ${session.repair_id}`);
    console.log(`  Report: ${report.report_id}`);
    console.log(`  Finding: ${finding.status}`);
    console.log(`  Run: pantheon repair plan --repair-id ${session.repair_id}`);
    return session;
}
function cmdRepairPlan(input) {
    const repoRoot = (0,external_node_path_.resolve)(input.repoRoot);
    ensureRepairDirs(repoRoot);
    const session = repairSessionStore_loadRepairSession(repoRoot, input.repairId);
    const paths = repairArtifactLayout_repairRunPaths(repoRoot, input.repairId);
    const report = loadStoredRepairReport(paths);
    const finding = loadBugFinding(paths);
    if (finding.status !== "accepted") {
        throw new Error(`Repair plan requires an accepted BugFinding. Current status: ${finding.status}`);
    }
    const context = loadRepairPlanningContext(repoRoot, input.configPath);
    const repoState = captureRepoStateSnapshot({
        repoRoot,
        diffBase: null,
        source: "git",
    });
    const contract = buildRepairContract({
        repairId: session.repair_id,
        report,
        finding,
        observations: context.observations,
        pythonSidecar: context.pythonSidecar,
        protectedPatterns: context.protectedPatterns,
        userMustPreserve: report.schema_version === "user_bug_report@0.1.0" ? report.must_preserve : [],
        repoState,
    });
    writeRepairPlanArtifacts(repoRoot, report, finding, contract);
    updateSessionFromContract({
        repoRoot,
        repairId: contract.repair_id,
        revision: contract.revision,
        status: "plan_pending_audit",
        scopeSummary: buildScopeSummary(contract),
        riskLevel: deriveRiskLevel(contract),
        baseSha: contract.repo_state.base_sha,
    });
    const overlapFindings = detectActiveScopePatternOverlaps({
        contract,
        otherContracts: loadOtherActiveContracts(repoRoot, contract.repair_id),
    });
    for (const findingItem of overlapFindings) {
        repairAuditLog_appendRepairAuditEvent(repoRoot, contract.repair_id, {
            timestamp: new Date().toISOString(),
            event: "repair_analysis_generated",
            repair_id: contract.repair_id,
            detail: `${findingItem.kind}: ${findingItem.reason}`,
        });
    }
    repairAuditLog_appendRepairAuditEvent(repoRoot, contract.repair_id, {
        timestamp: new Date().toISOString(),
        event: "repair_analysis_generated",
        repair_id: contract.repair_id,
        report_id: report.report_id,
        finding_id: finding.finding_id,
        detail: contract.audit_status,
    });
    repairAuditLog_appendRepairAuditEvent(repoRoot, contract.repair_id, {
        timestamp: new Date().toISOString(),
        event: "repair_task_rendered",
        repair_id: contract.repair_id,
        detail: paths.task,
    });
    console.log("Pantheon Repair Plan\n");
    console.log(`  Repair: ${contract.repair_id}`);
    console.log(`  Revision: ${contract.revision}`);
    console.log(`  Audit status: ${contract.audit_status}`);
    if (overlapFindings.length > 0) {
        console.log(`  Concurrent findings: ${overlapFindings.length}`);
    }
    console.log(`  Output: ${paths.task}`);
}
function cmdRepairAudit(input) {
    const repoRoot = (0,external_node_path_.resolve)(input.repoRoot);
    ensureRepairDirs(repoRoot);
    const paths = repairArtifactLayout_repairRunPaths(repoRoot, input.repairId);
    const session = repairSessionStore_loadRepairSession(repoRoot, input.repairId);
    const decision = buildHumanAuditDecision({
        repairId: input.repairId,
        targetRevision: input.targetRevision,
        gate: input.gate,
        decision: normalizeDecision(input.gate, input.decision),
        operatorId: input.operatorId,
        reason: input.reason,
        addReview: input.addReview,
        addForbid: input.addForbid,
        addMustPreserve: input.addMustPreserve,
    });
    writeHumanAuditDecision(repoRoot, decision);
    if (input.gate === "bug_intake") {
        const finding = loadBugFinding(paths);
        const updatedFinding = applyBugIntakeDecision(finding, decision);
        (0,external_node_fs_.writeFileSync)(paths.bugFinding, JSON.stringify(updatedFinding, null, 2));
        updateRepairSession(repoRoot, input.repairId, current => ({
            ...current,
            status: mapFindingStatusToSessionStatus(updatedFinding.status),
            updated_at: new Date().toISOString(),
        }));
    }
    else {
        const contract = loadCurrentRepairContract(repoRoot, input.repairId);
        try {
            const updatedContract = applyHumanAuditDecision(contract, decision);
            const report = loadStoredRepairReport(paths);
            const finding = loadBugFinding(paths);
            writeRepairPlanArtifacts(repoRoot, report, finding, updatedContract);
            updateSessionFromContract({
                repoRoot,
                repairId: updatedContract.repair_id,
                revision: updatedContract.revision,
                status: mapAuditStatusToSessionStatus(updatedContract.audit_status),
                scopeSummary: buildScopeSummary(updatedContract),
                riskLevel: deriveRiskLevel(updatedContract),
                baseSha: updatedContract.repo_state.base_sha,
            });
        }
        catch (error) {
            repairAuditLog_appendRepairAuditEvent(repoRoot, input.repairId, {
                timestamp: new Date().toISOString(),
                event: input.gate === "post_repair" ? "human_post_repair_decision" : "human_plan_decision",
                repair_id: input.repairId,
                decision_id: decision.decision_id,
                detail: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    repairAuditLog_appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: input.gate === "post_repair" ? "human_post_repair_decision" : input.gate === "repair_plan" ? "human_plan_decision" : "human_intake_decision",
        repair_id: input.repairId,
        decision_id: decision.decision_id,
        detail: `${decision.decision}: ${decision.reason}`,
    });
    console.log("Pantheon Repair Audit\n");
    console.log(`  Repair: ${session.repair_id}`);
    console.log(`  Gate: ${input.gate}`);
    console.log(`  Decision: ${decision.decision}`);
    console.log(`  Output: ${paths.humanAuditDecision(decision.decision_id)}`);
}
function cmdRepairCheck(input) {
    const repoRoot = (0,external_node_path_.resolve)(input.repoRoot);
    const contract = loadCurrentRepairContract(repoRoot, input.repairId);
    const paths = repairArtifactLayout_repairRunPaths(repoRoot, input.repairId);
    const report = loadStoredRepairReport(paths);
    const diff = readRepairDiff({
        repoRoot,
        baseRef: input.baseRef,
        diffJsonPath: input.diffJsonPath,
        changedFilesOverride: input.changedFilesOverride,
    });
    const filteredDiff = {
        ...diff,
        changed_files: diff.changed_files.filter((file) => !file.path.startsWith(".pantheon/repair/")),
    };
    const baseResult = verifyRepairDiff({
        contract,
        diff: filteredDiff,
    });
    const currentRepoState = input.diffJsonPath || input.changedFilesOverride
        ? captureRepoStateSnapshot({
            repoRoot,
            diffBase: contract.repo_state.base_sha,
            source: "synthetic",
        })
        : captureRepoStateSnapshot({
            repoRoot,
            diffBase: input.baseRef,
            source: "git",
        });
    const staleFindings = detectStaleRepairPlan({
        contractState: contract.repo_state,
        currentState: currentRepoState,
    }).map(finding => stalePlanToRepairFinding(finding));
    const overlapFindings = detectActualChangedFileOverlaps({
        repairId: contract.repair_id,
        changedFiles: filteredDiff.changed_files.map(file => file.path),
        otherContracts: loadOtherActiveContracts(repoRoot, contract.repair_id),
    });
    const overlapRepairFindings = overlapFindings.map(finding => concurrentToRepairFinding(finding));
    const findings = [
        ...baseResult.check.findings,
        ...staleFindings,
        ...overlapRepairFindings,
    ];
    const verdict = deriveRepairVerdictFromFindings(findings);
    const finalCheck = {
        ...baseResult.check,
        verdict,
        findings,
        concurrent_findings: [
            ...staleFindings.map(finding => repairFindingToConcurrentFinding(contract.repair_id, finding)),
            ...overlapFindings,
        ],
        summary: {
            ...baseResult.check.summary,
            warnings: findings.filter(finding => finding.severity === "warning").length,
        },
    };
    const feedback = buildRepairFeedbackFromCheck(finalCheck);
    (0,external_node_fs_.writeFileSync)(paths.check, JSON.stringify(finalCheck, null, 2));
    (0,external_node_fs_.writeFileSync)(paths.report, renderRepairReportMarkdown({ report, contract, check: finalCheck }));
    (0,external_node_fs_.writeFileSync)(paths.feedback, renderRepairFeedbackMarkdown(feedback));
    updateSessionFromContract({
        repoRoot,
        repairId: contract.repair_id,
        revision: contract.revision,
        status: mapVerdictToSessionStatus(finalCheck.verdict),
        scopeSummary: buildScopeSummary(contract),
        riskLevel: deriveRiskLevel(contract),
        baseSha: contract.repo_state.base_sha,
    });
    repairAuditLog_appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: "agent_repair_checked",
        repair_id: contract.repair_id,
        detail: finalCheck.verdict,
    });
    console.log("Pantheon Repair Check\n");
    console.log(`  Repair: ${contract.repair_id}`);
    console.log(`  Verdict: ${finalCheck.verdict}`);
    console.log(`  Changed files: ${finalCheck.summary.changed_files}`);
    if (finalCheck.concurrent_findings.length > 0) {
        console.log(`  Concurrent findings: ${finalCheck.concurrent_findings.length}`);
    }
    console.log(`  Output: ${paths.report}`);
}
function cmdRepairList(input) {
    const repoRoot = resolve(input.repoRoot);
    const index = listRepairSessions(repoRoot);
    console.log("Pantheon Repair Sessions\n");
    if (index.active_repairs.length === 0 && index.closed_repairs.length === 0) {
        console.log("  No repair sessions.");
        return;
    }
    for (const session of index.active_repairs) {
        console.log(`  ${session.repair_id}  ${session.status}  rev=${session.current_revision}`);
    }
    for (const session of index.closed_repairs) {
        console.log(`  ${session.repair_id}  ${session.status}  rev=${session.current_revision}`);
    }
}
function cmdRepairStatus(input) {
    const repoRoot = resolve(input.repoRoot);
    const index = listRepairSessions(repoRoot);
    console.log("Active repair sessions:\n");
    if (index.active_repairs.length === 0) {
        console.log("  None");
        return;
    }
    for (const session of index.active_repairs) {
        console.log(`${session.repair_id}`);
        console.log(`  agent: ${session.agent_id ?? "n/a"}`);
        console.log(`  status: ${session.status}`);
        console.log(`  revision: ${session.current_revision}`);
        console.log(`  base_sha: ${session.base_sha ?? "unknown"}`);
        console.log(`  risk: ${session.risk_level}`);
        console.log(`  allowed: ${session.scope_summary.allowed.join(", ") || "-"}`);
        console.log(`  review: ${session.scope_summary.review_required.join(", ") || "-"}`);
        console.log(`  forbidden: ${session.scope_summary.forbidden.join(", ") || "-"}`);
        console.log("");
    }
}
function cmdRepairShow(input) {
    const repoRoot = resolve(input.repoRoot);
    const session = loadRepairSession(repoRoot, input.repairId);
    const paths = repairRunPaths(repoRoot, input.repairId);
    console.log("Pantheon Repair Session\n");
    console.log(`  Repair: ${session.repair_id}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Revision: ${session.current_revision}`);
    console.log(`  Directory: ${paths.dir}`);
    if (existsSync(paths.contractLatest)) {
        console.log(`  Contract: ${paths.contractLatest}`);
    }
}
function cmdRepairClose(input) {
    const repoRoot = resolve(input.repoRoot);
    const session = closeRepairSession({
        repoRoot,
        repairId: input.repairId,
        status: "closed",
        reason: input.reason,
    });
    appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: "repair_closed",
        repair_id: input.repairId,
        detail: input.reason,
    });
    console.log(`Closed repair session ${session.repair_id}.`);
}
function cmdRepairAbandon(input) {
    const repoRoot = resolve(input.repoRoot);
    const session = closeRepairSession({
        repoRoot,
        repairId: input.repairId,
        status: "abandoned",
        reason: input.reason,
    });
    appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: "repair_closed",
        repair_id: input.repairId,
        detail: `abandoned: ${input.reason}`,
    });
    console.log(`Abandoned repair session ${session.repair_id}.`);
}
function resolveIntakeReport(repoRoot, input) {
    if (input.fromPath) {
        return loadRepairSourceReport((0,external_node_path_.resolve)(input.fromPath));
    }
    if (!input.intent) {
        throw new Error("repair intake requires --from <report.json> or --intent <summary>.");
    }
    if ((input.suspectPaths ?? []).length === 0) {
        throw new Error("repair intake requires at least one --suspect path for user-initiated repair.");
    }
    return buildUserBugReport({
        intent: input.intent,
        suspectPaths: input.suspectPaths ?? [],
        failingTests: input.failingTests ?? [],
        mustPreserve: input.mustPreserve ?? [],
        operatorId: input.operatorId ?? "user",
    });
}
function loadRepairPlanningContext(repoRoot, configPath = "pantheon.json") {
    const pantheonConfig = loadPantheonConfig(repoRoot, configPath);
    const repoObsConfig = loadRepoObservationConfig(repoRoot);
    const observations = scanRepo({
        repoRoot,
        config: {
            ...repoObsConfig.config,
            path_roles: {
                ...(repoObsConfig.config.path_roles ?? {}),
                ...Object.fromEntries(Object.entries(pantheonConfig.config.path_roles)
                    .filter(([, value]) => ["src", "test", "config", "generated", "docs", "script", "asset", "unknown"].includes(value))
                    .map(([key, value]) => [key, value])),
            },
        },
    });
    let pythonSidecar = null;
    if (hasPythonSignals(observations.observations.files.map(file => file.path))) {
        pythonSidecar = enhanceWithPythonObservations(observations, repoRoot, pantheonConfig.config.python
            ? {
                project_packages: pantheonConfig.config.python.project_packages,
                sensitive_overrides: pantheonConfig.config.python.sensitive_overrides,
            }
            : undefined);
    }
    return {
        observations,
        pythonSidecar,
        protectedPatterns: pantheonConfig.config.protected,
    };
}
function writeRepairPlanArtifacts(repoRoot, report, finding, contract) {
    const paths = repairArtifactLayout_repairRunPaths(repoRoot, contract.repair_id);
    if (report.schema_version === "agent_bug_report@0.1.0") {
        (0,external_node_fs_.writeFileSync)(paths.agentBugReport, JSON.stringify(report, null, 2));
    }
    else {
        (0,external_node_fs_.writeFileSync)(paths.userBugReport, JSON.stringify(report, null, 2));
    }
    (0,external_node_fs_.writeFileSync)(paths.bugFinding, JSON.stringify(finding, null, 2));
    (0,external_node_fs_.writeFileSync)(paths.contractRevision(contract.revision), JSON.stringify(contract, null, 2));
    (0,external_node_fs_.writeFileSync)(paths.contractLatest, JSON.stringify(contract, null, 2));
    (0,external_node_fs_.writeFileSync)(paths.relationGraph, JSON.stringify(contract.repair_relation_graph, null, 2));
    (0,external_node_fs_.writeFileSync)(paths.task, renderRepairTaskMarkdown({ report, finding, contract }));
    (0,external_node_fs_.writeFileSync)(paths.scope, renderRepairScopeMarkdown(contract));
    (0,external_node_fs_.writeFileSync)(paths.checklist, renderConsistencyChecklistMarkdown(contract));
}
function loadStoredRepairReport(paths) {
    if ((0,external_node_fs_.existsSync)(paths.agentBugReport)) {
        return readJsonFile(paths.agentBugReport);
    }
    if ((0,external_node_fs_.existsSync)(paths.userBugReport)) {
        return readJsonFile(paths.userBugReport);
    }
    throw new Error(`No repair report found for ${paths.repairId}.`);
}
function loadBugFinding(paths) {
    if (!(0,external_node_fs_.existsSync)(paths.bugFinding)) {
        throw new Error(`No bug finding found for ${paths.repairId}.`);
    }
    return readJsonFile(paths.bugFinding);
}
function loadCurrentRepairContract(repoRoot, repairId) {
    const session = repairSessionStore_loadRepairSession(repoRoot, repairId);
    if (session.current_revision < 1) {
        throw new Error(`Repair session ${repairId} has no generated repair plan yet.`);
    }
    const path = repairArtifactLayout_repairRunPaths(repoRoot, repairId).contractRevision(session.current_revision);
    if (!(0,external_node_fs_.existsSync)(path)) {
        throw new Error(`Repair contract revision ${session.current_revision} is missing for ${repairId}.`);
    }
    return readJsonFile(path);
}
function loadOtherActiveContracts(repoRoot, currentRepairId) {
    const index = repairSessionStore_listRepairSessions(repoRoot);
    const contracts = [];
    for (const session of index.active_repairs) {
        if (session.repair_id === currentRepairId || session.current_revision < 1) {
            continue;
        }
        const contractPath = repairArtifactLayout_repairRunPaths(repoRoot, session.repair_id).contractRevision(session.current_revision);
        if ((0,external_node_fs_.existsSync)(contractPath)) {
            contracts.push(readJsonFile(contractPath));
        }
    }
    return contracts;
}
function applyBugIntakeDecision(finding, decision) {
    switch (decision.decision) {
        case "accept_report":
            return { ...finding, status: "accepted", next_action: "repair_analysis" };
        case "reject_report":
            return { ...finding, status: "rejected", next_action: "none" };
        case "needs_more_evidence":
            return { ...finding, status: "needs_more_evidence", next_action: "await_more_evidence" };
        case "mark_duplicate":
            return { ...finding, status: "duplicate", next_action: "none" };
        case "convert_to_backlog":
            return { ...finding, status: "backlog_candidate", next_action: "none" };
        default:
            return finding;
    }
}
function readRepairDiff(input) {
    if (input.diffJsonPath) {
        const rawData = readJsonFile((0,external_node_path_.resolve)(input.diffJsonPath));
        const synthetic = syntheticRepairDiffSchema.parse(rawData);
        return {
            base_ref: "synthetic",
            changed_files: synthetic.changed_files.map(file => ({
                path: file.path,
                status: file.change_kind,
            })),
            warnings: [],
        };
    }
    return readGitDiffSummary({
        repoRoot: input.repoRoot,
        baseRef: input.baseRef ?? "",
        changedFilesOverride: input.changedFilesOverride,
    });
}
function buildScopeSummary(contract) {
    return {
        allowed: contract.repair_scope.allowed.map(entry => entry.pattern),
        review_required: contract.repair_scope.review_required.map(entry => entry.pattern),
        forbidden: contract.repair_scope.forbidden.map(entry => entry.pattern),
    };
}
function deriveRiskLevel(contract) {
    if (contract.repair_scope.forbidden.length > 0
        || contract.impact_surface.risk_areas.some(area => area.severity === "critical")) {
        return "high";
    }
    if (contract.repair_scope.review_required.length > 0
        || contract.impact_surface.unknowns.length > 0) {
        return "medium";
    }
    if (contract.repair_scope.allowed.length > 0) {
        return "low";
    }
    return "unknown";
}
function mapFindingStatusToSessionStatus(status) {
    switch (status) {
        case "accepted":
            return "intake_accepted";
        case "rejected":
            return "intake_rejected";
        default:
            return "intake_created";
    }
}
function mapAuditStatusToSessionStatus(status) {
    switch (status) {
        case "approved_repair_plan":
            return "plan_approved";
        case "approved_with_modifications":
            return "plan_restricted";
        case "manual_repair_required":
            return "manual_repair_required";
        default:
            return "plan_pending_audit";
    }
}
function mapVerdictToSessionStatus(verdict) {
    switch (verdict) {
        case "pass":
            return "repair_checked_pass";
        case "requires_review":
            return "repair_checked_requires_review";
        case "requires_scope_expansion":
            return "repair_checked_requires_scope_expansion";
        case "requires_replan":
            return "repair_checked_requires_replan";
        case "fail":
            return "repair_checked_fail";
    }
}
function stalePlanToRepairFinding(finding) {
    if (finding.kind === "stale_repair_contract") {
        return {
            kind: "stale_repair_contract",
            severity: "blocking",
            message: finding.reason,
            allowed_actions: ["request_replan"],
            requires_human: true,
            evidence: ["repo_state:base_sha_mismatch"],
        };
    }
    return {
        kind: "working_tree_changed",
        severity: "warning",
        message: finding.reason,
        allowed_actions: ["keep_for_human_review"],
        requires_human: false,
        evidence: ["repo_state:working_tree_changed"],
    };
}
function concurrentToRepairFinding(finding) {
    const actions = finding.recommended_action === "request_replan"
        ? ["request_replan"]
        : finding.recommended_action === "human_review"
            ? ["keep_for_human_review"]
            : ["keep_for_human_review"];
    const severity = finding.severity === "blocking"
        ? "blocking"
        : finding.severity === "requires_human_audit"
            ? "requires_human_audit"
            : "warning";
    return {
        kind: finding.kind,
        severity,
        message: finding.reason,
        allowed_actions: actions,
        requires_human: finding.severity === "blocking" || finding.severity === "requires_human_audit",
        bucket: finding.overlap?.bucket,
        other_repair_id: finding.other_repair_id,
        evidence: [
            `repair:${finding.repair_id}`,
            ...(finding.other_repair_id ? [`other_repair:${finding.other_repair_id}`] : []),
        ],
    };
}
function repairFindingToConcurrentFinding(repairId, finding) {
    return {
        kind: finding.kind === "stale_repair_contract" ? "stale_repair_contract" : "working_tree_changed",
        severity: finding.kind === "stale_repair_contract" ? "blocking" : "warning",
        repair_id: repairId,
        reason: finding.message,
        recommended_action: finding.kind === "stale_repair_contract" ? "request_replan" : "continue",
    };
}
function normalizeGate(value) {
    if (value === "intake")
        return "bug_intake";
    if (value === "plan")
        return "repair_plan";
    if (value === "post")
        return "post_repair";
    if (value === "bug_intake" || value === "repair_plan" || value === "post_repair") {
        return value;
    }
    throw new Error(`Unknown repair audit gate: ${value}`);
}
function normalizeDecision(gate, value) {
    const normalized = value.replace(/-/g, "_");
    const aliases = {
        bug_intake: {
            approve: "accept_report",
            accept: "accept_report",
            reject: "reject_report",
            needs_more_evidence: "needs_more_evidence",
            duplicate: "mark_duplicate",
            backlog: "convert_to_backlog",
        },
        repair_plan: {
            approve: "approve_repair_plan",
            restrict_scope: "restrict_scope",
            expand_review_scope: "expand_review_scope",
            add_must_preserve: "add_must_preserve",
            add_forbidden_area: "add_forbidden_area",
            require_manual_repair: "require_manual_repair",
        },
        post_repair: {
            approve: "approve_repair",
            request_revert: "request_revert",
            request_scope_expansion: "request_scope_expansion",
            keep_for_human_review: "keep_for_human_review",
            close_as_invalid: "close_as_invalid",
        },
    };
    return aliases[gate][normalized] ?? normalized;
}
function requireRepairId(args, repoRoot) {
    const explicit = getFlag(args, "repair-id");
    if (explicit)
        return explicit;
    const latest = loadLatestRepairId(resolve(repoRoot));
    const active = listRepairSessions(resolve(repoRoot)).active_repairs.map(session => session.repair_id);
    throw new Error(`repair_id is required for correctness. Active sessions: ${active.join(", ") || "none"}. Latest pointer exists: ${latest ?? "no"}.`);
}
function getFlag(args, name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1])
        return args[idx + 1];
    return undefined;
}
function getAllFlags(args, name) {
    const values = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === `--${name}` && args[i + 1]) {
            values.push(args[i + 1]);
            i++;
        }
    }
    return values;
}
function requireFlag(args, name, message) {
    const value = getFlag(args, name);
    if (!value)
        throw new Error(message);
    return value;
}

// EXTERNAL MODULE: ./src/github/githubCommentClient.ts
var githubCommentClient = __nccwpck_require__(379);
;// CONCATENATED MODULE: ./src/github/githubRepairCommentRenderer.ts

const COMMENT_MARKER = "<!-- pantheon-repair-gate-v0 -->";
function renderGitHubRepairComment(result) {
    const lines = [];
    const contract = result.contract;
    const check = result.check;
    const hypothesis = "agent_hypothesis" in result.report ? result.report.agent_hypothesis : undefined;
    lines.push(COMMENT_MARKER);
    lines.push("# Pantheon Repair Gate");
    lines.push("");
    lines.push("## Verdict");
    lines.push("");
    lines.push(`\`${result.verdict}\``);
    lines.push("");
    if (result.verdict !== "pass") {
        lines.push("## Required action");
        lines.push("");
        lines.push("This PR cannot be accepted under the current repair contract.");
        lines.push("");
        lines.push("Why:");
        let reasonCount = 1;
        if (check?.concurrent_findings.some(f => f.kind === "stale_repair_contract")) {
            lines.push(`${reasonCount++}. The repair contract is stale because the PR base changed after the plan was created.`);
        }
        const outsideFiles = check?.findings.filter(f => f.kind === "outside_scope_file") ?? [];
        if (outsideFiles.length > 0) {
            if (outsideFiles.length === 1) {
                lines.push(`${reasonCount++}. \`${outsideFiles[0].file}\` is outside the approved repair scope.`);
            }
            else {
                lines.push(`${reasonCount++}. ${outsideFiles.length} files are outside the approved repair scope (e.g. \`${outsideFiles[0].file}\`).`);
            }
        }
        const forbiddenFiles = check?.findings.filter(f => f.kind === "forbidden_file") ?? [];
        if (forbiddenFiles.length > 0) {
            lines.push(`${reasonCount++}. Modified files that are forbidden by the repair scope.`);
        }
        if (result.runPhase === "intake_pending_audit" || result.runPhase === "plan_pending_audit") {
            lines.push(`${reasonCount++}. The repair plan requires human audit approval.`);
        }
        if (reasonCount === 1) {
            lines.push("1. The repair governance checks failed.");
        }
        lines.push("");
        lines.push("Next:");
        const nextSteps = buildNextSteps(result);
        for (const step of nextSteps) {
            lines.push(`- ${step}`);
        }
        lines.push("");
    }
    else {
        lines.push("Pantheon checked whether this PR stayed inside the approved repair scope.");
        lines.push("");
    }
    lines.push("## Repair session");
    lines.push("");
    lines.push(`- Repair ID: \`${result.repairId}\``);
    lines.push(`- Source: \`${result.sourceKind}\``);
    lines.push(`- Audit status: \`${contract?.audit_status ?? result.session.status}\``);
    if (contract) {
        lines.push(`- Contract revision: \`v${contract.revision}\``);
        lines.push(`- Evidence level: \`${contract.impact_surface.evidence_level}\``);
        lines.push(`- Plan base: \`${contract.repo_state.base_sha ?? "unknown"}\``);
    }
    lines.push(`- PR base: \`${result.inputs.baseSha ?? "unknown"}\``);
    lines.push("");
    lines.push("## Bug report");
    lines.push("");
    lines.push("### Confirmed facts");
    lines.push("");
    const confirmedFacts = result.finding.confirmed_facts.slice(0, 10);
    for (const fact of confirmedFacts) {
        lines.push(`- ${fact}`);
    }
    if (result.finding.confirmed_facts.length > confirmedFacts.length) {
        lines.push(`- ... ${result.finding.confirmed_facts.length - confirmedFacts.length} more confirmed facts`);
    }
    if (confirmedFacts.length === 0) {
        lines.push("- No confirmed facts beyond structural report validation.");
    }
    lines.push("");
    if (hypothesis) {
        lines.push("### Agent suspected cause");
        lines.push("");
        lines.push(hypothesis);
        lines.push("");
        lines.push("> This is an unverified hypothesis.");
        lines.push("");
    }
    if (contract) {
        lines.push("## Repair relation graph");
        lines.push("");
        lines.push("This is an evidence-based candidate graph, not a complete dependency graph or call graph.");
        lines.push("");
        for (const edge of contract.repair_relation_graph.slice(0, 12)) {
            lines.push(`- \`${edge.from}\` -> \`${edge.to}\` (${edge.relation}, ${edge.confidence})`);
        }
        if (contract.repair_relation_graph.length > 12) {
            lines.push(`- ... ${contract.repair_relation_graph.length - 12} additional graph candidates omitted`);
        }
        lines.push("");
    }
    if (check && contract) {
        lines.push("## Changed files");
        lines.push("");
        lines.push("| File | Bucket | Result |");
        lines.push("|---|---|---|");
        for (const file of check.changed_files.slice(0, 20)) {
            const bucket = classifyChangedFile(file, contract);
            const finding = check.findings.find(item => item.file === file);
            lines.push(`| \`${file}\` | ${bucket} | ${findingResult(bucket, finding)} |`);
        }
        if (check.changed_files.length > 20) {
            lines.push("");
            lines.push(`Showing 20 changed files. ${check.changed_files.length - 20} additional files omitted.`);
        }
        lines.push("");
    }
    if (contract) {
        lines.push("## Repair scope");
        lines.push("");
        appendScopeSection(lines, "Allowed", contract.repair_scope.allowed.map(entry => entry.pattern));
        appendScopeSection(lines, "Review required", contract.repair_scope.review_required.map(entry => entry.pattern));
        appendScopeSection(lines, "Forbidden", contract.repair_scope.forbidden.map(entry => entry.pattern));
    }
    if (check?.concurrent_findings.length) {
        lines.push("## Concurrency findings");
        lines.push("");
        lines.push("| Severity | Finding | Other repair | Action |");
        lines.push("|---|---|---|---|");
        for (const finding of check.concurrent_findings.slice(0, 12)) {
            lines.push(`| ${finding.severity} | ${escapeTableCell(finding.kind)} | ${finding.other_repair_id ?? "-"} | ${finding.recommended_action} |`);
        }
        if (check.concurrent_findings.length > 12) {
            lines.push("");
            lines.push(`Showing 12 concurrency findings. ${check.concurrent_findings.length - 12} additional findings omitted.`);
        }
        lines.push("");
    }
    lines.push("## Artifacts");
    lines.push("");
    lines.push("- `repair_task.md`");
    lines.push("- `repair_report.md`");
    lines.push("- `repair_feedback.md`");
    lines.push("- `artifact_manifest.json`");
    lines.push("");
    return {
        marker: COMMENT_MARKER,
        markdown: lines.join("\n"),
    };
}
function appendScopeSection(lines, title, patterns) {
    lines.push(`### ${title}`);
    lines.push("");
    if (patterns.length === 0) {
        lines.push("- None");
        lines.push("");
        return;
    }
    for (const pattern of patterns.slice(0, 20)) {
        lines.push(`- \`${pattern}\``);
    }
    if (patterns.length > 20) {
        lines.push(`- ... ${patterns.length - 20} additional entries omitted`);
    }
    lines.push("");
}
function classifyChangedFile(path, contract) {
    if (contract.repair_scope.forbidden.some(entry => matchesPattern(path, entry.pattern))) {
        return "forbidden";
    }
    if (contract.repair_scope.review_required.some(entry => matchesPattern(path, entry.pattern))) {
        return "review_required";
    }
    if (contract.repair_scope.allowed.some(entry => matchesPattern(path, entry.pattern))) {
        return "allowed";
    }
    return "outside_scope";
}
function findingResult(bucket, finding) {
    if (finding?.kind === "stale_repair_contract")
        return "requires_replan";
    if (finding?.kind === "outside_scope_file")
        return "requires_scope_expansion";
    if (finding?.kind === "forbidden_file")
        return "fail";
    if (finding?.kind === "review_required_file")
        return "requires_review";
    if (bucket === "allowed")
        return "ok";
    return finding?.kind ?? bucket;
}
function buildNextSteps(result) {
    if (result.verdict === "requires_replan") {
        return ["Run repair plan again for the current PR base before continuing."];
    }
    if (result.runPhase === "intake_pending_audit") {
        return ["Human intake approval is required before Pantheon can generate a repair plan."];
    }
    if (result.runPhase === "plan_pending_audit") {
        return ["Human plan approval is required before Pantheon will treat this repair as approved."];
    }
    const steps = new Set();
    for (const action of result.check?.findings.flatMap(finding => finding.allowed_actions) ?? []) {
        if (action === "keep_for_human_review") {
            steps.add("Keep review-required files for human review.");
        }
        if (action === "request_scope_expansion") {
            steps.add("Request scope expansion before modifying additional files.");
        }
        if (action === "request_replan") {
            steps.add("Re-run repair plan for the current base state.");
        }
        if (action === "revert_file") {
            steps.add("Revert forbidden or out-of-scope files.");
        }
        if (action === "add_or_run_related_test") {
            steps.add("Add or run the related tests listed in the repair artifacts.");
        }
    }
    if (steps.size === 0) {
        steps.add("Continue inside the approved repair scope.");
    }
    return [...steps];
}
function escapeTableCell(value) {
    return value.replace(/\|/g, "\\|");
}

;// CONCATENATED MODULE: ./src/artifacts/artifactSanitizer.ts
/**
 * P18.5-B: Artifact Sanitizer
 *
 * Scans artifact content for sensitive patterns that must not appear
 * in public-facing outputs. Returns a list of violations.
 *
 * Usage:
 *   const violations = sanitizeArtifact(content, "public");
 *   if (violations.length > 0) { reject or redact }
 *
 * ref: P18.5-B
 */
const SANITIZATION_RULES = [
    // Windows absolute paths
    {
        kind: "windows_absolute_path",
        severity: "critical",
        pattern: /[A-Z]:\\[^\s"']+/g,
        message: "Windows absolute path detected — must not appear in public artifacts.",
    },
    // Unix home/user paths
    {
        kind: "unix_absolute_path",
        severity: "critical",
        pattern: /\/(?:Users|home|root)\/[^\s"']+/g,
        message: "Unix user path detected — must not appear in public artifacts.",
    },
    // Workspace temp paths
    {
        kind: "workspace_temp_path",
        severity: "high",
        pattern: /\/tmp\/[^\s"']+|\\temp\\[^\s"']+/gi,
        message: "Temporary workspace path detected.",
    },
    // node_modules stack traces
    {
        kind: "stack_trace",
        severity: "high",
        pattern: /at\s+[^\s]+\s+\(.*node_modules.*\)/g,
        message: "Internal stack trace from node_modules detected.",
    },
    // Debug payload markers
    {
        kind: "debug_payload",
        severity: "medium",
        pattern: /\[DEBUG\]|__DEBUG__|"debug":\s*true/g,
        message: "Debug payload marker detected.",
    },
    // .env file references
    {
        kind: "env_reference",
        severity: "high",
        pattern: /\.env(?:\.local|\.production|\.development)?(?:\b|$)/g,
        message: ".env file reference detected — may leak environment config.",
    },
    // Secret-like keys (generic)
    {
        kind: "secret_like_key",
        severity: "critical",
        pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*["'][^"']{8,}/gi,
        message: "Potential secret or API key detected.",
    },
    // Internal observation dump (very large JSON blocks)
    {
        kind: "internal_observation_dump",
        severity: "medium",
        pattern: /"python_observations":\s*\{/g,
        message: "Internal observation dump detected — should not be in public artifacts.",
    },
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Scan artifact content for sensitive patterns.
 *
 * @param content - The text content of the artifact
 * @param mode - "public" checks all rules; "debug" is a no-op (always clean)
 * @returns A SanitizationResult with any violations found
 */
function sanitizeArtifact(content, mode = "public") {
    if (mode === "debug") {
        return { clean: true, violations: [], scanned_lines: 0 };
    }
    const lines = content.split("\n");
    const violations = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const rule of SANITIZATION_RULES) {
            // Reset lastIndex for global regexes
            rule.pattern.lastIndex = 0;
            let match;
            while ((match = rule.pattern.exec(line)) !== null) {
                violations.push({
                    kind: rule.kind,
                    severity: rule.severity,
                    match: match[0].substring(0, 80), // Truncate long matches
                    line: i + 1,
                    message: rule.message,
                });
            }
        }
    }
    return {
        clean: violations.length === 0,
        violations,
        scanned_lines: lines.length,
    };
}
/**
 * Returns only critical and high severity violations.
 */
function getCriticalViolations(result) {
    return result.violations.filter(v => v.severity === "critical" || v.severity === "high");
}

;// CONCATENATED MODULE: ./src/github/githubRepairArtifactCollector.ts




function collectGitHubRepairArtifacts(input) {
    const repoRoot = (0,external_node_path_.resolve)(input.repoRoot);
    const runPaths = repairArtifactLayout_repairRunPaths(repoRoot, input.repairId);
    const outputDirRelative = "pantheon-repair-report";
    const outputDir = (0,external_node_path_.join)(repoRoot, outputDirRelative);
    (0,external_node_fs_.rmSync)(outputDir, { recursive: true, force: true });
    (0,external_node_fs_.mkdirSync)(outputDir, { recursive: true });
    const copiedPublicArtifacts = [];
    const copiedDebugArtifacts = [];
    const withheldArtifacts = [];
    const sanitizerViolations = [];
    const publicArtifacts = [
        [runPaths.task, "repair_task.md", "text"],
        [runPaths.scope, "repair_scope.md", "text"],
        [runPaths.checklist, "consistency_checklist.md", "text"],
        [runPaths.check, "repair_check.json", "json"],
        [runPaths.report, "repair_report.md", "text"],
        [runPaths.feedback, "repair_feedback.md", "text"],
    ];
    for (const [source, target, kind] of publicArtifacts) {
        if (!(0,external_node_fs_.existsSync)(source))
            continue;
        const content = (0,external_node_fs_.readFileSync)(source, "utf-8");
        const sanitized = input.artifactMode === "debug" ? { clean: true, violations: [] } : sanitizeArtifact(content, "public");
        if (!sanitized.clean) {
            withheldArtifacts.push(target);
            sanitizerViolations.push({
                file: target,
                count: sanitized.violations.length,
                messages: sanitized.violations.map(violation => violation.message),
            });
            (0,external_node_fs_.writeFileSync)((0,external_node_path_.join)(outputDir, target), placeholderArtifactContent(target, kind));
            copiedPublicArtifacts.push(target);
            continue;
        }
        (0,external_node_fs_.cpSync)(source, (0,external_node_path_.join)(outputDir, target));
        copiedPublicArtifacts.push(target);
    }
    if (input.artifactMode === "debug") {
        const debugSources = [
            [runPaths.agentBugReport, "agent_bug_report.json"],
            [runPaths.userBugReport, "user_bug_report.json"],
            [runPaths.bugFinding, "bug_finding.json"],
            [runPaths.contractLatest, "repair_contract.latest.json"],
            [runPaths.relationGraph, "repair_relation_graph.json"],
            [runPaths.auditLog, "repair_audit_log.jsonl"],
        ];
        for (const [source, target] of debugSources) {
            if (!(0,external_node_fs_.existsSync)(source))
                continue;
            (0,external_node_fs_.cpSync)(source, (0,external_node_path_.join)(outputDir, target));
            copiedDebugArtifacts.push(target);
        }
    }
    return {
        outputDir,
        outputDirRelative,
        copiedPublicArtifacts,
        copiedDebugArtifacts,
        withheldArtifacts,
        sanitizerViolations,
    };
}
function writeGitHubRepairSupportArtifacts(input) {
    const manifest = {
        schema_version: "pantheon_repair_artifact_manifest@0.1.0",
        repair_id: input.repairId,
        verdict: input.verdict,
        copied_public_artifacts: input.artifactCollection.copiedPublicArtifacts,
        copied_debug_artifacts: input.artifactCollection.copiedDebugArtifacts,
        withheld_artifacts: input.artifactCollection.withheldArtifacts,
        sanitizer_violations: input.artifactCollection.sanitizerViolations,
        generated_at: new Date().toISOString(),
    };
    (0,external_node_fs_.writeFileSync)((0,external_node_path_.join)(input.outputDir, "repair_summary.md"), input.summaryMarkdown);
    (0,external_node_fs_.writeFileSync)((0,external_node_path_.join)(input.outputDir, "artifact_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    (0,external_node_fs_.writeFileSync)((0,external_node_path_.join)(input.outputDir, "tester_feedback_template.md"), buildTesterFeedbackTemplate());
    (0,external_node_fs_.writeFileSync)((0,external_node_path_.join)(input.outputDir, "closed_alpha_run_summary.json"), `${JSON.stringify({
        repair_id: input.repairId,
        verdict: input.verdict,
        artifact_dir: "pantheon-repair-report",
        sanitizer_violations: input.artifactCollection.sanitizerViolations.length,
        comment_status: input.commentStatus ?? "pending",
        comment_reason: input.commentReason ?? null,
        generated_at: new Date().toISOString(),
    }, null, 2)}\n`);
}
function placeholderArtifactContent(target, kind) {
    if (kind === "json") {
        return `${JSON.stringify({
            status: "withheld",
            reason: `Public artifact sanitizer blocked ${target}.`,
        }, null, 2)}\n`;
    }
    if (kind === "jsonl") {
        return `${JSON.stringify({
            status: "withheld",
            reason: `Public artifact sanitizer blocked ${target}.`,
        })}\n`;
    }
    return `# Withheld\n\nPantheon withheld \`${target}\` because the public artifact sanitizer found blocked content.\n`;
}
function buildTesterFeedbackTemplate() {
    return [
        "# Pantheon Closed Alpha Feedback",
        "",
        "## Did the PR comment make sense?",
        "- yes / partially / no",
        "",
        "## Was the verdict correct?",
        "- yes / no / unsure",
        "",
        "## Did Pantheon catch a useful issue?",
        "- yes / no",
        "",
        "## Was anything noisy or confusing?",
        "",
        "## Did the repair feedback tell the agent what to do?",
        "",
        "## Would you keep this Action enabled on a real repo?",
        "- yes / maybe / no",
        "",
    ].join("\n");
}

;// CONCATENATED MODULE: ./src/github/githubRepairExitPolicy.ts
function decideGitHubRepairExit(input) {
    const { verdict, sanitizerViolations, failOn } = input;
    if (failOn.includes("none")) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No fail conditions enabled.",
        };
    }
    const matched = new Set();
    if (failOn.includes("all")) {
        if (verdict !== "pass") {
            matched.add(verdict);
        }
        if (sanitizerViolations > 0) {
            matched.add("public_artifact_sanitizer_violation");
        }
    }
    else {
        if (failOn.includes(verdict)) {
            matched.add(verdict);
        }
        if (sanitizerViolations > 0 && failOn.includes("public_artifact_sanitizer_violation")) {
            matched.add("public_artifact_sanitizer_violation");
        }
    }
    if (matched.size === 0) {
        return {
            shouldFail: false,
            matchedConditions: [],
            reason: "No configured blocking repair findings detected.",
        };
    }
    return {
        shouldFail: true,
        matchedConditions: [...matched],
        reason: `Matched fail conditions: ${[...matched].join(", ")}`,
    };
}

// EXTERNAL MODULE: ./src/github/githubInputParser.ts
var githubInputParser = __nccwpck_require__(497);
;// CONCATENATED MODULE: ./src/github/githubRepairInputParser.ts

function parseGitHubRepairInputs(env) {
    const event = (0,githubInputParser/* loadGitHubEvent */.Y6)(env);
    const prContext = (0,githubInputParser/* extractPullRequestContext */.Lh)(event);
    const repairId = firstNonEmpty(env.INPUT_REPAIR_ID);
    const agentBugReport = firstNonEmpty(env.INPUT_AGENT_BUG_REPORT);
    const repairIntent = firstNonEmpty(env.INPUT_REPAIR_INTENT);
    const suspectPaths = parseDelimitedList(env.INPUT_SUSPECT);
    const failingTests = parseDelimitedList(env.INPUT_FAILING_TESTS);
    const mustPreserve = parseDelimitedList(env.INPUT_MUST_PRESERVE);
    const sourceKind = resolveSourceKind({ repairId, agentBugReport, repairIntent });
    if (!repairId && !agentBugReport && !repairIntent) {
        throw new Error("Repair mode requires one of: repair_id, agent_bug_report, or repair_intent.");
    }
    if (repairIntent && suspectPaths.length === 0) {
        throw new Error("Inline repair_intent requires at least one suspect path.");
    }
    return {
        event,
        prContext,
        inputs: {
            mode: "repair",
            configPath: firstNonEmpty(env.INPUT_CONFIG_PATH, "pantheon.alpha.json") ?? "pantheon.alpha.json",
            repairId,
            agentBugReport,
            repairIntent,
            suspectPaths,
            failingTests,
            mustPreserve,
            auditMode: parseAuditMode(env.INPUT_AUDIT_MODE),
            artifactMode: parseArtifactMode(env.INPUT_ARTIFACT_MODE),
            postComment: (0,githubInputParser/* parseBoolean */.yG)(env.INPUT_POST_COMMENT, true),
            failOn: parseRepairFailConditions(env.INPUT_FAIL_ON),
            baseSha: prContext?.baseSha,
            headSha: prContext?.headSha,
            sourceKind,
        },
    };
}
function parseDelimitedList(raw) {
    if (!raw)
        return [];
    return raw
        .split(/[\r\n,]+/)
        .map(value => value.trim())
        .filter(value => value.length > 0);
}
function parseRepairFailConditions(raw) {
    const fallback = [
        "fail",
        "requires_replan",
        "requires_scope_expansion",
    ];
    const normalized = (raw ?? fallback.join(","))
        .split(",")
        .map(token => token.trim())
        .filter(token => token.length > 0);
    if (normalized.length === 0)
        return fallback;
    if (normalized.includes("all"))
        return ["all"];
    if (normalized.includes("none"))
        return ["none"];
    const allowed = new Set([
        "pass",
        "requires_review",
        "requires_scope_expansion",
        "requires_replan",
        "fail",
        "public_artifact_sanitizer_violation",
    ]);
    const result = normalized.filter(token => allowed.has(token));
    return result.length > 0 ? [...new Set(result)] : fallback;
}
function resolveSourceKind(input) {
    if (input.repairId)
        return "existing_repair_id";
    if (input.agentBugReport)
        return "agent_bug_report";
    return "inline_action_inputs";
}
function parseAuditMode(raw) {
    if (raw === "auto" || raw === "require_plan_approval" || raw === "require_all") {
        return raw;
    }
    return "require_plan_approval";
}
function parseArtifactMode(raw) {
    return raw === "debug" ? "debug" : "public";
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (value && value.trim().length > 0) {
            return value.trim();
        }
    }
    return undefined;
}

;// CONCATENATED MODULE: ./src/github/githubRepairStepSummaryRenderer.ts
function renderGitHubRepairStepSummary(result) {
    const lines = [];
    const check = result.check;
    lines.push("# Pantheon Repair Summary");
    lines.push("");
    lines.push(`Verdict: \`${result.verdict}\``);
    lines.push("");
    lines.push(`Repair ID: ${result.repairId}`);
    lines.push(`Run phase: ${result.runPhase}`);
    if (result.contract) {
        lines.push(`Contract revision: v${result.contract.revision}`);
    }
    if (check) {
        lines.push(`Changed files: ${check.summary.changed_files}`);
        lines.push(`Allowed: ${check.summary.allowed}`);
        lines.push(`Review required: ${check.summary.review_required}`);
        lines.push(`Forbidden: ${check.summary.forbidden}`);
        lines.push(`Outside scope: ${check.summary.outside_scope}`);
        lines.push(`Concurrency findings: ${check.concurrent_findings.length}`);
    }
    lines.push(`Artifact sanitizer violations: ${result.artifactCollection.sanitizerViolations.length}`);
    lines.push("");
    lines.push("See PR comment and artifacts for details.");
    lines.push("");
    return {
        markdown: lines.join("\n"),
    };
}

;// CONCATENATED MODULE: ./src/github/githubRepairRunner.ts












async function runGitHubRepairAction(env = process.env) {
    const repoRoot = (0,external_node_path_.resolve)(env.GITHUB_WORKSPACE ?? process.cwd());
    const { inputs, prContext } = parseGitHubRepairInputs(env);
    const session = resolveRepairSession(repoRoot, inputs);
    const repairId = session.repair_id;
    let runPhase = "checked";
    if (inputs.sourceKind === "agent_bug_report" || inputs.sourceKind === "inline_action_inputs") {
        const latestSession = repairSessionStore_loadRepairSession(repoRoot, repairId);
        const finding = githubRepairRunner_loadBugFinding(repoRoot, repairId);
        if (finding.status !== "accepted" || inputs.auditMode === "require_all") {
            runPhase = "intake_pending_audit";
        }
        else {
            cmdRepairPlan({
                repoRoot,
                repairId,
                configPath: inputs.configPath,
            });
            if (inputs.auditMode === "require_plan_approval") {
                runPhase = "plan_pending_audit";
            }
            else {
                const currentSession = repairSessionStore_loadRepairSession(repoRoot, repairId);
                cmdRepairAudit({
                    repoRoot,
                    repairId,
                    targetRevision: currentSession.current_revision,
                    gate: "repair_plan",
                    decision: "approve",
                    reason: "Auto-approved by GitHub repair mode (audit_mode=auto).",
                    operatorId: "github-action",
                    addReview: [],
                    addForbid: [],
                    addMustPreserve: [],
                });
                runPhase = "checked";
            }
        }
        if (runPhase === "checked") {
            cmdRepairCheck({
                repoRoot,
                repairId,
                baseRef: inputs.baseSha,
            });
        }
        if (runPhase !== "checked" && latestSession.status === "intake_rejected") {
            runPhase = "intake_pending_audit";
        }
    }
    else {
        cmdRepairCheck({
            repoRoot,
            repairId,
            baseRef: inputs.baseSha,
        });
        runPhase = "checked";
    }
    const sessionAfterRun = repairSessionStore_loadRepairSession(repoRoot, repairId);
    const report = githubRepairRunner_loadStoredRepairReport(repoRoot, repairId);
    const finding = githubRepairRunner_loadBugFinding(repoRoot, repairId);
    const contract = loadOptionalContract(repoRoot, repairId, sessionAfterRun.current_revision);
    const check = runPhase === "checked" ? loadOptionalCheck(repoRoot, repairId) : null;
    const verdict = deriveRunVerdict(runPhase, check, sessionAfterRun);
    const artifactCollection = collectGitHubRepairArtifacts({
        repoRoot,
        repairId,
        artifactMode: inputs.artifactMode,
    });
    const exitDecision = decideGitHubRepairExit({
        verdict,
        sanitizerViolations: artifactCollection.sanitizerViolations.length,
        failOn: inputs.failOn,
    });
    const preliminaryResult = {
        inputs,
        prContext,
        repairId,
        runPhase,
        verdict,
        sourceKind: inputs.sourceKind,
        session: sessionAfterRun,
        report,
        finding,
        contract,
        check,
        artifactCollection,
        artifactOutputDir: artifactCollection.outputDir,
        artifactOutputDirRelative: artifactCollection.outputDirRelative,
        summaryPath: env.GITHUB_STEP_SUMMARY ? (0,external_node_path_.resolve)(env.GITHUB_STEP_SUMMARY) : null,
        commentPath: (0,external_node_path_.join)(artifactCollection.outputDir, "pr_comment.md"),
        repairFeedbackPath: (0,external_node_fs_.existsSync)((0,external_node_path_.join)(artifactCollection.outputDir, "repair_feedback.md"))
            ? (0,external_node_path_.join)(artifactCollection.outputDir, "repair_feedback.md")
            : null,
        exitDecision,
        commentResult: { status: "skipped", reason: "PR comment not attempted yet." },
    };
    const summary = renderGitHubRepairStepSummary(preliminaryResult);
    writeGitHubRepairSupportArtifacts({
        outputDir: artifactCollection.outputDir,
        summaryMarkdown: summary.markdown,
        artifactCollection,
        repairId,
        verdict,
    });
    const comment = renderGitHubRepairComment(preliminaryResult);
    (0,external_node_fs_.writeFileSync)(preliminaryResult.commentPath, comment.markdown);
    (0,external_node_fs_.writeFileSync)((0,external_node_path_.join)(artifactCollection.outputDir, "step_summary.md"), summary.markdown);
    if (preliminaryResult.summaryPath) {
        (0,external_node_fs_.mkdirSync)((0,external_node_path_.dirname)(preliminaryResult.summaryPath), { recursive: true });
        (0,external_node_fs_.writeFileSync)(preliminaryResult.summaryPath, summary.markdown);
    }
    let commentResult = { status: "skipped", reason: "PR comment disabled." };
    if (inputs.postComment) {
        commentResult = await (0,githubCommentClient/* postOrUpdatePantheonComment */.b)({
            prContext,
            githubToken: env.GITHUB_TOKEN,
            marker: comment.marker,
            markdown: comment.markdown,
            githubApiUrl: env.GITHUB_API_URL,
        });
    }
    writeGitHubRepairSupportArtifacts({
        outputDir: artifactCollection.outputDir,
        summaryMarkdown: summary.markdown,
        artifactCollection,
        repairId,
        verdict,
        commentStatus: commentResult.status,
        commentReason: "reason" in commentResult ? commentResult.reason : undefined,
    });
    return {
        ...preliminaryResult,
        commentResult,
    };
}
function resolveRepairSession(repoRoot, inputs) {
    if (inputs.sourceKind === "existing_repair_id") {
        return repairSessionStore_loadRepairSession(repoRoot, inputs.repairId);
    }
    if (inputs.sourceKind === "agent_bug_report") {
        return cmdRepairIntake({
            repoRoot,
            fromPath: (0,external_node_path_.resolve)(repoRoot, inputs.agentBugReport),
            agentId: "github-action",
            operatorId: "github-action",
        });
    }
    return cmdRepairIntake({
        repoRoot,
        intent: inputs.repairIntent,
        suspectPaths: [...inputs.suspectPaths],
        failingTests: [...inputs.failingTests],
        mustPreserve: [...inputs.mustPreserve],
        operatorId: "github-action",
    });
}
function githubRepairRunner_loadStoredRepairReport(repoRoot, repairId) {
    const runPaths = repairArtifactLayout_repairRunPaths(repoRoot, repairId);
    if ((0,external_node_fs_.existsSync)(runPaths.agentBugReport)) {
        return readJsonFile(runPaths.agentBugReport);
    }
    if ((0,external_node_fs_.existsSync)(runPaths.userBugReport)) {
        return readJsonFile(runPaths.userBugReport);
    }
    throw new Error(`No repair report found for ${repairId}.`);
}
function githubRepairRunner_loadBugFinding(repoRoot, repairId) {
    const runPaths = repairArtifactLayout_repairRunPaths(repoRoot, repairId);
    if (!(0,external_node_fs_.existsSync)(runPaths.bugFinding)) {
        throw new Error(`No bug finding found for ${repairId}.`);
    }
    return readJsonFile(runPaths.bugFinding);
}
function loadOptionalContract(repoRoot, repairId, revision) {
    if (revision < 1)
        return null;
    const path = repairArtifactLayout_repairRunPaths(repoRoot, repairId).contractRevision(revision);
    return (0,external_node_fs_.existsSync)(path) ? readJsonFile(path) : null;
}
function loadOptionalCheck(repoRoot, repairId) {
    const path = repairArtifactLayout_repairRunPaths(repoRoot, repairId).check;
    return (0,external_node_fs_.existsSync)(path) ? readJsonFile(path) : null;
}
function deriveRunVerdict(runPhase, check, session) {
    if (check)
        return check.verdict;
    if (runPhase === "checked")
        return "pass";
    if (session.status === "intake_rejected")
        return "fail";
    return "requires_review";
}


/***/ }),

/***/ 812:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = __nccwpck_require__.p + "87754f10f24c8c766933.ts";

/***/ }),

/***/ 421:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:child_process");

/***/ }),

/***/ 24:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:fs");

/***/ }),

/***/ 760:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:path");

/***/ }),

/***/ 136:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:url");

/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __nccwpck_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	var threw = true;
/******/ 	try {
/******/ 		__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 		threw = false;
/******/ 	} finally {
/******/ 		if(threw) delete __webpack_module_cache__[moduleId];
/******/ 	}
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/******/ // expose the modules object (__webpack_modules__)
/******/ __nccwpck_require__.m = __webpack_modules__;
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/async module */
/******/ (() => {
/******/ 	var webpackQueues = typeof Symbol === "function" ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 	var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 	var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";
/******/ 	var resolveQueue = (queue) => {
/******/ 		if(queue && queue.d < 1) {
/******/ 			queue.d = 1;
/******/ 			queue.forEach((fn) => (fn.r--));
/******/ 			queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 		}
/******/ 	}
/******/ 	var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 		if(dep !== null && typeof dep === "object") {
/******/ 			if(dep[webpackQueues]) return dep;
/******/ 			if(dep.then) {
/******/ 				var queue = [];
/******/ 				queue.d = 0;
/******/ 				dep.then((r) => {
/******/ 					obj[webpackExports] = r;
/******/ 					resolveQueue(queue);
/******/ 				}, (e) => {
/******/ 					obj[webpackError] = e;
/******/ 					resolveQueue(queue);
/******/ 				});
/******/ 				var obj = {};
/******/ 				obj[webpackQueues] = (fn) => (fn(queue));
/******/ 				return obj;
/******/ 			}
/******/ 		}
/******/ 		var ret = {};
/******/ 		ret[webpackQueues] = x => {};
/******/ 		ret[webpackExports] = dep;
/******/ 		return ret;
/******/ 	}));
/******/ 	__nccwpck_require__.a = (module, body, hasAwait) => {
/******/ 		var queue;
/******/ 		hasAwait && ((queue = []).d = -1);
/******/ 		var depQueues = new Set();
/******/ 		var exports = module.exports;
/******/ 		var currentDeps;
/******/ 		var outerResolve;
/******/ 		var reject;
/******/ 		var promise = new Promise((resolve, rej) => {
/******/ 			reject = rej;
/******/ 			outerResolve = resolve;
/******/ 		});
/******/ 		promise[webpackExports] = exports;
/******/ 		promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 		module.exports = promise;
/******/ 		body((deps) => {
/******/ 			currentDeps = wrapDeps(deps);
/******/ 			var fn;
/******/ 			var getResult = () => (currentDeps.map((d) => {
/******/ 				if(d[webpackError]) throw d[webpackError];
/******/ 				return d[webpackExports];
/******/ 			}))
/******/ 			var promise = new Promise((resolve) => {
/******/ 				fn = () => (resolve(getResult));
/******/ 				fn.r = 0;
/******/ 				var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 				currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 			});
/******/ 			return fn.r ? promise : getResult();
/******/ 		}, (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue)));
/******/ 		queue && queue.d < 0 && (queue.d = 0);
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat get default export */
/******/ (() => {
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__nccwpck_require__.n = (module) => {
/******/ 		var getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__nccwpck_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__nccwpck_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__nccwpck_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/publicPath */
/******/ (() => {
/******/ 	var scriptUrl;
/******/ 	if (typeof import.meta.url === "string") scriptUrl = import.meta.url
/******/ 	// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 	// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 	if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 	scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 	__nccwpck_require__.p = scriptUrl;
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/******/ /* webpack/runtime/import chunk loading */
/******/ (() => {
/******/ 	__nccwpck_require__.b = new URL("./", import.meta.url);
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		792: 0
/******/ 	};
/******/ 	
/******/ 	// no install chunk
/******/ 	
/******/ 	// no chunk on demand loading
/******/ 	
/******/ 	// no prefetching
/******/ 	
/******/ 	// no preloaded
/******/ 	
/******/ 	// no external install chunk
/******/ 	
/******/ 	// no on chunks loaded
/******/ })();
/******/ 
/************************************************************************/
/******/ 
/******/ // startup
/******/ // Load entry module and return exports
/******/ // This entry module used 'module' so it can't be inlined
/******/ var __webpack_exports__ = __nccwpck_require__(484);
/******/ __webpack_exports__ = await __webpack_exports__;
/******/ var __webpack_exports__runGitHubAction = __webpack_exports__.b;
/******/ var __webpack_exports__runGitHubWorkflowAction = __webpack_exports__.s;
/******/ export { __webpack_exports__runGitHubAction as runGitHubAction, __webpack_exports__runGitHubWorkflowAction as runGitHubWorkflowAction };
/******/ 

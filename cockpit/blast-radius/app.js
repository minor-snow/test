/**
 * P15.1/P15.2 Blast Radius Cockpit — app.js
 * Client-side graph traversal, node picker, impact analysis, risk panel.
 * Port of src/boundary/blastRadius.ts logic — verified against canonical P15 fixture.
 * P15.2: Bilingual display projection via i18n.js
 */

// ============================================================
// State
// ============================================================

let graph = null;        // BoundaryGraph JSON
let gatesReport = null;  // boundary_gates_report.json
let selectedNodes = [];  // string[]
let activeFilter = "all";
let searchQuery = "";
let showAllPaths = false;

const LAYER_COLORS = {
  architecture: "var(--color-arch)",
  interface: "var(--color-iface)",
  module: "var(--color-module)",
  handoff: "var(--color-handoff)",
  generated: "var(--color-gen)",
  test: "var(--color-test)",
};

const LAYER_ORDER = ["architecture", "interface", "module", "handoff", "generated_files", "generated_symbols", "tests"];

// ============================================================
// Boot
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Init i18n first
  await initI18n();

  try {
    const [graphRes, gatesRes] = await Promise.all([
      fetch("./data/boundary_graph.json"),
      fetch("./data/boundary_gates_report.json"),
    ]);
    graph = await graphRes.json();
    gatesReport = await gatesRes.json();
  } catch (e) {
    console.error("Failed to load data:", e);
    document.getElementById("stat-status").textContent = t("status.loadFailed");
    return;
  }

  applyI18nToDOM();
  renderHeaderStats();
  renderNodeList();
  bindEvents();
  runFixtureCheck();
});

// ============================================================
// Header stats
// ============================================================

function renderHeaderStats() {
  document.querySelector("#stat-nodes .stat-value").textContent = graph.stats.node_count;
  document.querySelector("#stat-edges .stat-value").textContent = graph.stats.edge_count;

  const gates = gatesReport?.gates || [];
  const gatesPassed = gates.filter(g => g.status === "pass").length;
  const gatesTotal = gates.length;
  document.querySelector("#stat-gates .stat-value").textContent = `${gatesPassed}/${gatesTotal}`;

  const statusEl = document.getElementById("stat-status");
  if (gates.length > 0 && gatesPassed === gatesTotal) {
    statusEl.textContent = t("status.allPass");
    statusEl.classList.add("pass");
  } else {
    statusEl.textContent = t("status.gatesFail");
    statusEl.classList.add("fail");
  }
}

// ============================================================
// Node list
// ============================================================

function getFilteredNodes() {
  let nodes = graph.nodes;
  if (activeFilter !== "all") {
    nodes = nodes.filter(n => n.layer === activeFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    nodes = nodes.filter(n => n.node_id.toLowerCase().includes(q) || (n.label && n.label.toLowerCase().includes(q)));
  }
  // Sort: critical first, then by ID
  nodes.sort((a, b) => {
    if (a.critical && !b.critical) return -1;
    if (!a.critical && b.critical) return 1;
    return a.node_id.localeCompare(b.node_id);
  });
  return nodes;
}

function getLayerColor(layer) {
  return LAYER_COLORS[layer] || "var(--text-muted)";
}

function renderNodeList() {
  const list = document.getElementById("node-list");
  const nodes = getFilteredNodes();

  list.innerHTML = nodes.map(n => {
    const isSelected = selectedNodes.includes(n.node_id);
    const shortId = n.node_id.length > 35 ? n.node_id.slice(0, 35) + "…" : n.node_id;
    return `<li class="node-item ${isSelected ? "selected" : ""}" data-id="${n.node_id}" title="${n.node_id}">
      <span class="layer-dot" style="background: ${getLayerColor(n.layer)}"></span>
      <span class="node-label">${shortId}</span>
      ${n.critical ? '<span class="critical-badge">CRIT</span>' : ""}
    </li>`;
  }).join("");
}

function renderSelectedTags() {
  const container = document.getElementById("selected-tags");
  container.innerHTML = selectedNodes.map(id => {
    const short = id.length > 30 ? id.slice(0, 30) + "…" : id;
    return `<span class="selected-tag" title="${id}">
      ${short}
      <span class="tag-remove" data-id="${id}">✕</span>
    </span>`;
  }).join("");
}

// ============================================================
// Graph traversal (port of src/boundary logic)
// ============================================================

function queryDownstream(nodeId) {
  const visited = new Set();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of graph.edges) {
      if (e.from === current && !visited.has(e.to)) queue.push(e.to);
    }
  }
  visited.delete(nodeId);
  return graph.nodes.filter(n => visited.has(n.node_id));
}

function queryBlastRadiusSeeds(nodeIds) {
  const directIds = new Set();
  for (const id of nodeIds) {
    for (const e of graph.edges) {
      if (e.from === id) directIds.add(e.to);
    }
  }

  const allDown = new Set();
  for (const id of nodeIds) {
    for (const n of queryDownstream(id)) allDown.add(n.node_id);
  }

  const downstream = graph.nodes.filter(n => allDown.has(n.node_id));
  return {
    direct: graph.nodes.filter(n => directIds.has(n.node_id)),
    downstream,
    generated_files: downstream.filter(n => n.kind === "generated_file"),
    generated_symbols: downstream.filter(n => n.kind === "generated_symbol"),
    tests: downstream.filter(n => n.kind === "test_obligation"),
  };
}

function findShortestPath(from, to) {
  const visited = new Set();
  const parent = new Map();
  const queue = [from];
  visited.add(from);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === to) {
      const path = [];
      let node = to;
      while (node !== from) { path.unshift(node); node = parent.get(node); }
      path.unshift(from);
      return path;
    }
    for (const e of graph.edges) {
      if (e.from === current && !visited.has(e.to)) {
        visited.add(e.to);
        parent.set(e.to, current);
        queue.push(e.to);
      }
    }
  }
  return null;
}

function classifyRisk(node) {
  if (node.kind === "conflict_policy" && node.critical) return "high";
  if (node.kind === "forbidden_assumption") return "high";
  if (node.kind === "state_machine") return "medium";
  if (node.kind === "data_model") return "medium";
  return null;
}

function computeBlastRadius(nodeIds) {
  if (nodeIds.length === 0) return null;

  const seeds = queryBlastRadiusSeeds(nodeIds);

  const byLayer = {
    architecture: [], interface: [], module: [], handoff: [],
    generated_files: [], generated_symbols: [], tests: [],
  };
  for (const n of seeds.downstream) {
    if (n.layer === "architecture") byLayer.architecture.push(n.node_id);
    else if (n.layer === "interface") byLayer.interface.push(n.node_id);
    else if (n.layer === "module") byLayer.module.push(n.node_id);
    else if (n.layer === "handoff") byLayer.handoff.push(n.node_id);
    else if (n.layer === "generated") {
      if (n.kind === "generated_file") byLayer.generated_files.push(n.node_id);
      else if (n.kind === "generated_symbol") byLayer.generated_symbols.push(n.node_id);
    }
    else if (n.layer === "test") byLayer.tests.push(n.node_id);
  }

  // Risk amplification
  const amplifications = [];
  for (const n of seeds.downstream) {
    const risk = classifyRisk(n);
    if (!risk) continue;
    let sourcePath = [];
    for (const changed of nodeIds) {
      const path = findShortestPath(changed, n.node_id);
      if (path) { sourcePath = path; break; }
    }
    const riskDown = queryDownstream(n.node_id);
    const affectedTests = riskDown.filter(d => d.kind === "test_obligation").map(d => d.node_id);
    amplifications.push({
      node_id: n.node_id,
      kind: n.kind,
      risk_level: risk,
      reason: tRiskReason(n.kind),
      source_path: sourcePath,
      affected_tests: affectedTests,
    });
  }
  amplifications.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.risk_level] - { high: 0, medium: 1, low: 2 }[b.risk_level]));

  // Critical paths
  const allPaths = [];
  for (const changed of nodeIds) {
    for (const test of seeds.tests) {
      const path = findShortestPath(changed, test.node_id);
      if (path) {
        let pathRisk = "low";
        for (const nId of path) {
          const node = graph.nodes.find(nd => nd.node_id === nId);
          if (node) {
            const r = classifyRisk(node);
            if (r === "high") { pathRisk = "high"; break; }
            if (r === "medium") pathRisk = "medium";
          }
        }
        allPaths.push({ nodes: path, risk_level: pathRisk });
      }
    }
  }
  allPaths.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.risk_level] - { high: 0, medium: 1, low: 2 }[b.risk_level]));

  const highestRisk = amplifications.length > 0
    ? (amplifications.some(a => a.risk_level === "high") ? "high" : amplifications.some(a => a.risk_level === "medium") ? "medium" : "low")
    : "low";

  return {
    direct: seeds.direct.length,
    downstream: seeds.downstream.length,
    files: seeds.generated_files.length,
    symbols: seeds.generated_symbols.length,
    tests: seeds.tests.length,
    highestRisk,
    riskCount: amplifications.filter(a => a.risk_level === "high").length,
    byLayer,
    amplifications,
    criticalPaths: allPaths,
  };
}

// ============================================================
// Render impact
// ============================================================

function renderImpact() {
  const emptyState = document.getElementById("empty-state");
  const impactContent = document.getElementById("impact-content");
  const riskContent = document.getElementById("risk-content");
  const badge = document.getElementById("impact-risk-badge");

  if (selectedNodes.length === 0) {
    emptyState.classList.remove("hidden");
    impactContent.classList.add("hidden");
    riskContent.classList.add("hidden");
    badge.className = "impact-risk-badge";
    badge.textContent = "";
    return;
  }

  const result = computeBlastRadius(selectedNodes);
  if (!result) return;

  emptyState.classList.add("hidden");
  impactContent.classList.remove("hidden");
  riskContent.classList.remove("hidden");

  // Badge — use localized risk level
  badge.className = `impact-risk-badge ${result.highestRisk}`;
  badge.textContent = tRiskLevel(result.highestRisk);

  // Summary cards
  document.querySelector("#card-direct .card-value").textContent = result.direct;
  document.querySelector("#card-downstream .card-value").textContent = result.downstream;
  document.querySelector("#card-files .card-value").textContent = result.files;
  document.querySelector("#card-symbols .card-value").textContent = result.symbols;
  document.querySelector("#card-tests .card-value").textContent = result.tests;
  document.querySelector("#card-risk-count .card-value").textContent = result.riskCount;

  // Layer bars — use localized layer names
  const maxCount = Math.max(...LAYER_ORDER.map(k => result.byLayer[k]?.length || 0), 1);
  const barsEl = document.getElementById("layer-bars");
  barsEl.innerHTML = LAYER_ORDER.map(key => {
    const count = result.byLayer[key]?.length || 0;
    const pct = (count / maxCount) * 100;
    const layerKey = key.replace("_files", "").replace("_symbols", "");
    const color = LAYER_COLORS[layerKey] || LAYER_COLORS["generated"] || "var(--text-muted)";
    const label = tLayer(key);
    return `<div class="layer-bar-row">
      <span class="layer-bar-label">${label}</span>
      <div class="layer-bar-track"><div class="layer-bar-fill" style="width: ${pct}%; background: ${color}"></div></div>
      <span class="layer-bar-count">${count}</span>
    </div>`;
  }).join("");

  // Affected lists — node_ids are NEVER translated
  renderAffectedList("affected-files-list", "files-count", result.byLayer.generated_files);
  renderAffectedList("affected-symbols-list", "symbols-count", result.byLayer.generated_symbols);
  renderAffectedList("affected-tests-list", "tests-count", result.byLayer.tests);

  // Risk amplification — uses localized reasons
  renderRiskAmplification(result.amplifications);

  // Critical paths — node_ids in paths are NEVER translated
  renderCriticalPaths(result.criticalPaths);
}

function renderAffectedList(listId, countId, items) {
  const list = document.getElementById(listId);
  const count = document.getElementById(countId);
  count.textContent = items.length;
  // Technical IDs: never translated
  list.innerHTML = items.map(id => `<li>${id}</li>`).join("");
}

function renderRiskAmplification(amps) {
  const container = document.getElementById("risk-amplification-list");
  const highAmps = amps.filter(a => a.risk_level === "high");
  const medAmps = amps.filter(a => a.risk_level === "medium");

  container.innerHTML = [...highAmps, ...medAmps.slice(0, 5)].map(a => {
    const icon = a.risk_level === "high" ? "🔴" : "🟡";
    // Preserve technical ID — never translate
    const shortId = a.node_id.replace(/^hc:(conflict_policy|forbidden|state_machine|data_model):/, "");
    return `<div class="risk-amp-card ${a.risk_level}">
      <div class="risk-amp-header">
        <span class="risk-amp-icon">${icon}</span>
        <span class="risk-amp-title">${shortId}</span>
      </div>
      <div class="risk-amp-reason">${a.reason}</div>
      ${a.affected_tests.length > 0
        ? `<div class="risk-amp-tests">Tests: ${a.affected_tests.map(t => t.replace("test:", "")).join(", ")}</div>`
        : ""}
    </div>`;
  }).join("");
}

function renderCriticalPaths(paths) {
  const container = document.getElementById("critical-paths-list");
  const toggle = document.getElementById("path-toggle");
  const btnMore = document.getElementById("btn-show-more-paths");

  const limit = showAllPaths ? 20 : 5;
  const displayed = paths.slice(0, limit);
  toggle.textContent = `Top ${displayed.length}` + (paths.length > limit ? ` / ${paths.length}` : "");

  container.innerHTML = displayed.map(p => {
    const icon = p.risk_level === "high" ? "🔴" : p.risk_level === "medium" ? "🟡" : "🟢";
    // Path node IDs: NEVER translated
    const chain = p.nodes.map(n => {
      const short = n.replace(/^(blk:arch:|blk:iface:|blk:mod:|hc:conflict_policy:|hc:forbidden:|hc:data_model:|hc:state_machine:|hc:definition:|hc:risk:|hc:task:|file:|sym:|test:)/, "");
      return `<span class="path-node">${short}</span>`;
    }).join('<span class="path-arrow"> → </span>');
    return `<div class="critical-path"><span class="path-risk-icon">${icon}</span><span class="path-chain">${chain}</span></div>`;
  }).join("");

  if (paths.length > 5 && !showAllPaths) {
    btnMore.classList.remove("hidden");
  } else {
    btnMore.classList.add("hidden");
  }
}

// ============================================================
// Events
// ============================================================

function bindEvents() {
  // Node click
  document.getElementById("node-list").addEventListener("click", (e) => {
    const item = e.target.closest(".node-item");
    if (!item) return;
    const id = item.dataset.id;
    const idx = selectedNodes.indexOf(id);
    if (idx >= 0) selectedNodes.splice(idx, 1);
    else selectedNodes.push(id);
    renderNodeList();
    renderSelectedTags();
    renderImpact();
  });

  // Tag remove
  document.getElementById("selected-tags").addEventListener("click", (e) => {
    const remove = e.target.closest(".tag-remove");
    if (!remove) return;
    const id = remove.dataset.id;
    selectedNodes = selectedNodes.filter(n => n !== id);
    renderNodeList();
    renderSelectedTags();
    renderImpact();
  });

  // Clear
  document.getElementById("btn-clear-selection").addEventListener("click", () => {
    selectedNodes = [];
    renderNodeList();
    renderSelectedTags();
    renderImpact();
  });

  // Search
  document.getElementById("node-search").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderNodeList();
  });

  // Layer filters
  document.getElementById("layer-filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    activeFilter = chip.dataset.layer;
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    renderNodeList();
  });

  // Collapsible sections
  document.querySelectorAll(".collapsible").forEach(h => {
    h.addEventListener("click", () => {
      const targetId = h.dataset.target;
      const target = document.getElementById(targetId);
      target.classList.toggle("hidden");
      h.classList.toggle("expanded");
    });
  });

  // Show more paths
  document.getElementById("btn-show-more-paths").addEventListener("click", () => {
    showAllPaths = true;
    renderImpact();
  });

  // Copy markdown — localized
  document.getElementById("btn-copy-markdown").addEventListener("click", () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => showToast(t("export.markdownCopied")));
  });

  // Copy implementation context — localized
  document.getElementById("btn-copy-context").addEventListener("click", () => {
    const ctx = generateImplementationContext();
    navigator.clipboard.writeText(ctx).then(() => showToast(t("export.contextCopied")));
  });

  // Locale switcher
  document.getElementById("locale-switcher").addEventListener("click", (e) => {
    const btn = e.target.closest(".locale-btn");
    if (!btn) return;
    const newLocale = btn.dataset.locale;
    switchLocale(newLocale).then(() => {
      renderHeaderStats();
      renderImpact();
    });
  });
}

// ============================================================
// Localized Markdown export
// ============================================================

function generateMarkdown() {
  if (selectedNodes.length === 0) return "No nodes selected.";
  const result = computeBlastRadius(selectedNodes);
  if (!result) return "No result.";

  const lines = [
    `# ${t("report.title")}\n`,
    `## ${t("report.changedNodes")}\n`,
    ...selectedNodes.map(n => `- \`${n}\``),
    "",
    `## ${t("report.summary")}\n`,
    `| ${getLocale() === "zh-CN" ? "指标" : "Metric"} | ${getLocale() === "zh-CN" ? "数值" : "Count"} |`,
    "|---|---|",
    `| ${t("report.directImpact")} | ${result.direct} |`,
    `| ${t("report.totalDownstream")} | ${result.downstream} |`,
    `| ${t("report.affectedFiles")} | ${result.files} |`,
    `| ${t("report.affectedSymbols")} | ${result.symbols} |`,
    `| ${t("report.affectedTests")} | ${result.tests} |`,
    `| ${t("report.highestRisk")} | **${tRiskLevel(result.highestRisk)}** |`,
    "",
  ];

  if (result.byLayer.generated_files.length > 0) {
    lines.push(`## ${t("report.affectedFiles")}\n`);
    // File IDs: never translated
    result.byLayer.generated_files.forEach(f => lines.push(`- \`${f}\``));
    lines.push("");
  }

  if (result.byLayer.tests.length > 0) {
    lines.push(`## ${t("report.affectedTests")}\n`);
    // Test IDs: never translated
    result.byLayer.tests.forEach(test => lines.push(`- \`${test}\``));
    lines.push("");
  }

  const highAmps = result.amplifications.filter(a => a.risk_level === "high");
  if (highAmps.length > 0) {
    lines.push(`## ${t("report.riskAmplification")}\n`);
    highAmps.forEach(a => {
      // node_id preserved, reason localized
      lines.push(`- **\`${a.node_id}\`**: ${a.reason}`);
    });
    lines.push("");
  }

  if (result.criticalPaths.length > 0) {
    lines.push(`## ${t("report.criticalPaths")}\n`);
    result.criticalPaths.slice(0, 10).forEach(p => {
      const icon = p.risk_level === "high" ? "🔴" : p.risk_level === "medium" ? "🟡" : "🟢";
      // All node IDs in paths: NEVER translated
      lines.push(`${icon} ${p.nodes.map(n => `\`${n}\``).join(" → ")}\n`);
    });
  }

  return lines.join("\n");
}

// ============================================================
// Localized Implementation context export
// ============================================================

function generateImplementationContext() {
  if (selectedNodes.length === 0) return "No nodes selected.";
  const result = computeBlastRadius(selectedNodes);
  if (!result) return "No result.";

  const ctxTitle = t("context.title");
  const ctxFiles = t("context.affectedFiles");
  const ctxTests = t("context.affectedTests");
  const ctxConstraints = t("context.constraints");

  const lines = [
    `# ${ctxTitle}`,
    `# Generated by Pantheon Cockpit at ${new Date().toISOString()}`,
    "",
    `## ${ctxFiles}`,
    // File paths: NEVER translated
    ...result.byLayer.generated_files.map(f => `- ${f.replace("file:", "")}`),
    "",
    `## ${ctxTests}`,
    // Test IDs: NEVER translated
    ...result.byLayer.tests.map(test => `- ${test}`),
    "",
    `## ${ctxConstraints}`,
  ];

  // Extract constraints — technical terms preserved
  const constraints = new Set();
  for (const a of result.amplifications) {
    if (a.risk_level === "high") {
      if (a.node_id.includes("conflict_policy")) {
        const fieldName = a.node_id.replace("hc:conflict_policy:", "");
        constraints.add(`- ${t("context.conflictPolicy")}: ${fieldName} ${t("context.requiresVectorClock")}`);
      }
      if (a.node_id.includes("forbidden")) {
        const faNode = graph.nodes.find(n => n.node_id === a.node_id);
        constraints.add(`- ${t("context.forbiddenAssumption")}: ${faNode?.label || a.node_id}`);
      }
    }
  }
  if (constraints.size === 0) constraints.add(`- ${t("context.noHighRisk")}`);
  lines.push(...constraints);

  return lines.join("\n");
}

// ============================================================
// Fixture check
// ============================================================

async function runFixtureCheck() {
  try {
    const res = await fetch("./data/sample_blast_radius_report.json");
    if (!res.ok) return;
    const fixture = await res.json();

    const expected = fixture.summary;
    const result = computeBlastRadius(fixture.request.changed_nodes.filter(n =>
      graph.nodes.some(nd => nd.node_id === n)
    ));
    if (!result) return;

    if (result.downstream !== expected.total_downstream ||
        result.files !== expected.affected_files ||
        result.tests !== expected.affected_tests) {
      document.getElementById("fixture-banner").classList.remove("hidden");
      console.warn("Fixture mismatch:", { expected: expected, got: result });
    }
  } catch (e) {
    // No fixture available, skip
  }
}

// ============================================================
// Toast
// ============================================================

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("show"); }, 2000);
  setTimeout(() => { toast.classList.add("hidden"); }, 2300);
}

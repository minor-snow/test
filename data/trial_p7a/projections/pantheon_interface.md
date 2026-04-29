# InterfaceSpec: `pantheon_interface`

> **Revision:** `rev_084aa62d29f1` · **Schema:** `interface_spec@0.1.0` · **Type:** InterfaceSpec
> **Parent:** `rev_154aac3e4895`

---

## Store API

<sub>section: `sec_store_api`</sub>

### 🔌 Interface: `b_iface_001`

**Status:** 📝 Draft

GET /api/revisions/:artifactId returns the list of all revision IDs for the given artifact, ordered by creation time descending.

**Terms:** `revision`

<sub>hash: `sha256:2b32baa7985d0…`</sub>

---

### 🔌 Interface: `b_iface_002`

**Status:** 📝 Draft

GET /api/canonical/:artifactId returns the current canonical pointer including the artifact identifier and the revision identifier.

**Terms:** `canonical`

<sub>hash: `sha256:7cc292fc26590…`</sub>

---

### 🔌 Interface: `b_iface_003`

**Status:** 📝 Draft

POST /api/artifact creates a new artifact in the store. The request body must be a valid Artifact JSON conforming to the registered schema_version.

**Terms:** `artifact`

<sub>hash: `sha256:4bb3eba9bcb7c…`</sub>

---

### 🔌 Interface: `b_iface_004`

**Status:** 📝 Draft

PUT /api/canonical/:artifactId updates the canonical pointer to a new revision_id. The target revision must already exist in the store.

**Terms:** `canonical`

<sub>hash: `sha256:eac7833a8baf7…`</sub>

---

### 🔌 Interface: `b_iface_005`

**Status:** 📝 Draft

GET /api/audit/:artifactId returns the append-only audit log as newline-delimited JSON entries.

**Terms:** `audit_log`

<sub>hash: `sha256:8575484d1957b…`</sub>

---

### 🔌 Interface: `b_iface_006`

**Status:** 📝 Draft

DELETE /api/quarantine/:id removes a quarantined item after it has been promoted to evidence or explicitly rejected.

<sub>hash: `sha256:478c5323366d7…`</sub>

---

### 🔌 Interface: `b_iface_007`

**Status:** 📝 Draft

GET /api/quarantine returns all items currently in quarantine, with their validation status.

<sub>hash: `sha256:a5d41d70af79a…`</sub>

---

## Gate & Validation API

<sub>section: `sec_gate_api`</sub>

### 🔌 Interface: `b_iface_008`

**Status:** 📝 Draft

POST /api/validate accepts a raw SkillOutput JSON and runs it through the four-gate validation pipeline: schema, source reference, capability, and type-specific invariant gates.

**Terms:** `gate`

<sub>hash: `sha256:56936df89ae71…`</sub>

---

### 🔌 Interface: `b_iface_009`

**Status:** 📝 Draft

The response includes a per-gate breakdown: each gate reports passed/failed status and an array of error messages.

<sub>hash: `sha256:a6eabfe9b0556…`</sub>

---

### 🔌 Interface: `b_iface_010`

**Status:** 📝 Draft

POST /api/patch/compile accepts a PatchProposal and returns an ArtifactPatch with expected_old_hash populated for each operation.

**Terms:** `patch`

<sub>hash: `sha256:3f2a17c4e94d0…`</sub>

---

### 🔌 Interface: `b_iface_011`

**Status:** 📝 Draft

POST /api/patch/apply accepts an ArtifactPatch and returns either an accepted result with the candidate revision, or a rejected result with the reason code.

<sub>hash: `sha256:86ca88098a055…`</sub>

---

### 🔌 Interface: `b_iface_012`

**Status:** 📝 Draft

POST /api/regression/check runs semantic regression analysis on a candidate revision against the current canonical.

<sub>hash: `sha256:deccdff12cd89…`</sub>

---

### 🔌 Interface: `b_iface_013`

**Status:** 📝 Draft

POST /api/override/apply records a human override decision for a failed semantic regression gate.

<sub>hash: `sha256:9156d29d897da…`</sub>

---

### 🔌 Interface: `b_iface_014`

**Status:** 📝 Draft

GET /api/integrity returns the latest integrity check report including corruption count, warning count, and detailed findings.

<sub>hash: `sha256:720fa3d77b65b…`</sub>

---

## Linter & Trial API

<sub>section: `sec_linter_api`</sub>

### 🔌 Interface: `b_iface_015`

**Status:** 📝 Draft

POST /api/lint accepts an Artifact JSON and returns an array of Issue objects detected by the deterministic linter rules.

**Terms:** `issue`

<sub>hash: `sha256:ccc073a02d26a…`</sub>

---

### 🔌 Interface: `b_iface_016`

**Status:** 📝 Draft

POST /api/trial/start initiates a trial run with the specified seed artifact, LLM client configuration, and cycle limit.

<sub>hash: `sha256:15bdde3db362d…`</sub>

---

### 🔌 Interface: `b_iface_017`

**Status:** 📝 Draft

GET /api/trial/report returns the current TrialReport including cycle results, rejection taxonomy, and override breakdown.

<sub>hash: `sha256:d0511ce886fb2…`</sub>

---

### 🚧 Constraint: `b_iface_018`

**Status:** 📝 Draft

In legacy mode, trial results were committed instantly to the canonical store without validation. This endpoint is now disabled.

<sub>hash: `sha256:60f5e3d94bffe…`</sub>

---

### 🚧 Constraint: `b_iface_019`

**Status:** 📝 Draft

The `trial_orchestrator` coordinates with the `cycle_scheduler` to determine which issues to attempt in each cycle.

<sub>hash: `sha256:41c100edb3267…`</sub>

---

### 🚧 Constraint: `b_iface_020`

**Status:** 📝 Draft

The `response_parser` extracts structured PatchProposal JSON from raw LLM output, handling markdown fences and whitespace.

<sub>hash: `sha256:70fd2be699f70…`</sub>

---


<sub>Generated from JSON Artifact. This Markdown is a read-only projection (ref: C-01).</sub>
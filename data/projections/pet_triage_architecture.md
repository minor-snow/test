# ArchitectureDraft: `pet_triage_architecture`

> **Revision:** `rev_50e5090eaf19` · **Schema:** `architecture_draft@0.1.0` · **Type:** ArchitectureDraft

---

## Client Triage Flow

<sub>section: `sec_client_flow`</sub>

### ⚙️ Mechanism: `b_pet_arch_001`

**Status:** ✅ Approved

The Android client collects species, temperature, and free-text symptom description locally, and only submits a triage request when the operator explicitly starts analysis.

> **Rationale:** Mirrors DiagnoseScreen input collection before the VetNet call.

**Terms:** `android_client`, `species`, `temperature`, `symptom_description`, `triage_request`

<sub>hash: `sha256:4674d619326d1…`</sub>

---

### 🚧 Constraint: `b_pet_arch_002`

**Status:** ✅ Approved

All client triage decisions must request the backend triage engine in real time before any diagnosis result is shown to the operator.

> **Rationale:** The current app computes diagnosis by calling VetNet.diagnose and does not host a client-side decision engine.

**Terms:** `online_first`, `triage_engine`, `strong_sync`, `backend_authority`

<sub>hash: `sha256:deca8829f857b…`</sub>

---

### ⚙️ Mechanism: `b_pet_arch_003`

**Status:** ✅ Approved

After a successful backend response, the client stores the symptom description, returned risk level, first suspected condition, and optional temperature in local Room tables.

> **Rationale:** MainActivity writes HistoryRecord and VitalRecord only inside the success callback.

**Terms:** `room_cache`, `history_table`, `vitals_table`, `risk_level`, `suspected_condition`

<sub>hash: `sha256:7fa688da462c8…`</sub>

---

## Network Authority and Availability

<sub>section: `sec_network_authority`</sub>

### 🚧 Constraint: `b_pet_arch_004`

**Status:** ✅ Approved

When the network is unavailable, the client must lock the triage screen to prevent dirty data and incomplete reports from being treated as valid triage output.

> **Rationale:** The original workflow has no offline completion path and treats network failure as a hard stop.

**Terms:** `network_lock`, `dirty_data`, `incomplete_report`, `connectivity_failure`

<sub>hash: `sha256:ccbbba1051aab…`</sub>

---

### 🚧 Constraint: `b_pet_arch_005`

**Status:** ✅ Approved

A failed backend call ends the triage attempt with UI error feedback, and the client must not persist a diagnosis or pending report when no authoritative response was returned.

> **Rationale:** The error callback only surfaces a toast and leaves diagnosisResult unset.

**Terms:** `error_feedback`, `pending_report`, `authoritative_response`

<sub>hash: `sha256:d7c339ebf6e7c…`</sub>

---

### 🔒 Invariant: `b_pet_arch_006`

**Status:** ✅ Approved

The system depends on a single backend diagnosis engine; no secondary clinic node, replica, or embedded fallback engine participates in decision making.

> **Rationale:** VetNet is configured against one BASE_URL and no alternate authority exists in the mobile app.

**Terms:** `single_backend`, `replica`, `fallback_engine`, `base_url`

<sub>hash: `sha256:84d3c60df07c7…`</sub>

---

## Local Storage Boundary

<sub>section: `sec_local_storage`</sub>

### 🔒 Invariant: `b_pet_arch_007`

**Status:** ✅ Approved

Local Room storage is a record cache for history_table and vitals_table, not an authoritative triage decision source.

> **Rationale:** The app reads local history and recent temperatures, but diagnosis generation still depends on the backend call.

**Terms:** `room_cache`, `history_table`, `vitals_table`, `authoritative_source`

<sub>hash: `sha256:d760d5768cc1c…`</sub>

---

### 🚧 Constraint: `b_pet_arch_008`

**Status:** ✅ Approved

The client must not execute the multi-step triage tree offline or cache partially completed decision branches for later merge.

> **Rationale:** The current design contains no offline decision tree state, queue, or merge semantics.

**Terms:** `decision_tree`, `offline_flow`, `partial_branch`, `merge`

<sub>hash: `sha256:70a068592e2d8…`</sub>

---

### ⚙️ Mechanism: `b_pet_arch_009`

**Status:** ✅ Approved

Recent temperature history is rendered locally from vitals_table for dashboard display and does not trigger backend recomputation by itself.

> **Rationale:** HomeScreen reads the latest VitalRecord entries from Room LiveData.

**Terms:** `recent_vitals`, `dashboard`, `vitals_table`

<sub>hash: `sha256:43e9a4e14737b…`</sub>

---

## Backend Decision Contract

<sub>section: `sec_backend_contract`</sub>

### 🔌 Interface: `b_pet_arch_010`

**Status:** ✅ Approved

The diagnosis engine accepts description, species, and optional temperature in one synchronous request and returns risk_level, suspected_conditions, rationale, and next_steps in one response.

> **Rationale:** This is the concrete request and response shape encoded in VetNet CaseRequest and DiagnosisResponse.

**Terms:** `diagnose_request`, `risk_level`, `suspected_conditions`, `rationale`, `next_steps`

<sub>hash: `sha256:48df8b4041340…`</sub>

---

### 📋 Decision: `b_pet_arch_011`

**Status:** ✅ Approved

The first suspected condition from the backend response is persisted as the local condition summary shown in the history view.

> **Rationale:** MainActivity persists response.suspected_conditions.firstOrNull() as the condition field.

**Terms:** `local_condition_summary`, `history_view`, `suspected_conditions`

<sub>hash: `sha256:47284197f0721…`</sub>

---

### 🚧 Constraint: `b_pet_arch_012`

**Status:** ✅ Approved

The client treats the backend response as the only valid diagnosis payload and does not merge server output with locally edited medical state.

> **Rationale:** The original design has no client-side conflict handling or multi-source reconciliation.

**Terms:** `server_authority`, `diagnosis_payload`, `conflict_handling`

<sub>hash: `sha256:963806e96d038…`</sub>

---

## Synchronization Model

<sub>section: `sec_sync_model`</sub>

### 🔒 Invariant: `b_pet_arch_013`

**Status:** ✅ Approved

The v1 system has no background sync queue, no retry ledger, and no per-record version vector for triage data.

> **Rationale:** Neither the Android client nor the backend adapter model deferred writes or replicated history reconciliation.

**Terms:** `background_sync`, `retry_queue`, `version_vector`, `replication`

<sub>hash: `sha256:ce24f92524c6f…`</sub>

---

### ⚠️ Risk: `b_pet_arch_014`

**Status:** ✅ Approved

Any loss of connectivity during triage blocks completion because the architecture couples diagnosis generation to immediate server availability.

> **Rationale:** The operator cannot obtain a result if VetNet fails.

**Terms:** `availability_risk`, `connectivity_loss`, `server_availability`

<sub>hash: `sha256:04c9e20d04543…`</sub>

---

### 🚧 Constraint: `b_pet_arch_015`

**Status:** ✅ Approved

The system assumes a single authoritative write path, so concurrent edits from another clinic are outside the v1 design envelope.

> **Rationale:** No multi-clinic or multi-writer protocol exists in the original implementation.

**Terms:** `single_writer`, `multi_clinic`, `concurrent_edit`

<sub>hash: `sha256:ec6c9b26ea8bc…`</sub>

---

## Operational Risks and Gaps

<sub>section: `sec_operational_risks`</sub>

### ⚠️ Risk: `b_pet_arch_016`

**Status:** ✅ Approved

The mobile adapter is coupled to one HTTP diagnosis endpoint and one backend model runtime, which creates a single point of failure for all triage decisions.

> **Rationale:** VetNet configures exactly one BASE_URL and one OkHttp request path.

**Terms:** `http_endpoint`, `single_point_of_failure`, `okhttp`

<sub>hash: `sha256:7e9bb322e55f4…`</sub>

---

### ⚠️ Risk: `b_pet_arch_017`

**Status:** ✅ Approved

Because no pending report exists, operators must re-enter symptoms after a timeout or disconnect, increasing abandonment and data loss risk.

> **Rationale:** The app neither stores an offline draft nor resumes failed submissions.

**Terms:** `timeout`, `reentry_risk`, `data_loss`, `abandonment`

<sub>hash: `sha256:208e1f4b9ae52…`</sub>

---

### ❓ Open Question: `b_pet_arch_018`

**Status:** ✅ Approved

Conflict resolution, offline report drafting, and multi-clinic replication are intentionally undefined in v1.

> **Rationale:** These gaps are exactly the seams that an offline-first evolution would need to redesign.

**Terms:** `conflict_resolution`, `offline_report`, `multi_clinic_replication`

<sub>hash: `sha256:8d303ec719472…`</sub>

---


<sub>Generated from JSON Artifact. This Markdown is a read-only projection (ref: C-01).</sub>
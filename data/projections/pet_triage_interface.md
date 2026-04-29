# InterfaceSpec: `pet_triage_interface`

> **Revision:** `rev_6e62a0114bb5` · **Schema:** `interface_spec@0.1.0` · **Type:** InterfaceSpec

---

## Triage Submit API

<sub>section: `sec_submit_api`</sub>

### 🔌 Interface: `b_pet_iface_001`

**Status:** ✅ Approved

POST /triage/submit accepts a JSON body with description:string, species:string, and optional temperature:number.

> **Rationale:** This is the normalized REST form of the VetNet request payload used by the Android client.

**Terms:** `triage_submit`, `description`, `species`, `temperature`

<sub>hash: `sha256:c05098d926410…`</sub>

---

### 🔌 Interface: `b_pet_iface_002`

**Status:** ✅ Approved

POST /triage/submit is synchronous: the request blocks until the backend triage engine returns the final diagnosis payload or fails.

> **Rationale:** The original app waits on one OkHttp callback and has no async acceptance handshake.

**Terms:** `synchronous_api`, `triage_engine`, `strong_sync`

<sub>hash: `sha256:606929b4c48c4…`</sub>

---

### 🔌 Interface: `b_pet_iface_003`

**Status:** ✅ Approved

A successful 200 response contains risk_level, suspected_conditions[], rationale, and next_steps for one completed triage decision.

> **Rationale:** Matches the DiagnosisResponse fields shown in the UI.

**Terms:** `risk_level`, `suspected_conditions`, `rationale`, `next_steps`

<sub>hash: `sha256:5fa4297f6f104…`</sub>

---

### 🔌 Interface: `b_pet_iface_004`

**Status:** ✅ Approved

The client must not commit a local diagnosis record until a successful response from POST /triage/submit has been parsed.

> **Rationale:** HistoryRecord and VitalRecord are written only after onSuccess.

**Terms:** `local_commit`, `history_record`, `success_response`

<sub>hash: `sha256:35eb7b24bdc11…`</sub>

---

## Failure Contract

<sub>section: `sec_failure_contract`</sub>

### 🔌 Interface: `b_pet_iface_005`

**Status:** ✅ Approved

Network timeout or transport failure is terminal for that triage attempt and returns no authoritative diagnosis payload.

> **Rationale:** The mobile client surfaces an error and leaves the triage unresolved.

**Terms:** `network_timeout`, `transport_failure`, `terminal_failure`

<sub>hash: `sha256:e3eb2a253ed0d…`</sub>

---

### 🔌 Interface: `b_pet_iface_006`

**Status:** ✅ Approved

The interface exposes no offline submission endpoint, no deferred upload token, and no queue handshake for later replay.

> **Rationale:** v1 is online-first and strong-sync only.

**Terms:** `offline_submission`, `deferred_upload`, `queue_handshake`

<sub>hash: `sha256:d988cca01a4b2…`</sub>

---

### 🔌 Interface: `b_pet_iface_007`

**Status:** ✅ Approved

The contract exposes no conflict metadata such as version vectors, last-writer markers, or server change tokens.

> **Rationale:** There is no protocol for reconciling concurrent clinic updates in v1.

**Terms:** `version_vector`, `last_writer_wins`, `change_token`, `conflict_metadata`

<sub>hash: `sha256:41bc913268c94…`</sub>

---

## Client Persistence Semantics

<sub>section: `sec_client_persistence`</sub>

### 🔌 Interface: `b_pet_iface_008`

**Status:** ✅ Approved

On success the client stores a history summary with date, symptoms, riskLevel, and condition, and may also append one temperature vital locally.

> **Rationale:** This mirrors the Room insert behavior after diagnosis success.

**Terms:** `history_summary`, `riskLevel`, `condition`, `temperature_vital`

<sub>hash: `sha256:6ad0e7fe7ff51…`</sub>

---

### 🔌 Interface: `b_pet_iface_009`

**Status:** ✅ Approved

On failure the client may display an error toast, but it must not create a pending report, partial triage record, or synthetic diagnosis.

> **Rationale:** v1 errors are terminal and no offline artifact is created.

**Terms:** `error_toast`, `partial_triage`, `synthetic_diagnosis`

<sub>hash: `sha256:bd5d2c925dc60…`</sub>

---

### 🔌 Interface: `b_pet_iface_010`

**Status:** ✅ Approved

The interface contract assumes one backend authority for each triage decision and does not define reconciliation between clinic replicas.

> **Rationale:** This keeps the seed faithful to the original single-backend design.

**Terms:** `backend_authority`, `clinic_replica`, `reconciliation`

<sub>hash: `sha256:132e86d498823…`</sub>

---


<sub>Generated from JSON Artifact. This Markdown is a read-only projection (ref: C-01).</sub>
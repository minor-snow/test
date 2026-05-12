# Clarion Error Codes

When a command fails or a request is rejected, Clarion returns a standardized error code in the `errors` array of the JSON envelope.

## Global Error Codes

| Code | Meaning | Required Action |
| :--- | :--- | :--- |
| `internal_error` | An unexpected engine failure. | Check logs and run `clarion doctor`. |
| `invalid_argument` | Missing or malformed command arguments. | Check usage with `--help`. |
| `repo_not_found` | The specified path is not a valid Clarion workspace. | Ensure the target directory has been initialized. |
| `busy` / `console_command_in_flight` | Another mutation command is currently running. | Wait for the previous action to finish. |
| `permission_denied` | Insufficient permissions to write to the `.pantheon` store. | Check file system permissions. |

## DSA Specific Errors

| Code | Meaning | Required Action |
| :--- | :--- | :--- |
| `candidate_not_found` | The requested candidate ID does not exist. | Refresh the candidate list with `dsa review list`. |
| `stale_candidate` | The source code has changed since the candidate was created. | Re-run `dsa observe`. |
| `contract_violation` | A proposed candidate violates a hard policy. | Review the evidence and impact in `dsa review show`. |

## Workgraph Specific Errors

| Code | Meaning | Required Action |
| :--- | :--- | :--- |
| `work_item_locked` | Another actor has already claimed this item. | Check `workgraph list` for ownership. |
| `dependency_missing` | A parent work item has not been completed. | Complete the prerequisites first. |
| `conflict_detected` | Overlapping file changes detected across items. | Resolve the conflict manually or re-sequence. |

## Agent Gateway Errors

| Code | Meaning | Required Action |
| :--- | :--- | :--- |
| `unsafe_payload` | The input envelope contains absolute paths or suspicious metadata. | Sanitize the envelope to use relative paths only. |
| `session_expired` | The agent session has timed out or was closed. | Start a new session with `agent submit`. |
| `invalid_envelope_schema` | The JSON envelope version or type is incorrect. | Update the agent's envelope generator to `clarion.agent.v1`. |

## Safety Note
Clarion error messages are sanitized for public consumption. If you need full stack traces for debugging, check the internal logs in `.pantheon/internal/logs/` (if enabled in your environment).

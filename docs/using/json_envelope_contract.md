# JSON Envelope Contract

All Clarion CLI commands executed with the `--json` flag emit a standardized `CliResultEnvelope`. This contract ensures that external consumers (agents, CI, and the Local Console) can reliably parse results regardless of the underlying command.

## Schema Version
Current Version: `pantheon_cli_result@0.1.0`

## Base Envelope Structure

```json
{
  "schema_version": "string",
  "command": "string",
  "target_type": "string",
  "status": "ok | failed | busy | not_found | unsafe_payload",
  "summary": {
    "// command-specific structured data": "..."
  },
  "errors": [
    {
      "code": "string",
      "message": "string",
      "severity": "error | critical"
    }
  ],
  "warnings": [
    {
      "code": "string",
      "message": "string"
    }
  ],
  "next_action_intents": [
    {
      "intent": "string",
      "command_suggestion": "string"
    }
  ]
}
```

## Field Definitions

### `status`
- `ok`: The command completed successfully and the result is available.
- `failed`: An error occurred during execution. Check the `errors` array.
- `busy`: Another mutation command is currently in flight for this repository (Single-flight protection).
- `not_found`: The requested resource (e.g., candidate ID) does not exist.
- `unsafe_payload`: The input payload failed safety validation (e.g., contains absolute paths).

### `summary`
This is a command-specific object. For example, `dsa observe` returns fact and candidate counts, while `agent submit` returns a `work_item_id`.

### `errors` and `warnings`
These arrays contain sanitized, public-safe diagnostic information. **Crucially, these fields never contain absolute system paths or stack traces.**

### `next_action_intents`
Provides machine-readable suggestions for the next step in the workflow. This allows agents to "chain" commands together without guessing.

## Safety Guarantees
- **No Absolute Paths**: All paths in the JSON output are relative to the repository root.
- **Sanitized Details**: Stack traces and internal implementation details are redacted to prevent leakage of proprietary logic.
- **Deterministic**: The output is stable and suitable for programmatic parsing.

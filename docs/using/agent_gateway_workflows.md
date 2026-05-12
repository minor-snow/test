# Agent Gateway Workflows

The Agent Gateway is the strict perimeter for all autonomous work submission.

## Standard Session Lifecycle

### 1. Submission
`clarion agent submit --envelope @payload.json`
- **Envelope**: Agents must provide a validated JSON envelope.
- **Result**: Creates an `Agent Session` linked to a `Work Item`.

### 2. Progress Reporting
`clarion agent progress --envelope @payload.json`
- **Updates**: Incremental reports of work being done.
- **Traceability**: These updates are appended to the session transcript.

### 3. Completion
`clarion agent complete --envelope @payload.json`
- **Final Result**: The agent reports success or failure.
- **Review**: The session enters a state where the operator can review the final transcript.

## Safety Constraints
The Gateway enforces strict safety checks on all input envelopes:
- **No Absolute Paths**: Any path starting with `C:\`, `/home/`, etc., is rejected.
- **Unsafe Metadata**: Detects and rejects potentially dangerous shell-like commands in metadata fields.

## Session Transcripts
Run `clarion agent sessions` to see active and past sessions.
Each session maintains a "Sanitized Transcript" that shows:
- What the agent did.
- When they did it.
- Which files were affected.

This transcript is the primary source of truth for human reviewers to approve or audit an agent's work.

# Local Review Console

The Local Review Console is a browser-based visualization tool that allows human operators to manage the Clarion workflow with zero friction.

## Key Features

### 1. Dashboard
A high-level view of your repository's health.
- Count of pending candidates.
- Status of active work items.
- Active agent sessions.

### 2. Candidate Review Panel
Visualize architectural drift.
- View natural-language "Readability Summaries" of why a candidate was created.
- Review evidence packs (which files/lines triggered the observation).
- Approve or Reject with a single click.

### 3. Workgraph Timeline
A chronological view of all events in the repository.
- Track state transitions for work items.
- See dependencies and blockers.

### 4. Agent Session Monitoring
Monitor your AI agents in real-time.
- View sanitized transcripts.
- See progress reports and completion summaries.

## The "Command First" Philosophy
Every action button in the console is a "Thin Shell" around a Clarion CLI command.
- When you click "Approve", the console shows you the exact `clarion dsa review approve <id> --json` command it is about to run.
- This ensures transparency and helps you learn the CLI.

## Security & Access
- **Localhost Only**: The console binds to `127.0.0.1`. It is not accessible over the network.
- **Read-Only First**: Data is fetched via the CLI JSON contract. The UI never writes directly to the `.pantheon` internal stores.
- **Single-Flight Guard**: The console prevents double-clicking or conflicting mutation commands by locking the UI while a command is in flight.

## Getting Started
First, install the UI dependencies (only needed once):
`npm run console:install`

Then, run the console (Backend + UI):
`npm run console`

Then navigate to `http://localhost:5173`.

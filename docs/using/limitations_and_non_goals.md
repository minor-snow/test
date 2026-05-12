# Limitations & Non-Goals

Clarion is designed with a specific focus on structural governance and agent coordination. Understanding its limitations is key to successful operation.

## Limitations

### 1. No Auto-Correction
Clarion identifies drift and enforces boundaries, but it does **not** automatically refactor your code to fix violations. This is a deliberate design choice to maintain human-in-the-loop control.

### 2. Static Analysis Depth
Clarion's `dsa observe` relies on deterministic static analysis. It may miss complex dynamic behaviors or runtime-only dependencies that are not visible in the source tree.

### 3. Single-User UI (P18-1)
The current Local Review Console is designed for a single operator on `localhost`. It does not support multi-user authentication or concurrent sessions from different machines.

### 4. Git Dependency
Clarion assumes the repository is managed by Git. Many of its safety checks and workgraph transitions rely on Git's internal state (hashes, branch heads).

## Non-Goals

### 1. General Purpose CI/CD
Clarion is not intended to replace tools like GitHub Actions, Jenkins, or CircleCI. It is a specialized governance layer that runs *within* or alongside those tools.

### 2. Code Quality Linter
While Clarion checks architectural structure, it is not a linter for code style (e.g., Prettier/ESLint). It cares about **where** code lives and **what** it depends on, not how many spaces are used for indentation.

### 3. Build System
Clarion does not compile code or manage package installation. It assumes a pre-existing build environment.

### 4. Direct Source Mutation via UI
The Local Console will never include a text editor to directly change source code. All code changes must happen through your IDE or an agent, which then submits the changes back through the Clarion gateway for validation.

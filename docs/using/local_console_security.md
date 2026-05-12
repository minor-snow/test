# Local Console Security

The Local Review Console is built with a "Security by Default" architecture to ensure your repository metadata and governance state remain private.

## Network Isolation
- **Localhost Only**: The console server binds strictly to `127.0.0.1`. It is not reachable from other machines on your local network or the internet.
- **Port Binding**: By default, the frontend UI runs on `5173` and the backend proxy runs on `3000`. Both bind strictly to `127.0.0.1`.

## Execution Model
- **CLI-Only Access**: The console UI and its backend do not have direct write access to the `.pantheon` internal stores. All mutations (approve, reject, claim, etc.) are executed by spawning a local Clarion CLI process.
- **Zero-Trust Input**: The `REPO_ROOT` is validated to ensure it is a real directory and is not vulnerable to shell injection.

## Data Privacy
- **Sanitized Projection**: The UI only receives "Sanitized Projections" from the backend. This means internal state, absolute file paths, and raw database logs are never sent to the browser.
- **No Cloud Dependency**: The console runs entirely on your local machine. No data is sent to external servers for processing or storage.

## Single-User Assumption
- **No Authentication**: Because it is restricted to `localhost`, the console does not implement a login or password system. Access to the console is equivalent to access to your local machine.
- **Session Locking**: A per-repo "Single-Flight Guard" prevents multiple simultaneous mutation commands, ensuring that you don't accidentally corrupt the local governance state through the UI.

## Recommendations
- **Do not** attempt to proxy the console to the public internet.
- **Do not** run the console as a root/administrator user unless your repository requires it.
- **Run in Trusted Environments**: Only run the console on repositories you trust, as it will execute CLI commands on that project.

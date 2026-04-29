# Agent Quickstart

## Step 0: Read protocol

Read `AGENTS.md`.

## Step 1: Verify repo

Run:

`npm install`

`npm run build`

`node ./node_modules/typescript/bin/tsc --noEmit`

`node dist/src/cli/pantheon-alpha.js doctor`

## Step 2: When you find a bug

Do not patch.

Create:

`.pantheon/repair/inbox/agent_bug_report.json`

Use template:

`.pantheon/repair/inbox/agent_bug_report.template.json`

## Step 3: Run intake

`node dist/src/cli/pantheon-alpha.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json`

Capture the `repair_id`.

## Step 4: Generate plan

`node dist/src/cli/pantheon-alpha.js repair plan --repair-id <repair_id>`

Read:

`.pantheon/repair/runs/<repair_id>/repair_task.md`

## Step 5: Patch only allowed files

Do not edit forbidden files.

## Step 6: Check

`node dist/src/cli/pantheon-alpha.js repair check --repair-id <repair_id>`

Read:

`.pantheon/repair/runs/<repair_id>/repair_feedback.md`

## Step 7: If Pantheon requires review

Stop modifying review-required files and run:

`node dist/src/cli/pantheon-alpha.js review list`

`node dist/src/cli/pantheon-alpha.js review show --repair-id <repair_id>`

You can also inspect local governance metrics with:

`node dist/src/cli/pantheon-alpha.js metrics daily`

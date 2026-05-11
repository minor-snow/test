#!/usr/bin/env bash
set -e

echo "Running Clarion Public CLI Conformance Smoke Tests..."

if [ -n "$CLARION_BIN" ]; then
  export PANTHEON="$CLARION_BIN"
elif [ -x "./node_modules/.bin/pantheon" ]; then
  export PANTHEON="./node_modules/.bin/pantheon"
elif command -v pantheon >/dev/null 2>&1; then
  export PANTHEON="$(command -v pantheon)"
elif [ -x "../dist/src/cli/pantheon.js" ]; then
  export PANTHEON="node ../dist/src/cli/pantheon.js"
else
  echo "Clarion CLI not found. Set CLARION_BIN or install pantheon." >&2
  exit 2
fi

echo "Using CLI at: $PANTHEON"

echo "Running Vitest test suite..."
npm run test

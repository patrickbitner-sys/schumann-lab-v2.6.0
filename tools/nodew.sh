#!/usr/bin/env bash
set -euo pipefail

if command -v node >/dev/null 2>&1; then
  if node -v >/dev/null 2>&1; then
    exec node "$@"
  fi
fi

VSCODE_NODE="/home/patri/.vscode-server/bin/072586267e68ece9a47aa43f8c108e0dcbf44622/node"
if [ -x "$VSCODE_NODE" ]; then
  exec "$VSCODE_NODE" "$@"
fi

echo "No working node binary found." >&2
echo "Install Node.js (recommended 20+) or adjust tools/nodew.sh." >&2
exit 1

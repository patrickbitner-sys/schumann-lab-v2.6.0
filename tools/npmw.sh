#!/usr/bin/env bash
set -euo pipefail

if command -v npm >/dev/null 2>&1; then
  if npm -v >/dev/null 2>&1; then
    exec npm "$@"
  fi
fi

VSCODE_NODE="/home/patri/.vscode-server/bin/072586267e68ece9a47aa43f8c108e0dcbf44622/node"
WIN_NPM_CLI="/mnt/c/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"

if [ -x "$VSCODE_NODE" ] && [ -f "$WIN_NPM_CLI" ]; then
  export APPDATA="${APPDATA:-/mnt/c/Users/patri/AppData/Roaming}"
  exec "$VSCODE_NODE" "$WIN_NPM_CLI" "$@"
fi

echo "No working npm runtime found." >&2
echo "Install Node.js/npm or adjust tools/npmw.sh." >&2
exit 1

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROBE="$ROOT/.github/scripts/steward-plugin-lock.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

assert_probe() {
  local expected_status="$1" expected_state="$2" command="$3"
  local output status=0
  if output="$(PLUGIN_LOCK_ROOT="$TMP" PLUGIN_LOCK_CHECK_CMD="$command" bash "$PROBE")"; then
    status=0
  else
    status=$?
  fi
  [[ "$status" -eq "$expected_status" ]] || { echo "expected status $expected_status, got $status: $output" >&2; exit 1; }
  [[ "$output" == "$expected_state"$'\t'* ]] || { echo "expected state $expected_state, got: $output" >&2; exit 1; }
}

assert_probe 0 HEALTHY "printf 'plugin lock: ok (2 components)\\n'"
assert_probe 1 DRIFT "printf 'plugin lock mismatch; run pnpm plugins:lock:write and review the diff\\n' >&2; exit 1"
assert_probe 1 DRIFT "printf 'plugin lock mismatch; malformed plugins.lock.json\\n' >&2; exit 1"
assert_probe 2 TOOLING "printf 'tsx: command not found\\n' >&2; exit 127"

echo "steward plugin-lock probe: ok"

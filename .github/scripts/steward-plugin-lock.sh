#!/usr/bin/env bash
set -uo pipefail

ROOT="${PLUGIN_LOCK_ROOT:-$(pwd)}"
CHECK_CMD="${PLUGIN_LOCK_CHECK_CMD:-pnpm plugins:lock:check}"
MAX_EVIDENCE_BYTES="${PLUGIN_LOCK_EVIDENCE_BYTES:-400}"

output=""
status=0
if output="$(cd "$ROOT" && bash -lc "$CHECK_CMD" 2>&1)"; then
  printf 'HEALTHY\t%s\n' "$(printf '%s' "$output" | head -n1 | cut -c1-"$MAX_EVIDENCE_BYTES")"
  exit 0
else
  status=$?
fi

evidence="$(printf '%s' "$output" | tr '\n\r\t' '   ' | sed -E 's/[[:space:]]+/ /g' | cut -c1-"$MAX_EVIDENCE_BYTES")"
if grep -Fq 'plugin lock mismatch' <<<"$output"; then
  printf 'DRIFT\t%s\n' "$evidence"
  exit 1
fi

printf 'TOOLING\texit=%s %s\n' "$status" "$evidence"
exit 2

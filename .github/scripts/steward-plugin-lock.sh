#!/usr/bin/env bash
set -uo pipefail

ROOT="${PLUGIN_LOCK_ROOT:-$(pwd)}"
CHECK_CMD="${PLUGIN_LOCK_CHECK_CMD:-pnpm plugins:lock:check}"
MAX_EVIDENCE_BYTES="${PLUGIN_LOCK_EVIDENCE_BYTES:-400}"
MODE="${1:-probe}"

if [[ "$MODE" != "probe" && "$MODE" != "finding" ]]; then
  echo "usage: $0 [probe|finding]" >&2
  exit 64
fi

output=""
status=0
if output="$(cd "$ROOT" && bash -lc "$CHECK_CMD" 2>&1)"; then
  evidence="$(printf '%s' "$output" | head -n1 | cut -c1-"$MAX_EVIDENCE_BYTES")"
  if [[ "$MODE" == "probe" ]]; then
    printf 'HEALTHY\t%s\n' "$evidence"
  fi
  exit 0
else
  status=$?
fi

evidence="$(printf '%s' "$output" | tr '\n\r\t' '   ' | sed -E 's/[[:space:]]+/ /g' | cut -c1-"$MAX_EVIDENCE_BYTES")"
if grep -Fq 'plugin lock mismatch' <<<"$output"; then
  if [[ "$MODE" == "finding" ]]; then
    printf 'P1\tplugin-lock\tPlugin manifest/lock drift detected.\t%s\n' "$evidence"
    exit 0
  fi
  printf 'DRIFT\t%s\n' "$evidence"
  exit 1
fi

if [[ "$MODE" == "finding" ]]; then
  printf 'P1\tplugin-lock\tPlugin lock verification could not run.\texit=%s %s\n' "$status" "$evidence"
  exit 0
fi

printf 'TOOLING\texit=%s %s\n' "$status" "$evidence"
exit 2

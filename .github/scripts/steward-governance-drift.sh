#!/usr/bin/env bash
set -euo pipefail

mode="${1:-probe}"
check_script="${GOVERNANCE_CHECK_SCRIPT:-.github/scripts/governance-check.sh}"

compact_evidence() {
  tr '\n\t' '  ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//' | cut -c1-400
}

state="HEALTHY"
evidence="governance catalog matches required labels and milestones"

if [[ ! -f "$check_script" ]]; then
  state="TOOLING"
  evidence="governance check script is unavailable: $check_script"
else
  set +e
  output="$(GITHUB_STEP_SUMMARY= bash "$check_script" 2>&1)"
  status=$?
  set -e

  if (( status != 0 )); then
    drift_lines="$(printf '%s\n' "$output" | grep -E '^missing (label|milestone): ' || true)"
    if [[ -n "$drift_lines" ]]; then
      state="DRIFT"
      evidence="$(printf '%s' "$drift_lines" | compact_evidence)"
    else
      state="TOOLING"
      evidence="$(printf '%s' "$output" | compact_evidence)"
      [[ -n "$evidence" ]] || evidence="governance check failed without diagnostic output (exit=$status)"
    fi
  fi
fi

case "$mode" in
  probe)
    printf '%s\t%s\n' "$state" "$evidence"
    ;;
  finding)
    case "$state" in
      HEALTHY) ;;
      DRIFT)
        printf 'P1\tgovernance\tRequired governance catalog drift detected.\t%s\n' "$evidence"
        ;;
      TOOLING)
        printf 'P1\tgovernance\tGovernance drift probe could not complete.\t%s\n' "$evidence"
        ;;
    esac
    ;;
  *)
    echo "usage: $0 [probe|finding]" >&2
    exit 2
    ;;
esac

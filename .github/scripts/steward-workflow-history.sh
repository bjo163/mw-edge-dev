#!/usr/bin/env bash
set -euo pipefail

threshold="${1:-2}"
recovery_successes="${2:-2}"

if ! [[ "$threshold" =~ ^[1-9][0-9]*$ ]]; then
  echo "threshold must be a positive integer" >&2
  exit 2
fi
if ! [[ "$recovery_successes" =~ ^[1-9][0-9]*$ ]]; then
  echo "recovery_successes must be a positive integer" >&2
  exit 2
fi

failures=0
success_streak=0
evidence=()

while IFS=$'\t' read -r status conclusion url created; do
  [[ -n "$status" ]] || continue
  [[ "$status" == "completed" ]] || continue

  case "$conclusion" in
    success)
      success_streak=$((success_streak + 1))
      if (( success_streak >= recovery_successes )); then
        break
      fi
      ;;
    skipped|neutral)
      success_streak=0
      ;;
    *)
      failures=$((failures + 1))
      success_streak=0
      evidence+=("$url ($created; $conclusion)")
      ;;
  esac
done < <(jq -r '
  .[]
  | select(.event == "schedule")
  | [.status, (.conclusion // "pending"), (.url // ""), (.createdAt // "")]
  | @tsv
')

if (( failures >= threshold )); then
  joined=""
  if (( ${#evidence[@]} > 0 )); then
    joined="$(printf '%s\n' "${evidence[@]}" | paste -sd '; ' -)"
  fi
  printf 'REPEATED\t%d\t%s\n' "$failures" "$joined"
else
  printf 'HEALTHY\t%d\t\n' "$failures"
fi

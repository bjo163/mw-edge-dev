#!/usr/bin/env bash
set -euo pipefail

current_state="${1:-}"
case "$current_state" in
  HEALTHY|DEGRADED|BLOCKED) ;;
  *) echo "usage: $0 <HEALTHY|DEGRADED|BLOCKED>" >&2; exit 2 ;;
esac

previous_report="$(cat)"
previous_state="$(sed -n 's/^\*\*State:\*\* \([^[:space:]]*\).*$/\1/p' <<<"$previous_report" | head -n1)"
previous_checked="$(sed -n 's/^\*\*Checked:\*\* \([^[:space:]]*\).*$/\1/p' <<<"$previous_report" | head -n1)"
previous_recovery="$(sed -n 's/^\*\*Recovery:\*\* //p' <<<"$previous_report" | head -n1)"

if [[ "$current_state" != "HEALTHY" ]]; then
  exit 0
fi

case "$previous_state" in
  BLOCKED|DEGRADED)
    if [[ -n "$previous_checked" ]]; then
      printf 'Recovered from %s after previous unhealthy check at %s.\n' "$previous_state" "$previous_checked"
    else
      printf 'Recovered from %s.\n' "$previous_state"
    fi
    ;;
  HEALTHY)
    [[ -z "$previous_recovery" ]] || printf '%s\n' "$previous_recovery"
    ;;
esac

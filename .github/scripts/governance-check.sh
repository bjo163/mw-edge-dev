#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${REPO:?REPO is required}"

missing=0
summary="${GITHUB_STEP_SUMMARY:-}"

mapfile -t actual_labels < <(gh api --paginate "repos/$REPO/labels?per_page=100" --jq '.[].name' | sort)
mapfile -t actual_milestones < <(gh api --paginate "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title' | sort)

check_present() {
  local kind="$1" expected="$2"
  shift 2
  local item
  for item in "$@"; do
    if [[ "$item" == "$expected" ]]; then return 0; fi
  done
  echo "missing $kind: $expected" >&2
  [[ -z "$summary" ]] || printf -- '- FAIL missing %s: %s\n' "$kind" "$expected" >> "$summary"
  missing=1
}

while IFS='|' read -r name _rest; do
  [[ -z "$name" ]] || check_present label "$name" "${actual_labels[@]}"
done <<'LABELS'
type:task|Small executable task
type:feature|Feature or capability
type:bug|Defect
priority:P0|Release blocker
priority:P1|High priority
priority:P2|Normal priority
priority:P3|Future or low priority
area:kernel|Kernel and core contracts
area:domain|Business domain semantics
area:orm|Native ORM
area:db|Database and persistence
area:migration|Migrations and schema evolution
area:seed|Base reference and demo data
area:plugin|Plugin addon and profile system
area:ui|Metadata driven UI
area:api|HTTP API and contracts
area:security|Security and authorization boundaries
area:ops|Operations backup and observability
area:testing|Tests and release gates
area:release|Release and version automation
parallel-safe|Safe to execute in parallel
status:blocked|Blocked by dependency
good first issue|Small isolated task
LABELS

while IFS= read -r title; do
  [[ -z "$title" ]] || check_present milestone "$title" "${actual_milestones[@]}"
done <<'MILESTONES'
V0.1 — Business Engine Ready
V0.2 — Platform Hardening
V0.3 — Cloud & Extensibility
V1.0 — Production
MILESTONES

if [[ "$missing" -ne 0 ]]; then exit 1; fi
[[ -z "$summary" ]] || printf -- '- PASS governance labels and milestones match required catalog\n' >> "$summary"
echo "governance drift check: ok"

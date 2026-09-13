#!/usr/bin/env bash
set -euo pipefail

main_ref="${1:-origin/main}"
dev_ref="${2:-origin/dev}"

if ! git rev-parse --verify "$main_ref^{commit}" >/dev/null 2>&1 || ! git rev-parse --verify "$dev_ref^{commit}" >/dev/null 2>&1; then
  echo BLOCKED
  exit 0
fi

main_sha="$(git rev-parse "$main_ref^{commit}")"
dev_sha="$(git rev-parse "$dev_ref^{commit}")"

if [[ "$main_sha" == "$dev_sha" ]]; then
  echo CLEAN
elif git merge-base --is-ancestor "$main_ref" "$dev_ref"; then
  echo DEV_AHEAD
elif git merge-base --is-ancestor "$dev_ref" "$main_ref"; then
  echo MAIN_AHEAD_RELEASE
else
  echo DIVERGED
fi

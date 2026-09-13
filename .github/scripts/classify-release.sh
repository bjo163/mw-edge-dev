#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"
if printf '%s\n' "$input" | grep -Eq 'BREAKING CHANGE:|^[a-z]+(\([^)]*\))?!:'; then
  echo major
elif printf '%s\n' "$input" | grep -Eq '^feat(\([^)]*\))?:'; then
  echo minor
elif printf '%s\n' "$input" | grep -Eq '^(fix|perf)(\([^)]*\))?:'; then
  echo patch
else
  echo none
fi

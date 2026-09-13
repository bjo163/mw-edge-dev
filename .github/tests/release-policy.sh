#!/usr/bin/env bash
set -euo pipefail

classify() { printf '%s\n' "$1" | bash .github/scripts/classify-release.sh; }
assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "$label: expected $expected, got $actual" >&2
    exit 1
  fi
}

assert_eq patch "$(classify 'fix: correct request handling')" fix
assert_eq patch "$(classify 'perf(db): reduce allocations')" perf
assert_eq minor "$(classify 'feat: add backup manifest')" feat
assert_eq major "$(classify 'feat(api)!: change contract')" breaking-bang
assert_eq major "$(classify $'refactor: restructure\n\nBREAKING CHANGE: remove old API')" breaking-body
assert_eq none "$(classify 'docs: refresh operator guide')" docs
assert_eq none "$(classify 'chore: update metadata')" chore
assert_eq none "$(classify 'ci: pin action')" ci
assert_eq none "$(classify 'test: add regression')" test
assert_eq none "$(classify 'style: normalize formatting')" style
assert_eq none "$(classify 'refactor: split module')" refactor
assert_eq none "$(classify 'chore(release): v9.9.9')" release-loop

echo "release policy fixtures passed"

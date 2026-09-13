#!/usr/bin/env bash
set -euo pipefail

root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT
repo="$root/repo"
remote="$root/remote.git"

git init -q "$repo"
git -C "$repo" config user.name test
git -C "$repo" config user.email test@example.invalid
printf 'base\n' > "$repo/state.txt"
git -C "$repo" add state.txt
git -C "$repo" commit -qm base
git -C "$repo" branch -M main
git init -q --bare "$remote"
git -C "$repo" remote add origin "$remote"
git -C "$repo" push -q -u origin main
git -C "$repo" branch dev main
git -C "$repo" push -q origin dev

cp .github/scripts/branch-state.sh "$repo/branch-state.sh"
cp .github/scripts/sync-main-to-dev.sh "$repo/sync-main-to-dev.sh"
mkdir -p "$repo/.github/scripts"
cp .github/scripts/branch-state.sh "$repo/.github/scripts/branch-state.sh"

state() { (cd "$repo" && bash ./branch-state.sh "$1" "$2"); }
assert_state() {
  local expected="$1" actual="$2"
  [[ "$expected" == "$actual" ]] || { echo "expected $expected, got $actual" >&2; exit 1; }
}

assert_state CLEAN "$(state main dev)"

# MAIN_AHEAD_RELEASE
printf 'main\n' >> "$repo/state.txt"
git -C "$repo" add state.txt
git -C "$repo" commit -qm main-ahead
assert_state MAIN_AHEAD_RELEASE "$(state main dev)"

# DEV_AHEAD
git -C "$repo" branch -f dev main
git -C "$repo" switch -q dev
printf 'dev\n' >> "$repo/dev.txt"
git -C "$repo" add dev.txt
git -C "$repo" commit -qm dev-ahead
assert_state DEV_AHEAD "$(state main dev)"

# DIVERGED
git -C "$repo" switch -q main
printf 'main-2\n' >> "$repo/main.txt"
git -C "$repo" add main.txt
git -C "$repo" commit -qm diverged-main
assert_state DIVERGED "$(state main dev)"
assert_state BLOCKED "$(state main missing-ref)"

# Sync regression: recreate absent dev, then fast-forward an existing dev.
git -C "$repo" push -q origin main
git --git-dir="$remote" update-ref -d refs/heads/dev
(cd "$repo" && bash ./sync-main-to-dev.sh >/dev/null)
remote_main="$(git --git-dir="$remote" rev-parse refs/heads/main)"
remote_dev="$(git --git-dir="$remote" rev-parse refs/heads/dev)"
assert_state "$remote_main" "$remote_dev"

git -C "$repo" switch -q main
printf 'main-3\n' >> "$repo/state.txt"
git -C "$repo" add state.txt
git -C "$repo" commit -qm next-main
git -C "$repo" push -q origin main
(cd "$repo" && bash ./sync-main-to-dev.sh >/dev/null)
remote_main="$(git --git-dir="$remote" rev-parse refs/heads/main)"
remote_dev="$(git --git-dir="$remote" rev-parse refs/heads/dev)"
assert_state "$remote_main" "$remote_dev"

echo "branch state and sync fixtures passed"

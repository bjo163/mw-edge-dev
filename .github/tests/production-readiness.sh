#!/usr/bin/env bash
set -euo pipefail

root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/bin"

cat >"$root/bin/gh" <<'GH'
#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == "api" ]] || exit 2
endpoint="${2:-}"
number="${endpoint##*/}"
state=closed
if [[ -n "${OPEN_ISSUE:-}" && "$number" == "$OPEN_ISSUE" ]]; then state=open; fi
printf '{"number":%s,"state":"%s","title":"Fixture issue %s","html_url":"https://example.invalid/issues/%s"}\n' "$number" "$state" "$number" "$number"
GH
chmod +x "$root/bin/gh"

export PATH="$root/bin:$PATH"
export REPO="fixture/repo"
export GITHUB_REF="refs/heads/main"
export GITHUB_SHA="abc123"
export EXPECTED_SHA="abc123"
export RELEASE_CANDIDATE="v1.0.0"

bash .github/scripts/production-readiness.sh >/dev/null

if OPEN_ISSUE=120 bash .github/scripts/production-readiness.sh >/dev/null 2>&1; then
  echo "expected open mandatory issue to block production readiness" >&2
  exit 1
fi

if EXPECTED_SHA=def456 bash .github/scripts/production-readiness.sh >/dev/null 2>&1; then
  echo "expected SHA mismatch to block production readiness" >&2
  exit 1
fi

if GITHUB_REF=refs/heads/dev bash .github/scripts/production-readiness.sh >/dev/null 2>&1; then
  echo "expected non-main ref to block production readiness" >&2
  exit 1
fi

grep -q 'production-readiness.sh' .github/scripts/version-release.sh || {
  echo "version-release.sh must invoke the production readiness gate" >&2
  exit 1
}

echo "production readiness fixtures passed"

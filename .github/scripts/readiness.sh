#!/usr/bin/env bash
set -euo pipefail

summary="${GITHUB_STEP_SUMMARY:-}"
run_gate() {
  local name="$1"
  shift
  echo "==> $name"
  if "$@"; then
    [[ -n "$summary" ]] && printf -- '- PASS %s\n' "$name" >> "$summary"
  else
    [[ -n "$summary" ]] && printf -- '- FAIL %s\n' "$name" >> "$summary"
    return 1
  fi
}

[[ -n "$summary" ]] && printf '## MW Edge readiness\n\n' >> "$summary"
run_gate "format" pnpm format:check
run_gate "documentation" pnpm docs:check
docs_site_dir="$(mktemp -d)"
trap 'rm -rf "$docs_site_dir"' EXIT
run_gate "versioned documentation site" pnpm exec tsx scripts/docs-site.ts --out "$docs_site_dir"
run_gate "capability inventory" pnpm capabilities
run_gate "lint + typecheck" pnpm lint
run_gate "plugin lock" pnpm plugins:lock:check
run_gate "automation regression fixtures" pnpm test:automation
run_gate "tests" env MW_BOOTSTRAP_ADMIN_PASSWORD=ci-bootstrap-password-123456 pnpm test
run_gate "UI build" pnpm ui:build
run_gate "backend build" pnpm build
run_gate "HTTP health smoke" pnpm exec tsx .github/scripts/smoke.ts
run_gate "reset equivalence" pnpm exec tsx .github/scripts/reset-equivalence.ts

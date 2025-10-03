#!/usr/bin/env bash
set -euo pipefail

# If you run this inside the repo, you don't need -R; keeping it explicit is fine too.
REPO="8140spitt/nublox-sqlx"

create() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" -R "$REPO" \
    || gh label edit "$name" --color "$color" --description "$desc" -R "$REPO"
}

# Areas
create "area:sqlx"     "0366d6" "SQLx engine/CLI"
create "area:studio"   "0e8a16" "Studio UI/API"
create "area:platform" "5319e7" "Platform/tenancy/secrets"
create "area:devops"   "fbca04" "CI/CD, deploy, infra"
create "area:docs"     "c5def5" "Docs/Guides"

# Epics
create "epic:diff-engine"        "d73a4a" "Diff engine completeness"
create "epic:online-migrations"  "d73a4a" "Online/zero-downtime migrations"
create "epic:safety-recovery"    "d73a4a" "Safe mode, resume, logging"
create "epic:advisors"           "d73a4a" "Schema/index advisors"
create "epic:session-controls"   "d73a4a" "Timeouts, cancel, retries"
create "epic:studio-integration" "d73a4a" "Endpoints + UI wiring"
create "epic:testing-benchmarks" "d73a4a" "E2E tests and perf"

# Priority
create "priority:P0" "b60205" "must ship"
create "priority:P1" "e99695" "high"
create "priority:P2" "f9d0c4" "normal"

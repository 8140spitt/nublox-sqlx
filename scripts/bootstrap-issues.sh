#!/usr/bin/env bash
set -euo pipefail

# --- CONFIG ----------------------------------------------------
OWNER="8140spitt"
REPO="nublox-sqlx"
REPO_SLUG="$OWNER/$REPO"
: "${PROJECT_ID:?Set PROJECT_ID env var first (export PROJECT_ID=...)}"
# ---------------------------------------------------------------

command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }
command -v jq >/dev/null || { echo "jq required"; exit 1; }

issue () {
  local TITLE="$1" BODY="$2" LABELS="$3" MILE="$4"
  gh issue create -R "$REPO_SLUG" -t "$TITLE" -b "$BODY" -l "$LABELS" -m "$MILE" --json number,url | jq -r .url
}

add_to_project () {
  local URL="$1"
  gh project item-add "$PROJECT_ID" --url "$URL" >/dev/null
}

echo "Creating SQLx v1 backlog (M1)…"
M1="M1: SQL Studio (SQLx v1)"

add_to_project "$(issue \
"Diff Engine: columns (add/modify/drop)" \
"Cover datatype, nullable, default, generated, auto_increment, collation, comment. Deterministic ordering for column ops." \
"area:sqlx,epic:diff-engine,priority:P0" "$M1")"

add_to_project "$(issue \
"Diff Engine: indexes (unique, method, invisible, prefix, order)" \
"Detect create/drop/alter + visibility changes. Include prefix length and part order." \
"area:sqlx,epic:diff-engine,priority:P0" "$M1")"

add_to_project "$(issue \
"Diff Engine: foreign keys (add/drop/alter)" \
"Full spec compare and recreate on change (ON DELETE/UPDATE)." \
"area:sqlx,epic:diff-engine,priority:P0" "$M1")"

add_to_project "$(issue \
"Diff Engine: views (normalize, security/definer)" \
"Whitespace/case normalize, detect definition change; handle DEFINER/INVOKER." \
"area:sqlx,epic:diff-engine,priority:P1" "$M1")"

add_to_project "$(issue \
"Planner: deterministic ordering" \
"Topological order: drop FKs→indexes→tables→views, then create tables→columns→indexes→FKs→views." \
"area:sqlx,epic:diff-engine,priority:P0" "$M1")"

add_to_project "$(issue \
"Online migrations: phased plan" \
"Add --online with prepare/backfill/finalize; shadow columns/indexes; safe column renames." \
"area:sqlx,epic:online-migrations,priority:P0" "$M1")"

add_to_project "$(issue \
"CLI: backfill worker" \
"sqlx backfill [url] [table] [fromCol] [toCol] --batch-size --sleep-ms; progress + retries." \
"area:sqlx,epic:online-migrations,priority:P1" "$M1")"

add_to_project "$(issue \
"Safety: confirm hash for destructive operations" \
"Refuse DROP/RENAME/TRUNCATE unless --confirm-hash matches planHash." \
"area:sqlx,epic:safety-recovery,priority:P0" "$M1")"

add_to_project "$(issue \
"Safety: resume & migration steps ledger" \
"Add sqlx.migration_steps, resume from last OK step; show failing statement." \
"area:sqlx,epic:safety-recovery,priority:P0" "$M1")"

add_to_project "$(issue \
"Advisors v1" \
"Duplicate/overlap index; no PK; FK without supporting index; redundant unique vs PK; optional unused indexes via performance_schema." \
"area:sqlx,epic:advisors,priority:P1" "$M1")"

add_to_project "$(issue \
"Session controls" \
"MAX_EXECUTION_TIME; cancel via KILL QUERY; retry deadlocks/lock waits; ping healthcheck." \
"area:sqlx,epic:session-controls,priority:P1" "$M1")"

add_to_project "$(issue \
"Studio integration endpoints" \
"Implement /api/sqlx/{introspect,diff,plan,apply,advise}; connect to UI panels." \
"area:studio,epic:studio-integration,priority:P0" "$M1")"

add_to_project "$(issue \
"Tests & Benchmarks" \
"Convergence, resume after failure, partitioned logs, 10M-row backfill timing." \
"area:devops,epic:testing-benchmarks,priority:P1" "$M1")"

echo "Creating rollout issues (M2–M7)…"

issue_add () {
  local TITLE="$1" BODY="$2" LABELS="$3" MS="$4"
  local URL; URL=$(issue "$TITLE" "$BODY" "$LABELS" "$MS"); add_to_project "$URL"
}

issue_add "UI Studio: drag/drop builder (SvelteKit + DS)" \
"Visual page builder with layout grid, form/table/chart components; versioning via ui.page_versions." \
"area:studio,priority:P0" "M2: UI Studio"

issue_add "UI Studio: connect components to SQLx queries" \
"Bind components to prepared queries; typing from schema; client/server data loaders." \
"area:studio,priority:P0" "M2: UI Studio"

issue_add "API Studio: auto REST/GraphQL + OpenAPI" \
"Generate endpoints from schema; RBAC policies; API keys/OAuth2; export OpenAPI spec." \
"area:studio,priority:P0" "M3: API Studio"

issue_add "Logic Studio: workflow designer" \
"Triggers, conditions, actions, timers/cron, webhooks; runs dashboard with retries." \
"area:studio,priority:P1" "M4: Logic Studio"

issue_add "DevOps: preview envs & deploys" \
"Per-branch ephemeral DB+app; staging/prod deploy; logs/metrics; secrets UI." \
"area:devops,priority:P0" "M5: DevOps"

issue_add "SaaS Platform: admin portal" \
"Global auth, subscriptions/billing, quotas, SSO/SCIM, audit exports." \
"area:platform,priority:P0" "M6: SaaS Platform Layer"

issue_add "Enterprise & Marketplace" \
"Dialect drivers (Postgres/SQL Server/Oracle), compliance add-ons, plugin SDK + marketplace." \
"area:platform,priority:P1" "M7: Enterprise & Marketplace"

echo "All issues created and added to Project $PROJECT_ID ✅"

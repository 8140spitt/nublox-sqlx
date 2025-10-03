#!/usr/bin/env bash
set -euo pipefail

# --- CONFIG ----------------------------------------------------
OWNER="8140spitt"
REPO="nublox-sqlx"
PROJECT_TITLE="NuBlox Roadmap"
# ---------------------------------------------------------------

command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }
command -v jq >/dev/null || { echo "jq required"; exit 1; }

echo "Creating milestones (idempotent)…"
create_ms () { gh api repos/$OWNER/$REPO/milestones -f title="$1" -f state=open >/dev/null || true; }
create_ms "M1: SQL Studio (SQLx v1)"
create_ms "M2: UI Studio"
create_ms "M3: API Studio"
create_ms "M4: Logic Studio"
create_ms "M5: DevOps"
create_ms "M6: SaaS Platform Layer"
create_ms "M7: Enterprise & Marketplace"

echo "Ensuring user-level Project exists…"
# Try to find existing project by title, else create
PROJECT_ID=$(
  gh project list --owner "$OWNER" --format json | jq -r ".[] | select(.title==\"$PROJECT_TITLE\")?.id" | head -n1
)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  PROJECT_ID=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json | jq -r .id)
  echo "Created project $PROJECT_TITLE → ID: $PROJECT_ID"
else
  echo "Found project $PROJECT_TITLE → ID: $PROJECT_ID"
fi

echo "Creating custom fields (idempotent)…"
has_field () { gh project field-list "$PROJECT_ID" --format json | jq -e ".[] | select(.name==\"$1\")" >/dev/null; }
create_select_field () {
  local NAME="$1"; local OPTS="$2"
  if ! has_field "$NAME"; then
    gh project field-create "$PROJECT_ID" --name "$NAME" --data-type SINGLE_SELECT --options "$OPTS" >/dev/null
  fi
}

create_select_field "Status"   "Todo,In Progress,Blocked,Done"
create_select_field "Priority" "P0,P1,P2"
create_select_field "Area"     "SQLx,Studio,Platform,DevOps,Docs"

echo "Done. Project ID: $PROJECT_ID"
echo "Export PROJECT_ID for next script: export PROJECT_ID=$PROJECT_ID"

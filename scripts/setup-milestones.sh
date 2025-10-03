#!/usr/bin/env bash
set -euo pipefail

REPO="8140spitt/nublox-sqlx"

milestones=(
  "M1: SQL Studio (SQLx v1)"
  "M2: UI Studio"
  "M3: API Studio"
  "M4: Logic Studio"
  "M5: DevOps"
  "M6: SaaS Platform Layer"
  "M7: Enterprise & Marketplace"
)

# list existing milestone titles (plain text)
existing=$(gh api repos/$REPO/milestones?state=all --jq '.[].title' 2>/dev/null || true)

for t in "${milestones[@]}"; do
  if echo "$existing" | grep -Fxq "$t"; then
    echo "Milestone exists: $t"
  else
    echo "Creating milestone: $t"
    gh api repos/$REPO/milestones -f "title=$t" -f state=open >/dev/null
  fi
done

echo "Milestones ready ✅"

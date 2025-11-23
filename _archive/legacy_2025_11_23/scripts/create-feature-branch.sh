#!/usr/bin/env bash
# Creates product-aligned feature or experiment branches with enforced naming and safety checks.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/create-feature-branch.sh --product "control-room" --capability "burst-coach" [--scope "metrics"] [--base origin/main]
  ./scripts/create-feature-branch.sh --type experiment --hypothesis "routing-delta" [--product "control-room"] [--base origin/main]

Options:
  --product     Product SKU or customer track (required for feature type)
  --capability  Capability or subsystem focus (required for feature type)
  --scope       Optional finer scope (e.g. api, ui, orchestrator)
  --hypothesis  Hypothesis being validated (required for experiment type)
  --type        Branch type: feature (default) or experiment
  --base        Git base ref (default origin/main)
  --dry-run     Print the computed branch name without creating it
  --help        Show this message
EOF
}

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr ' /_' '-' | tr -cd 'a-z0-9-'
}

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required but not installed." >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: This script must be run from within a Git repository." >&2
  exit 1
fi

TYPE="feature"
PRODUCT=""
CAPABILITY=""
SCOPE=""
HYPOTHESIS=""
BASE="origin/main"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)
      TYPE="$2"
      shift 2
      ;;
    --product)
      PRODUCT="$2"
      shift 2
      ;;
    --capability)
      CAPABILITY="$2"
      shift 2
      ;;
    --scope)
      SCOPE="$2"
      shift 2
      ;;
    --hypothesis)
      HYPOTHESIS="$2"
      shift 2
      ;;
    --base)
      BASE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift 1
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$TYPE" in
  feature)
    if [[ -z "$PRODUCT" || -z "$CAPABILITY" ]]; then
      echo "Feature branches require --product and --capability." >&2
      usage >&2
      exit 1
    fi
    PRODUCT_SLUG=$(slugify "$PRODUCT")
    CAPABILITY_SLUG=$(slugify "$CAPABILITY")
    BRANCH="feature/${PRODUCT_SLUG}-${CAPABILITY_SLUG}"
    if [[ -n "$SCOPE" ]]; then
      SCOPE_SLUG=$(slugify "$SCOPE")
      BRANCH+="-${SCOPE_SLUG}"
    fi
    ;;
  experiment)
    if [[ -z "$HYPOTHESIS" ]]; then
      echo "Experiment branches require --hypothesis." >&2
      usage >&2
      exit 1
    fi
    HYPOTHESIS_SLUG=$(slugify "$HYPOTHESIS")
    if [[ -n "$PRODUCT" ]]; then
      PRODUCT_SLUG=$(slugify "$PRODUCT")
      BRANCH="experiment/${PRODUCT_SLUG}-${HYPOTHESIS_SLUG}"
    else
      BRANCH="experiment/${HYPOTHESIS_SLUG}"
    fi
    ;;
  *)
    echo "Unsupported type: $TYPE" >&2
    usage >&2
    exit 1
    ;;
esac

if $DRY_RUN; then
  echo "$BRANCH"
  exit 0
fi

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "Branch '${BRANCH}' already exists locally. Aborting." >&2
  exit 1
fi

REMOTE_FOR_CHECK="origin"

if [[ $BASE == */* ]]; then
  REMOTE_FOR_CHECK="${BASE%%/*}"
fi

if git ls-remote --exit-code "$REMOTE_FOR_CHECK" "refs/heads/${BRANCH}" >/dev/null 2>&1; then
  echo "Branch '${BRANCH}' already exists on remote '${REMOTE_FOR_CHECK}'. Aborting." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash changes before branching." >&2
  exit 1
fi

printf 'Using base %s\n' "$BASE"

BASE_REF="$BASE"

if [[ "$BASE_REF" == */* ]]; then
  REMOTE="${BASE_REF%%/*}"
  git fetch --quiet "$REMOTE"
else
  REMOTE="origin"
  git fetch --quiet "$REMOTE" "$BASE_REF"
fi

if ! git rev-parse --verify --quiet "$BASE_REF"; then
  if [[ "$BASE_REF" != */* ]] && git rev-parse --verify --quiet "origin/${BASE_REF}"; then
    BASE_REF="origin/${BASE_REF}"
  else
    echo "Base ref '${BASE}' not found after fetch." >&2
    exit 1
  fi
fi

git checkout -b "$BRANCH" "$BASE_REF"

echo "Created branch $BRANCH from $BASE_REF"

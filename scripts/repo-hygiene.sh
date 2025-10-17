#!/usr/bin/env bash
# Cleans generated caches, logs, and binary artifacts so the repo returns to a tidy baseline.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/repo-hygiene.sh [options]

Options:
  -n, --dry-run   Show what would be removed without deleting anything
  -y, --yes       Skip the confirmation prompt (non-interactive)
  -v, --verbose   Report patterns that produced no matches
  -h, --help      Display this help message
EOF
}

DRY_RUN=false
FORCE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -y|--yes)
      FORCE=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ $# -gt 0 ]]; then
  echo "Unexpected argument: $1" >&2
  usage >&2
  exit 1
fi

if command -v git >/dev/null 2>&1; then
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
  cd "$repo_root"
fi

if ! $FORCE && ! $DRY_RUN; then
  read -r -p "This will remove generated caches and logs. Continue? [y/N] " reply || reply="n"
  case "$reply" in
    [yY]|[yY][eE][sS])
      ;;
    *)
      echo "Aborted."
      exit 0
      ;;
  esac
fi

remove_entry() {
  local target="$1"
  if [[ ! -e "$target" && ! -L "$target" ]]; then
    return
  fi
  if $DRY_RUN; then
    printf '[dry-run] rm -rf %s\n' "$target"
  else
    rm -rf "$target"
    printf 'Removed %s\n' "$target"
  fi
  ((REMOVED_COUNT+=1))
}

maybe_report_skip() {
  local pattern="$1"
  if $VERBOSE; then
    printf 'No matches for %s\n' "$pattern"
  fi
}

clean_data_tree() {
  local data_root="data"
  if [[ ! -d "$data_root" ]]; then
    if $DRY_RUN; then
      printf '[dry-run] would ensure %s/.gitkeep exists\n' "$data_root"
    else
      mkdir -p "$data_root"
      : >"$data_root/.gitkeep"
    fi
    return
  fi

  mapfile -d '' -t data_paths < <(find "$data_root" -mindepth 1 ! -name '.gitkeep' -print0)
  if ((${#data_paths[@]} == 0)); then
    if $VERBOSE; then
      echo 'No generated data to remove.'
    fi
  else
    for path in "${data_paths[@]}"; do
      remove_entry "$path"
    done
  fi

  if $DRY_RUN; then
    printf '[dry-run] would ensure %s/.gitkeep exists\n' "$data_root"
  else
    mkdir -p "$data_root"
    if [[ ! -f "$data_root/.gitkeep" ]]; then
      : >"$data_root/.gitkeep"
    fi
  fi
}

REMOVED_COUNT=0

TARGET_PATTERNS=(
  'output'
  'auto-screenshots'
  'releases'
  'logs'
  'web-app/beast-mode-backups'
  'web-app/beast-mode-learning/user-exports'
  'web-app/ai-chat-analysis/analysis-history.json'
  'web-app/ai-chat-analysis/claude-exports'
  'web-app/ai-chat-analysis/chatgpt-exports'
  'web-app/ai-chat-analysis/insights'
  'web-app/ai-chat-analysis/reports'
  'web-app/nohup.out'
  'extensions/chat-timeline/*.zip'
  'extensions/chat-timeline/**/*.zip'
  'chrome-extension/*.zip'
  'chrome-extension-merged/*.zip'
  'api.log'
  'server.log'
  'server-output.log'
  'smart-server.log'
  'training-server.log'
)

clean_data_tree

for pattern in "${TARGET_PATTERNS[@]}"; do
  mapfile -t matches < <(compgen -G "$pattern" || true)
  if ((${#matches[@]} == 0)); then
    maybe_report_skip "$pattern"
    continue
  fi
  for path in "${matches[@]}"; do
    remove_entry "$path"
  done
done

if ((REMOVED_COUNT == 0)); then
  if $DRY_RUN; then
    echo 'Dry run complete. No generated artifacts detected.'
  else
    echo 'Nothing to clean. Repository already tidy.'
  fi
else
  if $DRY_RUN; then
    printf 'Dry run complete. %d items would be removed.\n' "$REMOVED_COUNT"
  else
    printf 'Cleanup finished. %d items removed.\n' "$REMOVED_COUNT"
  fi
fi

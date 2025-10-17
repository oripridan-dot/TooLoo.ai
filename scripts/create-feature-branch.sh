#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required but not installed." >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: This script must be run from within a Git repository." >&2
  exit 1
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <feature-branch-name> [base-branch]" >&2
  exit 1
fi

feature_branch="$1"
base_branch="${2:-${DEFAULT_BASE_BRANCH:-work}}"

if git show-ref --verify --quiet "refs/heads/${feature_branch}"; then
  echo "Branch '${feature_branch}' already exists locally. Aborting." >&2
  exit 1
fi

if git rev-parse --verify --quiet "origin/${feature_branch}" >/dev/null 2>&1; then
  echo "Branch '${feature_branch}' already exists on the remote. Aborting." >&2
  exit 1
fi

if ! git diff --quiet --ignore-submodules --exit-code; then
  echo "Working tree is not clean. Please commit or stash changes before creating a new branch." >&2
  exit 1
fi

if ! git rev-parse --verify --quiet "refs/heads/${base_branch}" \
  && ! git rev-parse --verify --quiet "origin/${base_branch}"; then
  echo "Base branch '${base_branch}' does not exist locally or on the remote." >&2
  exit 1
fi

if ! git rev-parse --verify --quiet "refs/heads/${base_branch}"; then
  git fetch origin "${base_branch}:${base_branch}"
fi

current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "${current_branch}" != "${base_branch}" ]]; then
  git checkout "${base_branch}"
fi

git pull --ff-only origin "${base_branch}" 2>/dev/null || true

git checkout -b "${feature_branch}" "${base_branch}"

echo "Created and switched to '${feature_branch}' from '${base_branch}'."

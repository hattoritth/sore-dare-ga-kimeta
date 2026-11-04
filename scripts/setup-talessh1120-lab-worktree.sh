#!/usr/bin/env bash
set -euo pipefail

# Dedicated sibling checkout, not a separate copy of application source.
task="${1:-first-change}"
if [[ ! "$task" =~ ^[a-z0-9][a-z0-9-]{0,48}$ ]]; then
  echo "ERROR: task must match [a-z0-9][a-z0-9-]{0,48}" >&2
  exit 2
fi
root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$root" ]]; then
  echo "ERROR: run inside a repository clone" >&2
  exit 2
fi
origin="$(git -C "$root" remote get-url origin 2>/dev/null || true)"
case "$origin" in
  https://github.com/hattoritth/sore-dare-ga-kimeta|https://github.com/hattoritth/sore-dare-ga-kimeta.git|git@github.com:hattoritth/sore-dare-ga-kimeta|git@github.com:hattoritth/sore-dare-ga-kimeta.git) ;;
  *) echo "ERROR: unexpected origin: $origin" >&2; exit 2 ;;
esac
worktree="${COLLAB_WORKTREE_DIR:-$(dirname "$root")/sore-dare-ga-kimeta-talessh1120-lab}"
branch="collab/talessh1120-lab/$task"
base="${COLLAB_BASE_REF:-origin/main}"
if [[ -e "$worktree" ]]; then
  existing_root="$(git -C "$worktree" rev-parse --show-toplevel 2>/dev/null || true)"
  actual_dir="$(cd "$worktree" && pwd -P)"
  existing_branch="$(git -C "$worktree" branch --show-current 2>/dev/null || true)"
  if [[ "$existing_root" == "$actual_dir" && "$existing_branch" == collab/talessh1120-lab/* ]]; then
    echo "EXISTS: $worktree ($existing_branch)"
    echo "For new tasks, check for uncommitted changes before changing branch."
    exit 0
  fi
  echo "ERROR: existing path is not the expected collaborator worktree: $worktree" >&2
  exit 1
fi
git -C "$root" fetch origin --prune
if ! git -C "$root" rev-parse --verify --quiet "${base}^{commit}" >/dev/null; then
  echo "ERROR: missing base ref: $base" >&2
  exit 1
fi
if git -C "$root" show-ref --verify --quiet "refs/heads/$branch"; then
  echo "ERROR: branch exists already; inspect before reusing: $branch" >&2
  exit 1
fi
git -C "$root" worktree add -b "$branch" "$worktree" "$base"
echo "READY: $worktree"
echo "BRANCH: $branch"
echo "BASE: $base"
echo "Next: cd '$worktree' && git status --short --branch"
echo "Then: codex  OR  claude"

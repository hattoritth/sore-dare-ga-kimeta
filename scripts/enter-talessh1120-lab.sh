#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$root" ]]; then
  echo "ERROR: run from a repository checkout" >&2
  exit 2
fi
worktree="${COLLAB_WORKTREE_DIR:-$(dirname "$root")/sore-dare-ga-kimeta-talessh1120-lab}"
if [[ ! -d "$worktree" ]]; then
  echo "ERROR: worktree not found; run the setup script first" >&2
  exit 1
fi
actual_root="$(git -C "$worktree" rev-parse --show-toplevel 2>/dev/null || true)"
actual_dir="$(cd "$worktree" && pwd -P)"
branch="$(git -C "$worktree" branch --show-current 2>/dev/null || true)"
if [[ "$actual_root" != "$actual_dir" || "$branch" != collab/talessh1120-lab/* ]]; then
  echo "ERROR: unexpected worktree or branch: $worktree ($branch)" >&2
  exit 1
fi
if [[ "$#" -eq 0 ]]; then
  echo "READY: $worktree ($branch)"
  echo "Usage: bash scripts/enter-talessh1120-lab.sh codex|claude"
  exit 0
fi
cd "$worktree"
exec "$@"

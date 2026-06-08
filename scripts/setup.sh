#!/bin/sh

echo ""
echo "Setting up DigitalDSA-V3 development environment..."
echo ""

# ── Check pnpm is installed ───────────────────────────────────────────────────
if ! command -v pnpm > /dev/null 2>&1; then
  echo "pnpm is not installed."
  echo ""
  echo "   Install it with:"
  echo "   npm install -g pnpm@10"
  echo ""
  echo "   Then re-run: sh scripts/setup.sh"
  echo ""
  exit 1
fi

PNPM_MAJOR=$(pnpm --version | cut -d. -f1)
if [ "$PNPM_MAJOR" -lt 10 ]; then
  echo "pnpm version 10+ is required."
  echo "   Current version: $(pnpm --version)"
  echo "   Upgrade with: npm install -g pnpm@10"
  echo ""
  exit 1
fi

echo "pnpm found: $(pnpm --version)"

# ── Check git identity is configured ─────────────────────────────────────────
# Without this, commits are attributed to 'unknown' or the system hostname,
# which makes code review and blame useless.
GIT_NAME=$(git config --global user.name 2>/dev/null)
GIT_EMAIL=$(git config --global user.email 2>/dev/null)

if [ -z "$GIT_NAME" ] || [ -z "$GIT_EMAIL" ]; then
  echo ""
  echo "Git identity is not configured."
  echo "   Your commits need a name and email so the team knows who made them."
  echo ""
  echo "   Run these commands (replace with your actual details):"
  echo "   git config --global user.name  \"Your Name\""
  echo "   git config --global user.email \"you@company.com\""
  echo ""
  echo "   Then re-run: sh scripts/setup.sh"
  echo ""
  exit 1
fi

echo "Git identity: $GIT_NAME <$GIT_EMAIL>"

# ── Install dependencies (also triggers husky via 'prepare' script) ───────────
echo ""
echo "Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
  echo ""
  echo "pnpm install failed. Check the errors above."
  echo ""
  exit 1
fi

# ── Configure Git pull strategy for this repo only ──────────────────────────
# Ensures 'git pull' always rebases instead of creating merge commits.
# This is required to push to main/develop — the pre-push hook rejects
# merge commits in protected branches.
#
# Scope is --local so we don't override the developer's preferences in
# their other repositories.
echo ""
echo "Configuring Git pull strategy for this repo (rebase by default)..."
git config --local pull.rebase true
git config --local rebase.autoStash true

echo ""
echo "Setup complete. Git hooks are now active."
echo ""
echo "   Hook summary:"
echo "   pre-commit  -> blocks npm/yarn, runs lint-staged + type check (TS/Svelte only)"
echo "   commit-msg  -> enforces conventional commit format"
echo "   pre-push    -> enforces linear history on main/develop, blocks behind/diverged branches"
echo ""
echo "   Commit format: <type>: <description>"
echo "   Example:       feat: add user login page"
echo ""
echo "   Push rules for main/develop:"
echo "   - Always use 'git pull --rebase' (never plain 'git pull')"
echo "   - No merge commits allowed in the push range"
echo "   - Admin bypass: SKIP_PUSH_GUARD=1 git push"
echo ""
echo "   Happy coding!"
echo ""

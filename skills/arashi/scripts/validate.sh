#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SKILL_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SKILL_DIR/../.." && pwd)

CHECK=${1:---check}
TARGET=${2:-all}

if [ "$CHECK" != "--check" ]; then
  printf '%s\n' "Usage: $0 --check {preflight|install|workflows|all}"
  exit 2
fi

pass() {
  printf 'PASS: %s\n' "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1"
  exit 1
}

require_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    pass "command available: $1"
  else
    fail "missing command: $1"
  fi
}

require_file() {
  if [ -f "$1" ]; then
    pass "file present: $1"
  else
    fail "missing file: $1"
  fi
}

check_preflight() {
  require_cmd git
  require_cmd npx
}

check_install() {
  require_file "$ROOT_DIR/skills/arashi/SKILL.md"
  require_file "$ROOT_DIR/skills/arashi/references/commands.md"
}

check_workflows() {
  require_cmd arashi
  require_file "$ROOT_DIR/skills/arashi/references/workflows.md"
  require_file "$ROOT_DIR/skills/arashi/references/troubleshooting.md"
}

case "$TARGET" in
  preflight)
    check_preflight
    ;;
  install)
    check_install
    ;;
  workflows)
    check_workflows
    ;;
  all)
    check_preflight
    check_install
    check_workflows
    ;;
  *)
    printf '%s\n' "Unknown check target: $TARGET"
    printf '%s\n' "Usage: $0 --check {preflight|install|workflows|all}"
    exit 2
    ;;
esac

printf '%s\n' "Validation completed for target: $TARGET"

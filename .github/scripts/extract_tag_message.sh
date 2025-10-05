#!/usr/bin/env bash
set -euo pipefail

# Extracts the clean message for a given tag name.
# Behavior:
# - Annotated tag: returns the tag's message (without Git metadata)
# - Lightweight tag: returns empty (caller applies fallback)
# - Missing tag: returns empty (caller applies fallback)

TAG_NAME="${1:-}"

if [[ -z "${TAG_NAME}" ]]; then
    echo ""
    exit 0
fi

# Verify ref exists locally; if not, try to fetch tags (best-effort, do not fail)
if ! git rev-parse -q --verify "refs/tags/${TAG_NAME}" >/dev/null 2>&1; then
    git fetch --tags --quiet || true
fi

if ! git rev-parse -q --verify "refs/tags/${TAG_NAME}" >/dev/null 2>&1; then
    echo ""
    exit 0
fi

OBJECT_TYPE="$(git cat-file -t "refs/tags/${TAG_NAME}" 2>/dev/null || true)"

if [[ "${OBJECT_TYPE}" == "tag" ]]; then
    # Annotated tag: use tag contents which are only the tag message.
    # This avoids commit message duplication that `git show` may append.
    git tag -l --format='%(contents)' "${TAG_NAME}" | sed 's/[\r\t]*$//' 
else
    # Lightweight tag: no tag message by definition.
    echo ""
fi



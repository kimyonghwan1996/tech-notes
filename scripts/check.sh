#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob
export NO_MKDOCS_2_WARNING=1
cd "$(dirname "$0")/.."
.venv/bin/mkdocs build --strict -q
! grep -rnFf <(grep -v '^#' banned_terms.txt | sed '/^$/d') --exclude-dir=flows docs/ || { echo "banned term found"; exit 1; }
# archify diagram HTML embeds base64 fonts that false-positive on short terms; check their source JSON instead
! grep -rnFf <(grep -v '^#' banned_terms.txt | sed '/^$/d') --include=candidate.json .archify/ || { echo "banned term found in archify candidate"; exit 1; }
python3 scripts/check_templates.py docs/
# mermaid syntax: extract each ```mermaid block to a tmp file and parse with mmdc
python3 scripts/extract_mermaid.py docs/ /tmp/tn-mermaid
for f in /tmp/tn-mermaid/*.mmd; do
  npx -y @mermaid-js/mermaid-cli -p scripts/puppeteer.json -i "$f" -o /tmp/tn-mermaid/out.svg -q >/dev/null
done
node --test tests/
echo "check ok"

#!/bin/sh
# Build acityinmotion.com into ./dist.
# Runs in Cloudflare Workers Builds (build command: sh pipeline/build_site.sh)
# and locally. Plain POSIX sh: no Node needed to build, only to deploy.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/site"
OUT="$ROOT/dist"

echo "==> Building site from $SRC"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$SRC"/. "$OUT"/
find "$OUT" -name '.DS_Store' -delete

# Fail the build if a page points at a local file that is not in the repo.
# Skips absolute URLs, anchors, mailto/tel, and JS template strings.
echo "==> Checking local links"
missing=0
for page in "$OUT"/*.html; do
  perl -0pe "s/<!--.*?-->//gs" "$page" \
    | grep -oE '(href|src)="[^"]+"' \
    | sed -E 's/^(href|src)="//; s/"$//' \
    | grep -vE '^(https?:|//|#|mailto:|tel:|data:|\$)' \
    | sed -E 's/[?#].*$//' \
    | sort -u \
    | while IFS= read -r ref; do
        [ -z "$ref" ] && continue
        case "$ref" in /*) target="$OUT$ref" ;; *) target="$OUT/$ref" ;; esac
        if [ ! -e "$target" ]; then
          case "$ref" in
            *.html|*.js|*.css|*/) echo "   MISSING: $(basename "$page") -> $ref"; echo x >> "$OUT/.missing" ;;
            *) echo "   missing media (warning): $(basename "$page") -> $ref" ;;
          esac
        fi
      done
done
if [ -f "$OUT/.missing" ]; then
  missing=$(wc -l < "$OUT/.missing" | tr -d ' ')
  rm -f "$OUT/.missing"
fi

# Build stamp, readable at /build.txt. Workers Builds sets WORKERS_CI_*.
sha="${WORKERS_CI_COMMIT_SHA:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo local)}"
branch="${WORKERS_CI_BRANCH:-$(git -C "$ROOT" symbolic-ref --short -q HEAD 2>/dev/null || echo local)}"
printf 'site=acityinmotion.com\ncommit=%s\nbranch=%s\nbuilt=%s\n' \
  "$sha" "$branch" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT/build.txt"

pages=$(ls "$OUT"/*.html | wc -l | tr -d ' ')
echo "==> $pages pages, $(du -sh "$OUT" | cut -f1) in dist/"

if [ "$missing" -gt 0 ]; then
  if [ "${ALLOW_MISSING:-0}" = "1" ]; then
    echo "==> WARNING: $missing missing local reference(s), continuing because ALLOW_MISSING=1"
  else
    echo "==> FAILED: $missing missing local reference(s). Add the file to site/ or fix the link."
    echo "    (set ALLOW_MISSING=1 to deploy anyway)"
    exit 1
  fi
fi
echo "==> Build OK"

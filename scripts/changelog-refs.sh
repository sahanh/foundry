#!/usr/bin/env bash
# Fills in each CHANGELOG.md entry's commit ref: the commit on this branch's first-parent line that
# introduced the entry's heading, written as a **Commit:** line under the heading. An entry can't
# name its own commit, so this runs after merge — on main only, since on any other branch the
# commit it finds is the branch's, not main's.
#
#   scripts/changelog-refs.sh           the entries at the top that lack a ref (what CI runs)
#   scripts/changelog-refs.sh --top N   any of the newest N entries that lack a ref (a backfill)
set -euo pipefail

repo_url=https://github.com/sahanh/foundry
cd "$(git rev-parse --show-toplevel)"
file=CHANGELOG.md

top=
case ${1:-} in
  '') ;;
  --top) top=${2:?usage: $0 [--top N]} ;;
  *) echo "usage: $0 [--top N]" >&2; exit 2 ;;
esac

# One line per entry, newest first: <1 if it has a ref, else 0><TAB><heading>
entries() {
  awk '
    /^## / { if (h != "") print 0 "\t" h; h = $0; next }
    h != "" && NF { print (/^\*\*Commit:\*\*/ ? 1 : 0) "\t" h; h = "" }
    END { if (h != "") print 0 "\t" h }
  ' "$file"
}

# The oldest first-parent commit whose diff adds or removes the heading: the one that introduced it.
# --diff-merges=first-parent lets the search see a merge commit's changes.
introducing_commit() {
  git log --first-parent --diff-merges=first-parent --format=%H -S"$1" -- "$file" </dev/null \
    | grep -E '^[0-9a-f]{40}$' | tail -n 1
}

refs=$(mktemp)
trap 'rm -f "$refs"' EXIT

n=0
while IFS=$'\t' read -r has_ref heading; do
  n=$((n + 1))
  if [[ -n $top ]]; then
    if ((n > top)); then break; fi
  elif ((has_ref)); then
    break
  fi
  if ((has_ref)); then continue; fi

  sha=$(introducing_commit "$heading")
  if [[ -z $sha ]]; then
    echo "skipped, no commit introduces it yet: $heading" >&2
    continue
  fi
  printf '%s\t%s\n' "$heading" "$sha" >>"$refs"
  echo "${sha:0:7}  $heading" >&2
done < <(entries)

[[ -s $refs ]] || exit 0

awk -F'\t' -v url="$repo_url" '
  FNR == NR { sha[$1] = $2; next }
  { print }
  $0 in sha { print ""; print "**Commit:** [`" substr(sha[$0], 1, 7) "`](" url "/commit/" sha[$0] ")" }
' "$refs" "$file" >"$file.tmp"
mv "$file.tmp" "$file"

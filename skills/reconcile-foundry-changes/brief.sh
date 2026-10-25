#!/usr/bin/env bash
# Prints the brief for reconciling an adopting repo with Foundry: every CHANGELOG entry after the
# repo's pin (foundry.lock), oldest first, with the commit that made it, the docs it changed, and
# the commands to read them. Run from the adopting repo's root. Reads Foundry through git only, so
# its working tree is never touched.
#
#   brief.sh [target]                    entries after the pin, up to target (default origin/main)
#   brief.sh --pin <commit> [target]     the same, from this pin instead of foundry.lock's
#   brief.sh --entry-commit "<heading>"  the commit on origin/main that introduced an entry
#
# FOUNDRY_DIR is a Foundry clone (default ~/projects/foundry). Portable to macOS's bash 3.2.
set -euo pipefail

F=${FOUNDRY_DIR:-$HOME/projects/foundry}
die() { echo "brief: $*" >&2; exit 1; }
fg() { git -C "$F" "$@"; }

fg rev-parse --git-dir >/dev/null 2>&1 \
  || die "no Foundry clone at $F: clone https://github.com/sahanh/foundry there, or set FOUNDRY_DIR"
fg fetch -q origin

# The oldest first-parent commit in a range whose diff adds or removes the heading.
entry_commit() { # <heading> <range>
  fg log --first-parent --diff-merges=first-parent --format=%H -S"$1" "$2" -- CHANGELOG.md </dev/null \
    | grep -E '^[0-9a-f]{40}$' | tail -n 1 || true
}

pin=
case ${1:-} in
  --entry-commit)
    h=${2:?usage: brief.sh --entry-commit \"<heading>\"}
    sha=$(entry_commit "## ${h#\#\# }" origin/main)
    [[ -n $sha ]] || die "no commit on origin/main introduces that heading"
    echo "$sha"
    exit 0 ;;
  --pin) pin=${2:?usage: brief.sh --pin <commit> [target]}; shift 2 ;;
esac

if [[ -z $pin ]]; then
  [[ -f foundry.lock ]] || die "no foundry.lock in $(pwd): see the skill's Bootstrap"
  pin=$(sed -n 's/^commit *= *//p' foundry.lock | tr -d '[:space:]')
  [[ -n $pin ]] || die "foundry.lock has no 'commit = <sha>' line"
fi
given=$pin
pin=$(fg rev-parse -q --verify "$given^{commit}") || die "pin $given is not a commit in Foundry's history"
target=$(fg rev-parse -q --verify "${1:-origin/main}^{commit}") || die "target ${1:-} is not a Foundry commit"
fg merge-base --is-ancestor "$pin" "$target" \
  || die "pin ${pin:0:7} is not an ancestor of target ${target:0:7}: stop and ask the user"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fg show "$pin:CHANGELOG.md" >"$tmp/pin.md"
fg show "$target:CHANGELOG.md" >"$tmp/target.md"

describe() { fg log -1 --format='%h — %s (%ad)' --date=short "$1"; }
headings() { grep '^## ' "$1" || true; }
reverse() { awk '{ l[NR] = $0 } END { for (i = NR; i > 0; i--) print l[i] }'; }

# An entry's text, without its **Commit:** line or surrounding blank lines.
entry_body() { # <changelog file> <heading>
  awk -v h="$2" '
    $0 == h { on = 1; next }
    on && (/^## / || /^---$/) { exit }
    on && !/^\*\*Commit:\*\*/ { body[++n] = $0 }
    END {
      first = 1; while (first <= n && body[first] == "") first++
      last = n; while (last >= first && body[last] == "") last--
      for (i = first; i <= last; i++) print body[i]
    }' "$1"
}

headings "$tmp/pin.md" >"$tmp/pin.h"
headings "$tmp/target.md" | grep -vxF -f "$tmp/pin.h" | reverse >"$tmp/new.h" || true
fg rev-list --first-parent --reverse "$pin..$target" >"$tmp/commits"

echo "# Foundry reconcile brief"
echo
echo "- Foundry clone: \`$F\`"
echo "- Pin: $(describe "$pin")"
echo "- Target: $(describe "$target")"
echo "- $(wc -l <"$tmp/new.h" | tr -d ' ') new changelog entries across $(wc -l <"$tmp/commits" | tr -d ' ') commits"

if [[ ! -s $tmp/commits ]]; then
  echo
  echo "Nothing after the pin: this repo is reconciled to the target."
  exit 0
fi

echo
echo "## New entries, oldest first"
: >"$tmp/entry-commits"
: >"$tmp/diffed"
n=0
while IFS= read -r heading; do
  n=$((n + 1))
  sha=$(entry_commit "$heading" "$pin..$target")
  echo
  echo "### $n. ${heading#\#\# }"
  echo
  if [[ -z $sha ]]; then
    echo "Commit: not found on the target's first-parent line — find it by hand before moving the pin."
  else
    echo "$sha" >>"$tmp/entry-commits"
    echo "Commit: $(describe "$sha") — full sha \`$sha\`"
  fi
  echo
  entry_body "$tmp/target.md" "$heading" | sed 's/^/> /'

  ids=$(entry_body "$tmp/target.md" "$heading" | grep -oE '\b[A-Z]{2,5}-[0-9]{2}\b' | sort -u | tr '\n' ' ' || true)
  [[ -z $ids ]] || { echo; echo "Rule IDs named: $ids"; }

  [[ -n $sha ]] || continue
  echo
  # The entry's pointers: the sections it names, then the docs holding them.
  refs=$(entry_body "$tmp/target.md" "$heading" | grep -oE '\]\(\./[^)]+\.md(#[^)]*)?\)' \
    | sed -e 's#^](\./##' -e 's#)$##' | sort -u || true)
  if [[ -n $refs ]]; then
    echo "Points to (read at the target):"
    echo
    echo "$refs" | sed 's/^/- /'
    echo
    echo "$refs" | sed 's/#.*//' | sort -u | while IFS= read -r path; do
      fg cat-file -e "$target:$path" 2>/dev/null \
        && echo "    git -C \"$F\" show ${target:0:12}:$path"
    done
    echo
  fi
  shared=$(sed -n "s/^$sha //p" "$tmp/diffed" | head -n 1)
  if [[ -n $shared ]]; then
    echo "The change itself: the same commit as entry $shared, so the diff above covers this one too."
    continue
  fi
  echo "$sha $n" >>"$tmp/diffed"
  docs=$(fg diff --name-only "$sha^1" "$sha" | grep -v -e '^site/' -e '^CHANGELOG\.md$' || true)
  [[ -n $docs ]] || continue
  echo "The change itself — what each rule was and what it is now:"
  echo
  echo "    git -C \"$F\" diff ${sha:0:12}^1 ${sha:0:12} -- $(echo "$docs" | tr '\n' ' ')"
done <"$tmp/new.h"

# Commits with no entry should change no rule; listed so that nothing changes unseen. Website,
# CI and maintenance-script commits are left out, as are CHANGELOG-only ones (ref backfills; an
# edit to an existing entry is caught below).
echo
echo "## Commits with no entry"
echo
others=0
while IFS= read -r c; do
  grep -qx "$c" "$tmp/entry-commits" && continue
  files=$(fg diff --name-only "$c^1" "$c" | grep -v -e '^site/' -e '^\.github/' -e '^scripts/' || true)
  [[ -z $files || $files == CHANGELOG.md ]] && continue
  others=$((others + 1))
  echo "- $(describe "$c"): $(echo "$files" | tr '\n' ' ')"
done <"$tmp/commits"
((others)) || echo "None."

echo
echo "## Older entries edited since the pin"
echo
edited=0
while IFS= read -r heading; do
  grep -qxF -- "$heading" "$tmp/pin.h" || continue
  [[ $(entry_body "$tmp/pin.md" "$heading") == "$(entry_body "$tmp/target.md" "$heading")" ]] && continue
  edited=$((edited + 1))
  echo "- ${heading#\#\# }"
done < <(headings "$tmp/target.md")
((edited)) || echo "None."

# Skills are templates the repo installs as its own (setup/agent-skills.md), so every skill added,
# changed or removed since the pin is work here — whether or not an entry names it.
echo
echo "## Skills"
echo
skills_at() { fg ls-tree -d --name-only "$1" skills/ 2>/dev/null | sed 's#^skills/##' || true; }
skills_at "$pin" | sort >"$tmp/skills.pin"
skills_at "$target" | sort >"$tmp/skills.target"
fg diff --name-only "$pin" "$target" -- skills/ | cut -d/ -f2 | sort -u >"$tmp/skills.changed"
installed() { # <skill>: where this repo has a copy
  local d found=
  for d in .claude/skills .agents/skills .codex/skills; do
    [[ -f $d/$1/SKILL.md ]] && found="$found \`$d/$1\`"
  done
  echo "${found:- none found in .claude/skills, .agents/skills or .codex/skills}"
}
listed=0
while IFS= read -r s; do
  [[ -n $s ]] || continue
  listed=$((listed + 1))
  if ! grep -qxF "$s" "$tmp/skills.pin"; then
    echo "- **$s** — new: install it (setup/agent-skills.md). Installed here:$(installed "$s")"
  elif ! grep -qxF "$s" "$tmp/skills.target"; then
    echo "- **$s** — removed: delete the installed copy and its AGENTS.md line. Installed here:$(installed "$s")"
  else
    echo "- **$s** — changed: re-copy and re-adapt, carrying over its filled-in parameters. Installed here:$(installed "$s")"
    echo "    git -C \"$F\" diff ${pin:0:12} ${target:0:12} -- skills/$s"
  fi
done <"$tmp/skills.changed"
((listed)) || echo "None."

echo
echo "## Moving the pin"
echo
echo "Once every entry above is decided, the pin moves to the target: \`commit = $target\`."
echo "If only some are, it moves to the commit of the newest entry up to which all are decided."

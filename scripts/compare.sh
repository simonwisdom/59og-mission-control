#!/usr/bin/env bash
# Join a before and an after screenshot side by side, labelled "Before" and "After" with an
# arrow between, for showing Simon a visual change.
#
#   scripts/compare.sh BEFORE.png AFTER.png OUT.png
#
# Uses Arial by path: ImageMagick can't find fonts by name such as Helvetica on this Mac.
set -euo pipefail

[ $# -eq 3 ] || { echo "Usage: scripts/compare.sh BEFORE.png AFTER.png OUT.png" >&2; exit 1; }
font=/System/Library/Fonts/Supplemental/Arial.ttf
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# A label strip above each shot
magick "$1" -background white -gravity north -splice 0x56 \
  -font "$font" -pointsize 30 -fill '#333333' -annotate +0+12 Before "$work/before.png"
magick "$2" -background white -gravity north -splice 0x56 \
  -font "$font" -pointsize 30 -fill '#333333' -annotate +0+12 After "$work/after.png"

# An arrow as tall as the taller shot; +append pads the shorter one at the bottom
height=$(magick "$work/before.png" "$work/after.png" -format '%h\n' info: | sort -n | tail -1)
magick -size "80x$height" xc:white -font "$font" -pointsize 48 -fill '#999999' \
  -gravity center -annotate +0+0 '→' "$work/arrow.png"

magick "$work/before.png" "$work/arrow.png" "$work/after.png" \
  -background white -gravity north +append -bordercolor white -border 16 "$3"
echo "$3"

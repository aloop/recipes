#!/usr/bin/env bash

###################
#
# Tools required:
# - bash
# - pandoc
# - sha256sum or shasum or openssl
# - sed
# - cut
# - tr
#
# Optional tools:
# - brotli
# - gzip
#
###################

set -euo pipefail

shopt -s globstar

if ! command -v pandoc > /dev/null 2>&1; then
  echo "Make sure pandoc is installed, then try again"
  exit 1
fi

generate_hash() {
  if [ ! -f "$1" ]; then
    printf "File \"%s\" does not exist" "$1" >&2
    exit 1
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -c1-16
  elif command -v shasum; then
    shasum -a 256 "$1" | cut -c1-16
  elif command -v openssl; then
    openssl sha256 "$1" | cut -d ' ' -f 2 | cut -c1-16
  else
    printf "Could not generate sha256 hash of \"%s\", make sure sha256sum, shasum, or openssl are available on your system\n" "$1" >&2
    exit 1
  fi
}

styles_hash="$(generate_hash generator-files/styles.css)"
maindotjs_hash="$(generate_hash generator-files/scripts/main.js)"
serviceworkerdotjs_hash="$(generate_hash generator-files/service-worker.js)"
utilsdotjs_hash="$(generate_hash generator-files/scripts/modules/utils.js)"
fuzzymatchdotjs_hash="$(generate_hash generator-files/scripts/modules/fuzzy-match.js)"
searchjs_hash="$(generate_hash generator-files/scripts/modules/search.js)"

# Cleanup possible remnants and recreate destination dirs
rm -rf new_dist
mkdir -p new_dist/scripts/modules

# Copy files
cp generator-files/styles.css "new_dist/styles-${styles_hash}.css"
cp generator-files/scripts/main.js "new_dist/scripts/main-${maindotjs_hash}.js"
cp generator-files/scripts/modules/utils.js "new_dist/scripts/modules/utils-${utilsdotjs_hash}.js"
cp generator-files/scripts/modules/fuzzy-match.js "new_dist/scripts/modules/fuzzy-match-${fuzzymatchdotjs_hash}.js"
cp generator-files/scripts/modules/search.js "new_dist/scripts/modules/search-${searchjs_hash}.js"
cp generator-files/{favicon.ico,robots.txt,_headers,offline.html,service-worker.js} new_dist/

# Start building markdown files into html

recipe_links=""

for markdown_file in recipes/*.md; do
  if [ -e "${markdown_file}" ] && [ ! -d "${markdown_file}" ]; then
    recipe_title="$(pandoc "${markdown_file}" -f markdown --template=generator-files/meta-title.template | tr -d "\n")"
    output_name="new_dist/$(basename "${markdown_file}" | sed 's/\.md$//')"

    mkdir "${output_name}"

    pandoc "${markdown_file}" \
      -s \
      -f markdown \
      -t html5 \
      --section-divs \
      --template=generator-files/recipe.template.html \
      -o "${output_name}/index.html" \
      --data-dir ./

    # Add a link for this recipe to our index page
    recipe_links+="<li class=\"Recipes-item\"><a href=\"./$(basename "${output_name}")/\">${recipe_title}</a></li>"
  fi
done

# Abuse printf for templating
printf "$(cat generator-files/index.template.html)" "${recipe_links}" >> new_dist/index.html

# Add the first 16 characters from the styles.css hash to its filename
sed -i \
  -e "s/STYLESDOTCSS_HASH/${styles_hash}/g" \
  -e "s/MAINDOTJS_HASH/${maindotjs_hash}/g" \
  -e "s/UTILSDOTJS_HASH/${utilsdotjs_hash}/g" \
  -e "s/FUZZYMATCHDOTJS_HASH/${fuzzymatchdotjs_hash}/g" \
  -e "s/SEARCHDOTJS_HASH/${searchjs_hash}/g" \
  -e "s/SERVICEWORKERDOTJS_HASH/${serviceworkerdotjs_hash}/g" \
  new_dist/**/*.{html,js} \
  new_dist/_headers

# Try to compress the files ahead of time so the webserver can do less work
for dist_file in new_dist/**/*.{html,css,js}; do
  if [ -e "$dist_file" ] && [ ! -d "$dist_file" ]; then
    if command -v brotli > /dev/null 2>&1; then
      brotli --keep --best "$dist_file"
    fi

    if command -v gzip > /dev/null 2>&1; then
      gzip --keep --best "$dist_file"
    fi
  fi
done

# Move new files into place and remove old ones, if there are any.
if [ -d dist.backup ]; then
  rm -rf dist.backup
fi

if [ -d dist ]; then
  mv dist dist.backup
fi

mv new_dist dist

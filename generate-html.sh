#!/usr/bin/env bash

###################
#
# Tools required:
# - pandoc
# - sha256sum
# - sed
# - cut
#
# Optional tools:
# - brotli
# - gzip
#
###################

set -euo pipefail

if ! command -v pandoc > /dev/null 2>&1; then
  echo "Make sure pandoc is installed, then try again"
  exit 1
fi

# Generate a hash of styles.css and scripts.js to allow for long-term caching
# and simple invalidation.
if command -v sha256sum >/dev/null 2>&1; then
  styles_hash="$(sha256sum generator-files/styles.css | cut -c1-16)"
  scripts_hash="$(sha256sum generator-files/scripts.js | cut -c1-16)"
elif command -v shasum; then
  styles_hash="$(shasum -a 256 generator-files/styles.css | cut -c1-16)"
  scripts_hash="$(shasum -a 256 generator-files/scripts.js | cut -c1-16)"
elif command -v openssl; then
  styles_hash="$(openssl sha256 generator-files/styles.css | cut -d ' ' -f 2 | cut -c1-16)"
  scripts_hash="$(openssl sha256 generator-files/scripts.js | cut -d ' ' -f 2 | cut -c1-16)"
else
  printf "Could not generate sha256 hash of styles.css or scripts.js, make sure sha256sum, shasum, or openssl are available on your system\n"
  exit 1
fi

if [ -z "$styles_hash" ] || [ -z "$scripts_hash" ]; then
  printf "sha256 hash was empty, an unknown error occurred"
  exit 1
fi

# Cleanup possible remnants
rm -rf new_dist
mkdir -p new_dist

cp generator-files/styles.css "new_dist/styles-${styles_hash}.css"
cp generator-files/scripts.js "new_dist/scripts-${scripts_hash}.js"
cp generator-files/{favicon.ico,robots.txt} new_dist/

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

# Abuse printf replacement as templating
printf "$(cat generator-files/index.template.html)" "${recipe_links}" >> new_dist/index.html

# Add the first 16 characters from the styles.css hash to its filename
sed -i \
  -e "s/STYLESDOTCSS_HASH/${styles_hash}/g" \
  -e "s/SCRIPTSDOTJS_HASH/${scripts_hash}/g" \
  new_dist/{*,**/*}.html

# Try to compress the files ahead of time so the webserver can do less work
for dist_file in new_dist/{*,**/*}.{html,css,js}; do
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

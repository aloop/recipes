#!/usr/bin/env sh

###################
#
# Tools required:
# - pandoc
# - sha256sum
# - sed
# - cut
#
###################

if ! command -v pandoc > /dev/null 2>&1; then
  echo "Make sure pandoc is installed, then try again"
  exit 1
fi

slugify() (
  filename="$(basename "$1")"
  slugified_name="$(printf '%s' "${filename%.*}" | sed -e 's/\&/and/' -e 's/[^[:alnum:]]/-/g' | tr -s '-' | sed 's/.*/\L&/')"
  printf '%s%s' "${1%"$filename"}" "$slugified_name"
)

# Generate a hash of styles.css to allow for long-term caching and simple invalidation.
if command -v sha256sum >/dev/null 2>&1; then
  styles_hash="$(sha256sum generator-files/styles.css | cut -c1-16)"
elif command -v shasum; then
  styles_hash="$(shasum -a 256 generator-files/styles.css | cut -c1-16)"
elif command -v openssl; then
  styles_hash="$(openssl sha256 generator-files/styles.css | cut -d ' ' -f 2 | cut -c1-16)"
else
  printf "Could not generate sha256 hash of styles.css, make sure sha256sum, shasum, or openssl are available on your system\n"
  exit 1
fi

if [ -z "$styles_hash" ]; then
  printf "sha256 hash was empty, an unknown error occurred"
  exit 1
fi

# Cleanup files from previous builds
rm -r dist
mkdir dist

cp generator-files/styles.css "dist/styles-${styles_hash}.css"
cp generator-files/favicon.ico dist/
cp generator-files/index.start.html dist/index.html

for markdown_file in recipes/*.md; do
  if [ -e "$markdown_file" ] && [ ! -d "$markdown_file" ]; then
    output_name="$(slugify "$(printf '%s' "$markdown_file" | sed -e 's/^recipes/dist/' -e 's/\.md$//')")"

    mkdir dist/"$(basename "$output_name")"

    pandoc "$markdown_file" \
      -s \
      -f markdown \
      -t html5 \
      --section-divs \
      --template=generator-files/recipe.template.html \
      --metadata pagetitle="$(basename "${markdown_file%.*}")" \
      -o "$output_name/index.html" \
      --data-dir ./

    # Add a link for this recipe to our index page
    printf '<li class="Recipes-item"><a href="./%s/">%s</a></li>\n' \
      "$(basename "$output_name")" \
      "$(basename "${markdown_file%.*}")" \
      >> dist/index.html
  fi
done

# Finish constructing the index page
cat generator-files/index.end.html >> dist/index.html

# Add the first 16 characters from the styles.css hash to its filename
sed -i "s/STYLESDOTCSS_HASH/${styles_hash}/g" dist/*.html dist/**/*.html

# Try to compress the files ahead of time so the webserver can do less work
for dist_file in dist/*.* dist/**/*.*; do
  if [ -e "$dist_file" ] && [ ! -d "$dist_file" ]; then
    if command -v brotli > /dev/null 2>&1; then
      brotli --keep --best "$dist_file"
    fi

    if command -v gzip > /dev/null 2>&1; then
      gzip --keep --best "$dist_file"
    fi
  fi
done

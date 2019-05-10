#!/usr/bin/env sh

if ! command -v pandoc > /dev/null 2>&1; then
  echo "Make sure pandoc is installed, then try again"
  exit 1
fi

slugify() (
  filename="$(basename "$1")"
  slugified_name="$(printf '%s' "${filename%.*}" | sed -e 's/\&/and/' -e 's/[^[:alnum:]]/-/g' | tr -s '-' | sed 's/.*/\L&/')"
  printf '%s%s' "${1%"$filename"}" "$slugified_name"
)

rm -r dist
mkdir dist

cp generator-files/{styles.css,favicon.ico} dist/
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

    printf '<li class="Recipes-item"><a href="./%s/">%s</a></li>\n' \
      "$(basename "$output_name")" \
      "$(basename "${markdown_file%.*}")" \
      >> dist/index.html
  fi
done

cat generator-files/index.end.html >> dist/index.html

# Try to compress the files ahead of time so the webserver can do less work
for dist_file in dist/{*.*,**/*.*}; do
  if [ -e "$dist_file" ] && [ ! -d "$dist_file" ]; then
    if command -v brotli > /dev/null 2>&1; then
      brotli --keep --best "$dist_file"
    fi

    if command -v gzip > /dev/null 2>&1; then
      gzip --keep --best "$dist_file"
    fi
  fi
done

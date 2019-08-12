const specialCharsRegex = /[-\/\\^$*+?.()|[\]{}]/g;
const fancyDoubleQuotesRegex = /\u201C|\u201D/g;
const fancySingleQuotesRegex = /\u2018|\u2019/g;

const escapeStringForRegex = str =>
  str
    .replace(specialCharsRegex, "\\$&")
    .replace(fancyDoubleQuotesRegex, '"')
    .replace(fancySingleQuotesRegex, "'");

const createRegex = (a, b) => `${a}[^${b}]*${b}`;

const searchInput = document.querySelector("#search");

const recipes = [];

for (const recipe of document.querySelectorAll(".Recipes > li > a")) {
  const title = recipe.innerText;

  recipes.push({
    title,
    escapedTitle: escapeStringForRegex(title),
    el: recipe
  });
}

const handleSearch = ev => {
  // Show all recipes and return early if the search is blank
  if (ev.target.value === "") {
    for (const { el } of recipes) {
      el.parentElement.classList.remove("hidden");
    }

    return;
  }

  const valueRegex = new RegExp(
    ev.target.value
      .toLowerCase()
      .split("")
      .reduce(createRegex)
  );

  for (const recipe of recipes) {
    if (valueRegex.test(recipe.escapedTitle.toLowerCase())) {
      recipe.el.parentElement.classList.remove("hidden");
    } else {
      recipe.el.parentElement.classList.add("hidden");
    }
  }
};

if (searchInput !== null) {
  searchInput.addEventListener("input", handleSearch);
}

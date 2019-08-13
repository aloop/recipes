const classes = {
  hidden: "hidden",
  weighted: "is-sequenceMatch"
};

const specialCharsRegex = /[-\/\\^$*+?.()|[\]{}]/g;
const fancyDoubleQuotesRegex = /\u201C|\u201D/g;
const fancySingleQuotesRegex = /\u2018|\u2019/g;

const escapeStringForRegex = str =>
  str
    .replace(specialCharsRegex, "\\$&")
    .replace(fancyDoubleQuotesRegex, '"')
    .replace(fancySingleQuotesRegex, "'");

const fuzzyLetterRegexReducer = (result, value) => {
  const safeValue = escapeStringForRegex(value);
  return `${result}[^${safeValue}]*${safeValue}`;
};

const generateFuzzyRegex = str =>
  new RegExp(str.split("").reduce(fuzzyLetterRegexReducer, ""), "ui");

const searchInput = document.querySelector("#search");

const recipes = [];

for (const recipe of document.querySelectorAll(".Recipes > li > a")) {
  const title = recipe.innerText.normalize();

  recipes.push({
    title,
    escapedTitle: escapeStringForRegex(title),
    el: recipe
  });
}

const handleSearch = ev => {
  // Show all recipes and return early if the search is blank
  if (ev.target.value.trim() === "") {
    for (const { el } of recipes) {
      el.parentElement.classList.remove(classes.hidden, classes.weighted);
    }

    return;
  }

  const searchQuery = ev.target.value
    .trim()
    .normalize()
    .toLowerCase();

  const fuzzyRegex = generateFuzzyRegex(searchQuery);

  for (const { title, escapedTitle, el } of recipes) {
    if (title.toLowerCase().includes(searchQuery)) {
      // Make sure it's not hidden from a previous search attempt
      el.parentElement.classList.remove(classes.hidden);
      // Assign a higher weight to exact matches
      el.parentElement.classList.add(classes.weighted);
    } else if (fuzzyRegex.test(escapedTitle)) {
      el.parentElement.classList.remove(classes.hidden, classes.weighted);
    } else {
      el.parentElement.classList.add(classes.hidden);
      el.parentElement.classList.remove(classes.weighted);
    }
  }
};

if (searchInput !== null) {
  searchInput.addEventListener("input", handleSearch);
}

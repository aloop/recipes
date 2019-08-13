const weightedMatchClass = "is-sequenceMatch";
const classes = ["hidden", weightedMatchClass];

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
  new RegExp(str.split("").reduce(fuzzyLetterRegexReducer, ""), "i");

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
      el.parentElement.classList.remove(...classes);
    }

    return;
  }

  const searchQuery = ev.target.value.toLowerCase();

  const fuzzyRegex = generateFuzzyRegex(searchQuery);

  for (const { title, escapedTitle, el } of recipes) {
    if (title.toLowerCase().includes(searchQuery)) {
      el.parentElement.classList.remove(...classes);
      // Assign a higher weight to exact matches
      el.parentElement.classList.add(weightedMatchClass);
    } else if (fuzzyRegex.test(title)) {
      el.parentElement.classList.remove(...classes);
    } else {
      el.parentElement.classList.add(...classes);
    }
  }
};

if (searchInput !== null) {
  searchInput.addEventListener("input", handleSearch);
}

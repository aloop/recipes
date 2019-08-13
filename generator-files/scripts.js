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

const debounce = (fn, delay = 100) => {
  let initialTimestamp = null;
  let currentAnimationFrame = null;

  return (...args) => {
    // Every time this function is called, that means a new event fired.
    // We should cancel the last one if it's still pending.
    if (currentAnimationFrame) {
      cancelAnimationFrame(currentAnimationFrame);
    }

    const tick = timestamp => {
      if (
        (initialTimestamp && timestamp - initialTimestamp >= delay) ||
        delay <= 0
      ) {
        initialTimestamp = null;
        fn(...args);
      } else if (!initialTimestamp) {
        initialTimestamp = timestamp;
        currentAnimationFrame = requestAnimationFrame(tick);
      } else {
        currentAnimationFrame = requestAnimationFrame(tick);
      }
    };

    currentAnimationFrame = requestAnimationFrame(tick);
  };
};

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
  searchInput.addEventListener("input", debounce(handleSearch, 32));
}

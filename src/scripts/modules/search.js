import { debounce } from "./utils-UTILSDOTJS_HASH.js";
import fuzzyMatch from "./fuzzy-match-FUZZYMATCHDOTJS_HASH.js";

const linksSelector = ".Recipes > li > a";
const classes = {
  hidden: "hidden",
  weighted: "is-sequenceMatch"
};

const recipes = [];

for (const recipe of document.querySelectorAll(linksSelector)) {
  const title = recipe.innerText.normalize();

  recipes.push({
    title,
    el: recipe.parentElement
  });
}

export const searchListener = ev => {
  // Show all recipes and return early if the search is blank
  if (ev.target.value.trim() === "") {
    for (const { el } of recipes) {
      el.classList.remove(classes.hidden, classes.weighted);
    }

    return;
  }

  const searchQuery = ev.target.value
    .trim()
    .normalize()
    .toLowerCase();

  for (const { title, el } of recipes) {
    if (title.toLowerCase().includes(searchQuery)) {
      // Make sure it's not hidden from a previous search attempt
      el.classList.remove(classes.hidden);
      // Assign a higher weight to exact matches
      el.classList.add(classes.weighted);
    } else if (fuzzyMatch(searchQuery, title)) {
      el.classList.remove(classes.hidden, classes.weighted);
    } else {
      el.classList.add(classes.hidden);
      el.classList.remove(classes.weighted);
    }
  }
};

export const createSearchListener = () => debounce(searchListener, 50);

//
// Utility functions
//

/**
 * @param {Function} fn
 * @param {number} delay
 * @param {boolean} eager
 */
const debounce = (fn, delay = 100, eager = true) => {
  let initialTimestamp = null;
  let currentAnimationFrame = null;

  return (...args) => {
    // Every time this function is called, that means a new event fired.
    // We should cancel the last one if it's still pending.
    if (currentAnimationFrame) {
      cancelAnimationFrame(currentAnimationFrame);

      if (!eager) {
        initialTimestamp = null;
      }
    }

    /**
     * @param {number} timestamp
     */
    const tick = timestamp => {
      // The first time this function is run, `initialTimestamp` won't be set.
      // So we'll set it to the current `timestamp` the requestAnimationFrame
      // gave us.
      if (!initialTimestamp) {
        initialTimestamp = timestamp;
      }

      if (timestamp - initialTimestamp >= delay || delay <= 0) {
        initialTimestamp = null;
        return fn(...args);
      }

      // Since `delay` hasn't elapsed if we've gotten here, recursively
      // queue `tick` again for the next animation frame.
      currentAnimationFrame = requestAnimationFrame(tick);
    };

    // Start the recursion
    currentAnimationFrame = requestAnimationFrame(tick);
  };
};

/**
 * A simple memoize function, for functions that take a single argument.
 *
 * @param {Function} fn
 */
const memoize = fn => {
  const cache = new Map();

  const memoizedFn = x =>
    cache.has(x) ? cache.get(x) : cache.set(x, fn(x)).get(x);

  return memoizedFn;
};

//
// Fuzzy Matching functions
//

const specialCharsRegex = /[-\/\\^$*+?.()|[\]{}]/g;
const fancyDoubleQuotesRegex = /\u201C|\u201D/g;
const fancySingleQuotesRegex = /\u2018|\u2019/g;

const escapeStringForRegex = memoize(str =>
  str
    .replace(specialCharsRegex, "\\$&")
    .replace(fancyDoubleQuotesRegex, '"')
    .replace(fancySingleQuotesRegex, "'")
);

const generateFuzzyRegex = memoize(str => {
  let regex = "";

  for (const char of str) {
    const escapedChar = escapeStringForRegex(char);
    regex += `[^${escapedChar}]*${escapedChar}`;
  }

  return new RegExp(regex, "ui");
});

const fuzzyMatch = (needle, haystack) => {
  return generateFuzzyRegex(needle).test(escapeStringForRegex(haystack));
};

//
// Search and Tag functionality
//

const linksSelector = ".Recipes > li > a";

const classes = {
  hidden: "hidden",
  weighted: "is-sequenceMatch",
  tag: "Tag",
  selectedTag: "is-selected"
};

const recipes = [];

for (const recipe of document.querySelectorAll(linksSelector)) {
  const title = recipe.innerText.normalize();

  recipes.push({
    title,
    el: recipe.parentElement
  });
}

const searchListener = ev => {
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

const createSearchListener = () => debounce(searchListener, 50);

//
// Main Program
//

// Register service worker for offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}

// Handle searching and tag selections

const searchInput = document.getElementById("recipes-search-field");
const tagCloud = document.getElementById("tag-cloud");

let clearActiveTags;

if (tagCloud !== null) {
  const buttons = tagCloud.querySelectorAll("[data-tag]");
  const tags = {};

  for (const button of buttons) {
    tags[button.dataset.tag] = button;
  }

  // Keep a list of which tags are currently active
  let activeTags = new Set();

  const tagsMappedToRecipes = {};

  // Create a WeakMap for each tag
  for (const tag of Object.keys(tags)) {
    tagsMappedToRecipes[tag] = new WeakMap();
  }

  // Get tags assigned to each recipe in the list, and add the recipe to each
  // associated tag
  for (const { el } of recipes) {
    const recipeTags = JSON.parse(el.dataset.tags);
    for (const tag of recipeTags) {
      tagsMappedToRecipes[tag].set(el);
    }
  }

  const toggleTag = tag => {
    if (tags[tag].classList.contains(classes.selectedTag)) {
      // Remove the active class on the tag element
      tags[tag].classList.remove(classes.selectedTag);

      activeTags.delete(tag);
    } else {
      tags[tag].classList.add(classes.selectedTag);
      activeTags.add(tag);
    }

    for (const { el } of recipes) {
      // Clear unwanted classes leftover from potential searches
      el.classList.remove(classes.weighted);

      // Initially, hide the element
      el.classList.add(classes.hidden);

      // If we don't have any active tags, change course and show the element.
      // We only want to hide elements when there is at least one active tag
      if (activeTags.size === 0) {
        el.classList.remove(classes.hidden);
      }

      for (const activeTag of activeTags) {
        if (tagsMappedToRecipes[activeTag].has(el)) {
          el.classList.remove(classes.hidden);
          break;
        }
      }
    }
  };

  // This function is useful for allowing searches to clear active tags properly.
  clearActiveTags = () => {
    for (const activeTag of activeTags) {
      tags[activeTag].classList.remove(classes.selectedTag);
    }

    activeTags.clear();
  };

  // Bind a single click handler to the parent container of our tag buttons
  tagCloud.addEventListener("click", ev => {
    // Make sure the element that was clicked is one of the buttons, otherwise
    // bail out
    if (!ev.target.classList.contains(classes.tag)) {
      return;
    }

    // Clear search field on click
    if (searchInput !== null) {
      searchInput.value = "";
    }

    toggleTag(ev.target.dataset.tag);
  });
}

if (searchInput !== null) {
  searchInput.addEventListener("input", createSearchListener());

  if (clearActiveTags) {
    // Clear selected tags on input
    searchInput.addEventListener(
      "input",
      debounce(clearActiveTags, 200, false)
    );
  }
}

// Handle dark mode toggle

const darkModeToggle = document.getElementById("dark-mode-toggle");

const enableDarkMode = isOn => {
  if (isOn) {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }
};

const updateToggle = isOn =>
  darkModeToggle !== null && (darkModeToggle.checked = isOn);

if (darkModeToggle !== null) {
  darkModeToggle.checked = useDarkMode;

  darkModeToggle.addEventListener("input", ev => {
    const { checked } = ev.target;

    enableDarkMode(checked);

    localStorage.setItem("use-dark-mode", checked ? "yes" : "no");
  });
}

window.addEventListener("storage", ev => {
  if (ev.key === "use-dark-mode") {
    enableDarkMode(ev.newValue === "yes");
    updateToggle(ev.newValue === "yes");
  }
});

// Respond to changes for prefers-color-scheme

const query = matchMedia("(prefers-color-scheme: dark)");

const matchListener = ev => {
  enableDarkMode(ev.matches);
  updateToggle(ev.matches);
  localStorage.setItem("use-dark-mode", ev.matches ? "yes" : "no");
};

// Safari doesn't currently support addEventListener on MediaQueryList
if ("addEventListener" in query) {
  query.addEventListener("change", matchListener);
} else {
  query.addListener(matchListener);
}

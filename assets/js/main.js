//
// Utility functions
//

/**
 * @param {Function} fn
 * @param {number} delay
 */
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
      if (!initialTimestamp) {
        initialTimestamp = timestamp;
      }

      if (timestamp - initialTimestamp >= delay || delay <= 0) {
        initialTimestamp = null;
        return fn(...args);
      }

      currentAnimationFrame = requestAnimationFrame(tick);
    };

    currentAnimationFrame = requestAnimationFrame(tick);
  };
};

const memoize = fn => {
  const cache = {};

  return x => (cache.hasOwnProperty(x) ? cache[x] : (cache[x] = fn(x)));
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
// Search functionality
//

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

// Handle searching if the search input exists
const searchInput = document.getElementById("recipes-search-field");

if (searchInput !== null) {
  searchInput.addEventListener("input", createSearchListener());
}

// Handle dark mode toggle

const enableDarkMode = isOn => {
  if (Boolean(isOn)) {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }
};

const darkModeToggle = document.getElementById("dark-mode-toggle");

if (darkModeToggle) {
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
    if (darkModeToggle) {
      darkModeToggle.checked = ev.newValue === "yes";
    }
  }
});

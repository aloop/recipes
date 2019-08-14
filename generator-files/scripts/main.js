// Handle searching if the search input exists
const searchInput = document.querySelector("#search");

if (searchInput !== null) {
  import("./modules/search-SEARCHDOTJS_HASH.js").then(
    ({ createSearchListener }) => {
      searchInput.addEventListener("input", createSearchListener());
    }
  );
}

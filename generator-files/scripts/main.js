// Register service worker for offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}

// Handle searching if the search input exists
const searchInput = document.querySelector("#search_field");

if (searchInput !== null) {
  import("./modules/search-SEARCHDOTJS_HASH.js").then(
    ({ createSearchListener }) => {
      searchInput.addEventListener("input", createSearchListener());
    }
  );
}

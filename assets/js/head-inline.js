const d = document.documentElement;
d.classList.remove("no-js");

let useDarkMode = localStorage.getItem("use-dark-mode");

if (useDarkMode === null) {
  if (window.matchMedia("prefers-color-scheme: dark")) {
    useDarkMode = true;
  }

  useDarkMode = false;
} else {
  useDarkMode = useDarkMode === "yes";
}

d.classList.add(useDarkMode ? "dark" : "light");
d.classList.remove(!useDarkMode ? "dark" : "light");

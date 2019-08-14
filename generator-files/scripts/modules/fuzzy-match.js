import { memoize } from "./utils-UTILSDOTJS_HASH.js";

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

export default fuzzyMatch;

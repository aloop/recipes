/**
 * @param {Function} fn
 * @param {number} delay
 */
export const debounce = (fn, delay = 100) => {
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

export const memoize = fn => {
  const cache = {};

  return x => (cache.hasOwnProperty(x) ? cache[x] : (cache[x] = fn(x)));
};

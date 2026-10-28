/** Returns a copy of `source` containing only the listed keys that are defined. */
export const pick = (source = {}, keys = []) =>
  keys.reduce((acc, key) => {
    if (source[key] !== undefined) acc[key] = source[key];
    return acc;
  }, {});

/** Returns a copy of `source` without the listed keys. */
export const omit = (source = {}, keys = []) => {
  const copy = { ...source };
  keys.forEach((key) => delete copy[key]);
  return copy;
};

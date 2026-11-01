/**
 * Test-only helpers. With `noUncheckedIndexedAccess` an index read is
 * `T | undefined`; in a test an absent element is a failed expectation, so
 * these read it or throw a message that names what was missing.
 */

/** The element at `index`, or a thrown error: a test that indexes past the end has already failed. */
export function at<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index.toString()}, found ${items.length.toString()} elements`);
  }
  return item;
}

/** The value, or a thrown error naming what was expected. */
export function present<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`expected ${what}`);
  return value;
}

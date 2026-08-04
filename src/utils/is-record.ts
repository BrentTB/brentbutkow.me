/**
 * Narrows unknown JSON to something whose keys can be read.
 *
 * The first step of every payload guard in the codebase: `typeof null === 'object'`, so a plain
 * `typeof` check hands you a value that throws on property access. Arrays pass — an array is a record
 * with numeric keys, and the guards that want a list check `Array.isArray` themselves.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

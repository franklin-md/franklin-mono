/**
 * Controls store ownership when an agent spawns a child.
 *
 * - `'private'`  — child gets its own instance (behavior depends on ForkMode)
 * - `'shared'`   — child gets the same store instance as the parent
 */
export type Sharing = 'shared' | 'private';

/**
 * Controls what happens to `'private'` stores when `.share()` is called.
 *
 * - `'copy'`  — child starts with a snapshot of the parent's current value
 * - `'fresh'` — child is omitted, forcing a fresh store from `initial`
 */
export type ForkMode = 'copy' | 'fresh';

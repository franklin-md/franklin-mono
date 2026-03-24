/**
 * Controls how a store behaves when an agent spawns a child.
 *
 * - `'private'`  — child gets an independent snapshot of current state
 * - `'inherit'`  — child gets the same store instance as the parent
 */

// TODO: Delete global from code base
// TODO: Renamed inherit to shared
export type Sharing = 'private' | 'inherit' | 'global';

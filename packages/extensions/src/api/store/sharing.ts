/**
 * Controls how a store behaves when an agent spawns a child.
 *
 * - `'private'`  — child gets an independent snapshot of current state
 * - `'inherit'`  — child gets the same store instance as the parent
 * - `'global'`   — same instance shared across all agents (copy is always identity)
 */
export type Sharing = 'private' | 'inherit' | 'global';

/**
 * When copying stores for a child, the effective behavior is determined by
 * combining the store's declared sharing with the requested copy level.
 *
 * The store's sharing acts as a floor — a global store can never be
 * snapshotted, regardless of the copy level. The copy level acts as
 * a ceiling — even an inherit store gets snapshotted if the copy
 * level is private.
 *
 * Should this store be snapshotted?
 *
 * | Store \ Copy | private | inherit | global |
 * |--------------|---------|---------|--------|
 * | private      | yes     | yes     | yes    |
 * | inherit      | yes     | no      | no     |
 * | global       | no      | no      | no     |
 */
export function shouldSnapshot(
	storeDeclared: Sharing,
	copyLevel: Sharing,
): boolean {
	if (storeDeclared === 'global') return false;
	if (storeDeclared === 'private') return true;
	// inherit: snapshot only if copy level is private
	return copyLevel === 'private';
}

import type { AbsolutePath } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';

export interface WalkUpArgs<T> {
	startDir: AbsolutePath;
	/** If set, the walk stops after visiting this directory (inclusive). */
	endDir?: AbsolutePath;
	/**
	 * Called at each directory visited during the upward walk.
	 * Returns the items discovered at that directory.
	 *
	 * @param dir   - The directory currently being visited.
	 */
	discover: (dir: AbsolutePath) => Promise<T[]>;
}

/**
 * Walks upward from `startDir`, calling `discover` at each level and collecting
 * all results into a flat array in top-down order (startDir first).
 *
 * Stops after visiting `endDir` (inclusive) or the filesystem root, whichever
 * comes first. If `endDir` is not reachable from `startDir` the walk terminates
 * naturally at the filesystem root.
 */
export async function walkUp<T>(args: WalkUpArgs<T>): Promise<T[]> {
	const { startDir, endDir, discover } = args;
	const results: T[] = [];
	let current = startDir;

	for (;;) {
		const found = await discover(current);
		results.push(...found);

		if (endDir !== undefined && current === endDir) break;

		const parent = joinAbsolute(current, '..');
		if (parent === current) break; // reached the filesystem root

		current = parent;
	}

	return results;
}

// TODO: I think this disappears.
export function getValueAtPath(target: unknown, path: string[]): unknown {
	let current: unknown = target;
	for (const key of path) {
		if (typeof current !== 'object' || current === null) {
			throw new Error(
				`getValueAtPath: nothing at "${key}" (full path: ${path.join('.')})`,
			);
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

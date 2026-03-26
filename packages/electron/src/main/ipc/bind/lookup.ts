export function getValueAtPath(target: unknown, path: string[]): unknown {
	let current = target as Record<string, unknown>;
	for (let i = 0; i < path.length; i++) {
		const key = path[i]!;
		if (current == null || typeof current !== 'object') {
			throw new Error(
				`getValueAtPath: nothing at "${key}" (full path: ${path.join('.')})`,
			);
		}
		current = current[key] as Record<string, unknown>;
	}
	return current;
}

import type { ResultShape } from './types.js';

/**
 * Serializes a proxy object into plain data by calling each callable leaf.
 * Used on the main-process side before sending over IPC.
 */
export async function serializeProxy(
	value: unknown,
	shape: ResultShape,
): Promise<unknown> {
	const source = value as Record<string, unknown>;
	const result: Record<string, unknown> = {};

	for (const [key, child] of Object.entries(shape)) {
		if (child === true) {
			result[key] = await (source[key] as () => unknown)();
		} else {
			result[key] = await serializeProxy(source[key], child);
		}
	}

	return result;
}

/**
 * Deserializes plain data back into a proxy object by wrapping each leaf as a function.
 * Used on the preload/renderer side after receiving from IPC.
 */
export function deserializeProxy(value: unknown, shape: ResultShape): unknown {
	const source = value as Record<string, unknown>;
	const result: Record<string, unknown> = {};

	for (const [key, child] of Object.entries(shape)) {
		if (child === true) {
			const val = source[key];
			result[key] = () => val;
		} else {
			result[key] = deserializeProxy(source[key], child);
		}
	}

	return result;
}

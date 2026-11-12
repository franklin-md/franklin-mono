import type { ReplacementFailure } from './types.js';

export function directiveFailure(
	path: string,
	error: unknown,
): ReplacementFailure {
	return {
		path,
		error: error instanceof Error ? error.message : String(error),
	};
}

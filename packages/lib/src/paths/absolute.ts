import { posixJoin } from './join.js';

// ---------------------------------------------------------------------------
// Branded absolute-path type
// ---------------------------------------------------------------------------

export type AbsolutePath = string & { readonly __brand: 'AbsolutePath' };

/** Cast a string to `AbsolutePath` with a runtime guard. */
export function toAbsolutePath(s: string): AbsolutePath {
	if (!s.startsWith('/'))
		throw new Error(`Expected an absolute path, got: ${s}`);
	return s as AbsolutePath;
}

/** Join segments onto an `AbsolutePath`, preserving the brand. */
export function joinAbsolute(
	base: AbsolutePath,
	...segments: string[]
): AbsolutePath {
	return posixJoin(base, ...segments) as AbsolutePath;
}

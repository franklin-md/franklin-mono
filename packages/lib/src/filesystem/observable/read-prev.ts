import type { AbsolutePath } from '../../paths/index.js';
import type { Filesystem } from '../types.js';

function isENOENT(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const code = (err as Error & { code?: unknown }).code;
	return code === 'ENOENT';
}

/**
 * Reads the current contents of `path` so the observer can emit it as
 * the pre-image of a subsequent write. Missing file → `null`. Any
 * other read failure is logged and coerced to `null`: losing the
 * pre-image is preferable to blocking the write.
 */
export async function readPrev(
	inner: Filesystem,
	path: AbsolutePath,
): Promise<Uint8Array | null> {
	try {
		return await inner.readFile(path);
	} catch (err) {
		if (isENOENT(err)) return null;
		console.warn(`observable-filesystem: pre-read failed for ${path}`, err);
		return null;
	}
}

import type { AbsolutePath } from '../../paths/index.js';
import type { Filesystem } from '../../filesystem/types.js';
import type { Codec } from '../codec/types.js';
import type { Issue } from '../issue/types.js';
import { corruptJsonIssue, issueFromDecode } from '../issue/factory.js';

type DecodeFilesystem = Pick<Filesystem, 'readFile'>;

/**
 * Reads and decodes a single map entry through the given codec.
 *
 * Returns either a value (success) or an issue (any failure). Unlike the
 * single-file variant, the file is assumed to be present — callers iterate
 * the result of `readdir`.
 */
export async function decodeMapEntry<T>(
	fs: DecodeFilesystem,
	path: AbsolutePath,
	id: string,
	codec: Codec<T>,
): Promise<
	{ value: T; issue?: undefined } | { value?: undefined; issue: Issue }
> {
	let raw: Uint8Array;
	try {
		raw = await fs.readFile(path);
	} catch (err) {
		return { issue: corruptJsonIssue(path, err, id) };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(raw));
	} catch (err) {
		return { issue: corruptJsonIssue(path, err, id) };
	}

	const decoded = codec.decode(parsed);
	if (!decoded.ok) {
		return { issue: issueFromDecode(decoded.issue, path, id) };
	}
	return { value: decoded.value };
}

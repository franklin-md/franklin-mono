import type { AbsolutePath } from '../../paths/index.js';
import type { Filesystem } from '../../filesystem/types.js';
import type { Codec } from '../codec/types.js';
import type { Issue } from '../issue/types.js';
import { corruptJsonIssue, issueFromDecode } from '../issue/factory.js';

type DecodeFilesystem = Pick<Filesystem, 'readFile' | 'exists'>;

/**
 * Reads and decodes a single file through the given codec.
 *
 * Missing file → `{ value: undefined, issues: [] }` (normal first-run).
 * Any failure → `{ value: undefined, issues: [<one Issue>] }`.
 */
export async function decodeSingleFile<T>(
	fs: DecodeFilesystem,
	path: AbsolutePath,
	codec: Codec<T>,
): Promise<{ value: T | undefined; issues: Issue[] }> {
	if (!(await fs.exists(path))) return { value: undefined, issues: [] };

	let raw: Uint8Array;
	try {
		raw = await fs.readFile(path);
	} catch (err) {
		return { value: undefined, issues: [corruptJsonIssue(path, err)] };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(raw));
	} catch (err) {
		return { value: undefined, issues: [corruptJsonIssue(path, err)] };
	}

	const decoded = codec.decode(parsed);
	if (!decoded.ok) {
		return { value: undefined, issues: [issueFromDecode(decoded.issue, path)] };
	}
	return { value: decoded.value, issues: [] };
}

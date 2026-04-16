/**
 * Pure posix-style path join — no `node:path` dependency.
 *
 * Concatenates segments with `/`, then normalises the result
 * (collapses `//`, resolves `.` and `..`).
 */
export function posixJoin(...segments: string[]): string {
	const joined = segments.join('/');
	return normalizePosix(joined);
}

function normalizePosix(p: string): string {
	const isAbsolute = p.startsWith('/');
	const parts = p.split('/');
	const out: string[] = [];

	for (const part of parts) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			if (out.length > 0 && out[out.length - 1] !== '..') {
				out.pop();
			} else if (!isAbsolute) {
				out.push('..');
			}
		} else {
			out.push(part);
		}
	}

	let result = out.join('/');
	if (isAbsolute) result = '/' + result;
	if (!result) result = '.';
	return result;
}

const ABSOLUTE_PATH_TOKEN = /^(?:\/|[A-Za-z]:[\\/])/;

export const GREP_SINGLE_PATH_MESSAGE =
	'Pass a single file or directory path. Do not concatenate multiple paths into one string; use a common parent path or separate grep calls.';

export function looksLikeMultipleAbsolutePaths(path: string): boolean {
	const tokens = path.trim().split(/\s+/).filter(Boolean);
	let absoluteCount = 0;
	for (const token of tokens) {
		if (!ABSOLUTE_PATH_TOKEN.test(token)) continue;
		absoluteCount += 1;
		if (absoluteCount >= 2) return true;
	}
	return false;
}

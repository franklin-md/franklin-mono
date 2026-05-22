import type { GrepResult } from './types.js';

const GREP_UNAVAILABLE_MESSAGE =
	'grep is not available in this environment. Use `glob` to locate files and `read_file` to inspect contents.';

export function unavailableGrepResult(): GrepResult {
	return {
		status: 'error',
		text: GREP_UNAVAILABLE_MESSAGE,
		matches: [],
		truncated: false,
	};
}

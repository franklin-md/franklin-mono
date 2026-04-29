import type { ProcessOutput } from '@franklin/lib';
import { collectMatches } from '../backends/collect.js';
import type { Backend } from '../backends/types.js';
import type { GrepParams } from '../tools.js';
import { formatMatches } from './matches.js';
import type { GrepResult } from './types.js';

// Output budget: ~50 matches, 12k chars of formatted output, leaves room for
// file headers and the truncation note under the hard cap.
const DEFAULT_LIMIT = 50;
const MAX_FORMATTED_CHARS = 12_000;
const GREP_SINGLE_PATH_HINT =
	'\nHint: `path` accepts a single file or directory. Use a common parent or separate calls when searching multiple roots.';
const PARTIAL_RESULTS_WARNING_NOTE =
	'(grep exited with warnings; results may be incomplete)';

export function formatGrepResult(
	processOutput: ProcessOutput,
	backend: Backend,
	params: GrepParams,
): GrepResult {
	const { exit_code, stdout, stderr } = processOutput;
	const { matches, truncated } = collectMatches(
		stdout,
		backend.parseLine,
		params.limit ?? DEFAULT_LIMIT,
	);

	// Both rg and grep use the same exit-code convention:
	//   0 = matches found, 1 = no matches, >=2 = real error.
	if (exit_code >= 2) {
		if (matches.length > 0) {
			return {
				output: withWarning(
					formatMatches(matches, {
						truncated,
						maxLength: MAX_FORMATTED_CHARS,
					}),
					stderr,
				),
				isError: false,
			};
		}
		const hint = params.path ? GREP_SINGLE_PATH_HINT : '';
		return {
			output: `grep failed (exit ${exit_code}): ${stderr || stdout}${hint}`,
			isError: true,
		};
	}

	return {
		output: formatMatches(matches, {
			truncated,
			maxLength: MAX_FORMATTED_CHARS,
		}),
		isError: false,
	};
}

function withWarning(output: string, stderr: string): string {
	const warning = stderr.trim().split('\n')[0];
	if (!warning) return `${output}\n${PARTIAL_RESULTS_WARNING_NOTE}`;
	return `${output}\n${PARTIAL_RESULTS_WARNING_NOTE}: ${warning}`;
}

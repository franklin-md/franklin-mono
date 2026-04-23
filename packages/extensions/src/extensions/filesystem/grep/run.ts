import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import { collectMatches } from './backends/collect.js';
import { createBackend } from './backends/index.js';
import type { GrepBackendKind } from './backends/types.js';
import { formatMatches } from './format/matches.js';
import type { GrepParams } from './tools.js';
import {
	GREP_SINGLE_PATH_MESSAGE,
	looksLikeMultipleAbsolutePaths,
} from './validate.js';

// Output budget: ~50 matches, 12k chars of formatted output, leaves room for
// file headers and the truncation note under the hard cap.
const DEFAULT_LIMIT = 50;
const MAX_FORMATTED_CHARS = 12_000;
const RUN_TIMEOUT_MS = 10_000;

export interface RunGrepResult {
	output: string;
	isError: boolean;
}

export async function runGrep(
	backendKind: GrepBackendKind,
	params: GrepParams,
	env: ReconfigurableEnvironment,
): Promise<RunGrepResult> {
	if (backendKind === 'none') {
		return {
			output:
				'grep is not available in this environment. Use `glob` to locate files and `read_file` to inspect contents.',
			isError: true,
		};
	}

	const backend = createBackend(backendKind);
	if (!backend) {
		return {
			output:
				'grep is not available in this environment. Use `glob` to locate files and `read_file` to inspect contents.',
			isError: true,
		};
	}

	if (params.path && looksLikeMultipleAbsolutePaths(params.path)) {
		return {
			output: GREP_SINGLE_PATH_MESSAGE,
			isError: true,
		};
	}

	const limit = params.limit ?? DEFAULT_LIMIT;
	const target = params.path
		? await env.filesystem.resolve(params.path)
		: (await env.config()).fsConfig.cwd;

	const args = backend.args(params, target);

	const { exit_code, stdout, stderr } = await env.process.exec({
		file: backend.file,
		args,
		timeout: RUN_TIMEOUT_MS,
	});

	// Both rg and grep use the same exit-code convention:
	//   0 = matches found, 1 = no matches, ≥2 = real error.
	if (exit_code >= 2) {
		const hint = params.path
			? '\nHint: `path` accepts a single file or directory. Use a common parent or separate calls when searching multiple roots.'
			: '';
		return {
			output: `grep failed (exit ${exit_code}): ${stderr || stdout}${hint}`,
			isError: true,
		};
	}

	const { matches, truncated } = collectMatches(
		stdout,
		backend.parseLine,
		limit,
	);
	return {
		output: formatMatches(matches, {
			truncated,
			maxLength: MAX_FORMATTED_CHARS,
		}),
		isError: false,
	};
}

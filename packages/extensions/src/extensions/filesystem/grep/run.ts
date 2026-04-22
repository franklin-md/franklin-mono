import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import { grepCommand } from './backends/grep/command.js';
import { ripgrepCommand } from './backends/ripgrep/command.js';
import type { GrepBackend } from './detect.js';
import { formatMatches } from './format/matches.js';
import type { GrepParams } from './tools.js';
import {
	GREP_SINGLE_PATH_MESSAGE,
	looksLikeMultipleAbsolutePaths,
} from './validate.js';

// Output budget: ~50 matches × ~240 chars per preview ≈ 12k chars worst case,
// keeping the three caps in alignment.
const DEFAULT_LIMIT = 50;
const MAX_FORMATTED_CHARS = 12_000;
const MAX_MATCH_TEXT_CHARS = 240;
const RUN_TIMEOUT_MS = 10_000;

export interface RunGrepResult {
	output: string;
	isError: boolean;
}

export async function runGrep(
	backend: GrepBackend,
	params: GrepParams,
	env: ReconfigurableEnvironment,
): Promise<RunGrepResult> {
	if (backend.kind === 'none') {
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

	const command =
		backend.kind === 'ripgrep'
			? ripgrepCommand(backend.command, params, limit, target)
			: grepCommand(backend.command, params, target);

	const { exit_code, stdout, stderr } = await env.process.exec({
		file: command.file,
		args: command.args,
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

	const matches = command.parse(stdout, limit);
	return {
		output: formatMatches(matches, {
			truncated: matches.length >= limit,
			maxChars: MAX_FORMATTED_CHARS,
			maxMatchTextChars: MAX_MATCH_TEXT_CHARS,
		}),
		isError: false,
	};
}

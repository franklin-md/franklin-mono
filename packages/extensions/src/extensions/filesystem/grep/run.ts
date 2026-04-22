import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import type { GrepBackend } from './detect.js';
import type { GrepParams } from './tools.js';
import {
	formatMatches,
	parseGrepOutput,
	parseRipgrepJson,
	type GrepMatch,
} from './format.js';

const DEFAULT_LIMIT = 100;
const RUN_TIMEOUT_MS = 10_000;

type Parser = (stdout: string, limit: number) => GrepMatch[];

interface BackendCommand {
	file: string;
	args: string[];
	parse: Parser;
}

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
		return {
			output: `grep failed (exit ${exit_code}): ${stderr || stdout}`,
			isError: true,
		};
	}

	const matches = command.parse(stdout, limit);
	return {
		output: formatMatches(matches, matches.length >= limit),
		isError: false,
	};
}

function ripgrepCommand(
	command: string,
	params: GrepParams,
	limit: number,
	target: string,
): BackendCommand {
	const args = ['--json', '--color=never', `--max-count=${limit}`];
	if (params.case_insensitive) args.push('-i');
	if (params.include) args.push('--glob', params.include);
	args.push('-e', params.pattern, '--', target);
	return { file: command, args, parse: parseRipgrepJson };
}

function grepCommand(
	command: string,
	params: GrepParams,
	target: string,
): BackendCommand {
	const args = ['-rEnI', '--color=never'];
	if (params.case_insensitive) args.push('-i');
	if (params.include) args.push(`--include=${params.include}`);
	args.push('-e', params.pattern, '--', target);
	return { file: command, args, parse: parseGrepOutput };
}

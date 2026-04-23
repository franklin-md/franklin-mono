import type { GrepParams } from '../../tools.js';
import type { BackendCommand } from '../types.js';
import { parseGrepOutput } from './parse.js';

export function grepCommand(
	command: string,
	params: GrepParams,
	target: string,
): BackendCommand {
	/*
  -r: Recursively search directories
  -E: Use extended regular expressions
  -n: Show line numbers in output
  -I: Ignore binary files
  --color=never: Disable color output
  -i: Ignore case

  --include=GLOB: Only search files that match the glob pattern
  */
	const args = ['-rEnI', '--color=never'];
	if (params.case_insensitive) args.push('-i');
	if (params.include) args.push(`--include=${params.include}`);
	args.push('-e', params.pattern, '--', target);
	return { file: command, args, parse: parseGrepOutput };
}

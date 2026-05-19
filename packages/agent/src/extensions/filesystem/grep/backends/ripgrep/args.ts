import type { GrepParams } from '../../tools.js';

export function ripgrepArgs(params: GrepParams, target: string): string[] {
	const args = [
		'--json',
		'--color=never',
		// Defines max line length in output
		// But the man pages say that in json mode, this is ignored.
		// '--max-columns=240',
		// '--max-columns-preview',
	];
	if (params.case_insensitive) args.push('-i');
	if (params.include) args.push('--glob', params.include);
	args.push('-e', params.pattern, '--', target);
	return args;
}

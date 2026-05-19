import type { Backend } from '../types.js';
import { ripgrepArgs } from './args.js';
import { parseRipgrepLine } from './parse.js';

export function ripgrepBackend(): Backend {
	return {
		kind: 'ripgrep',
		file: 'rg',
		args: ripgrepArgs,
		parseLine: parseRipgrepLine,
	};
}

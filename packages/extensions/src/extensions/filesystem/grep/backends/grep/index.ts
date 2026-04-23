import type { Backend } from '../types.js';
import { grepArgs } from './args.js';
import { parseGrepLine } from './parse.js';

export function grepBackend(): Backend {
	return {
		kind: 'grep',
		file: 'grep',
		args: grepArgs,
		parseLine: parseGrepLine,
	};
}

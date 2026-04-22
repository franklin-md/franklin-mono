import type { GrepMatch } from '../format/types.js';

export type Parser = (stdout: string, limit: number) => GrepMatch[];

export interface BackendCommand {
	file: string;
	args: string[];
	parse: Parser;
}

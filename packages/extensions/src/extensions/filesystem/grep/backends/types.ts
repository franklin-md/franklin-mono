import type { GrepMatch } from '../format/types.js';
import type { GrepParams } from '../tools.js';

export type LineParser = (line: string) => GrepMatch | undefined;

export type GrepBackendKind = 'ripgrep' | 'grep' | 'none';

export interface Backend {
	kind: Exclude<GrepBackendKind, 'none'>;
	file: string;
	args: (params: GrepParams, target: string) => string[];
	parseLine: LineParser;
}

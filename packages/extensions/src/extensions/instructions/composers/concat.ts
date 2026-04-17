import type { LoadedInstruction } from './loader.js';

type ConcatOptions = {
	readonly separator?: string; // Default: '\n'
	readonly render?: (instruction: LoadedInstruction) => string;
};

export function concat(
	instructions: LoadedInstruction[],
	options: ConcatOptions = {},
): string {
	const { separator = '\n', render } = options;
	return instructions
		.map((instruction) => (render ? render(instruction) : instruction.content))
		.join(separator);
}

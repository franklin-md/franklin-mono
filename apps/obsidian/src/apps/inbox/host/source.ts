import type { TFile } from 'obsidian';
import type { QuestionSource, SourcePosition } from '../types.js';
import { captureOutline } from './outline.js';

type Options = {
	content: string;
	file: Pick<TFile, 'basename' | 'path'>;
	from: SourcePosition;
	to: SourcePosition;
	quote: string;
};

export function createQuestionSource({
	content,
	file,
	from,
	to,
	quote,
}: Options): QuestionSource {
	const lines = content.split('\n');
	const start =
		lines
			.slice(0, from.line)
			.reduce((size, line) => size + line.length + 1, 0) + from.ch;
	const end =
		lines.slice(0, to.line).reduce((size, line) => size + line.length + 1, 0) +
		to.ch;
	const heading =
		lines
			.slice(0, from.line + 1)
			.reverse()
			.find((line) => /^#{1,6}\s+/.test(line))
			?.replace(/^#{1,6}\s+/, '') ?? '';
	return {
		note: file.basename,
		heading,
		quote,
		outline: captureOutline(content, from.line),
		location: {
			id: crypto.randomUUID(),
			path: file.path,
			from,
			to,
			context: content.slice(
				Math.max(0, start - 1200),
				Math.min(content.length, end + 1200),
			),
			capturedAt: Date.now(),
		},
	};
}

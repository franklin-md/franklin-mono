import { decode } from '@franklin/lib';
import type { CoreModule } from '../../modules/core/index.js';
import type {
	Reference,
	ReferenceHandler,
	ResolvedReference,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import {
	ParsedSelector,
	parseSelectorIntegerRangeValue,
} from '../../modules/references/selectors/index.js';
import { defineExtension } from '../../modules/state/index.js';
import { assertBytesData, hasBytesData } from './data.js';

export type TextReferenceSelector = {
	readonly lines?: TextLineRange;
	readonly offset?: number;
	readonly limit?: number;
};

export type TextLineRange = {
	readonly start: number;
	readonly end: number;
};

// Keep this aligned with filesystem read_file's historical default. It gives
// explicit reads a useful chunk while preventing reference materialization from
// silently inlining an entire large file; callers can continue with lines=N-M.
const TEXT_MATERIALIZATION_LINE_LIMIT = 2_000;

const textDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return hasBytesData(reference) && isTextData(reference);
	},
	toContext(reference) {
		assertBytesData(reference);
		const text = decode(reference.data.bytes);
		const selectedText = formatTextSelection(
			selectTextLines(text, reference.selector),
		);
		return {
			content: {
				type: 'text',
				text: formatReferenceText(reference, selectedText),
			},
		};
	},
};

export const textDocumentReferenceExtension = defineExtension<
	[ReferencesModule, CoreModule]
>((api) => {
	api.registerReferenceHandler(textDocumentReferenceHandler);
	api.on('systemPrompt', (prompt) => {
		prompt.setPart(
			'Reading text is supported.\nSupported selectors:\n- lines=N-M\n- offset=N;limit=N\nText line numbers are 1-based.',
			{ once: true },
		);
	});
});

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	return reference.locator;
}

function materializedReferenceLabel(reference: ResolvedReference): string {
	if (reference.label) return reference.label;
	if (hasBytesData(reference)) return reference.locator;
	return referenceLabel(reference);
}

function formatReferenceText(
	reference: ResolvedReference,
	text: string,
): string {
	return `Reference: ${materializedReferenceLabel(reference)}\n\n${text}`;
}

function isTextData(reference: ResolvedReference): boolean {
	const mime = reference.data?.mime;
	return mime === undefined || mime.startsWith('text/');
}

type TextSelection = {
	readonly text: string;
	readonly note?: string;
};

function selectTextLines(
	text: string,
	selector: string | undefined,
): TextSelection {
	const parsedSelector = parseTextMaterializationSelector(selector);
	if (parsedSelector.issue) {
		return { text: '', note: parsedSelector.issue };
	}
	const textSelector = parsedSelector.selector;
	const lines = text.split('\n');
	const totalLines = lines.length;
	const requestedRange = requestedTextLineRange(textSelector, totalLines);
	const materializedEnd = Math.min(
		requestedRange.end,
		requestedRange.start + TEXT_MATERIALIZATION_LINE_LIMIT - 1,
		totalLines,
	);
	if (requestedRange.start > totalLines) {
		return {
			text: '',
			note: `No text lines selected: selector "${formatTextLineSelector(
				requestedRange,
			)}" starts after the document ends at line ${totalLines}.`,
		};
	}

	const selectedText = sliceTextLines(
		lines,
		requestedRange.start,
		materializedEnd,
	);
	if (materializedEnd >= requestedRange.end || materializedEnd >= totalLines) {
		return { text: selectedText };
	}

	const nextStart = materializedEnd + 1;
	const nextEnd = Math.min(requestedRange.end, totalLines);
	return {
		text: selectedText,
		note: `Text materialization limited: showing lines ${
			requestedRange.start
		}-${materializedEnd} of ${totalLines}. Continue with selector "lines=${nextStart}-${nextEnd}".`,
	};
}

function formatTextSelection(selection: TextSelection): string {
	if (!selection.note) return selection.text;
	if (!selection.text) return selection.note;
	return `${selection.text}\n\n${selection.note}`;
}

type ParsedTextMaterializationSelector = {
	readonly selector: TextReferenceSelector;
	readonly issue?: string;
};

function parseTextMaterializationSelector(
	selector: string | undefined,
): ParsedTextMaterializationSelector {
	const parsed = ParsedSelector.parse(selector);
	const rawLines = parsed.string('lines');
	if (rawLines !== undefined) {
		const parsedRange = parseSelectorIntegerRangeValue(rawLines, { min: 1 });
		if (!parsedRange.ok) {
			const reversed = parsedRange.reversed;
			if (reversed) {
				return {
					selector: {},
					issue: `No text lines selected: selector "lines=${rawLines}" starts after it ends. Use lines=${reversed.end}-${reversed.start} to read that range.`,
				};
			}
			return {
				selector: {},
				issue: `No text lines selected: selector "lines=${rawLines}" is invalid. Use lines=N-M to read a bounded range.`,
			};
		}
		return { selector: { lines: parsedRange.range } };
	}

	const rawOffset = parsed.string('offset');
	const rawLimit = parsed.string('limit');
	if (
		rawOffset !== undefined &&
		parsed.integer('offset', { min: 1 }) === undefined
	) {
		return {
			selector: {},
			issue: `No text lines selected: selector "offset=${rawOffset}" is invalid. Use offset=N;limit=N or lines=N-M.`,
		};
	}
	if (
		rawLimit !== undefined &&
		parsed.integer('limit', { min: 1 }) === undefined
	) {
		return {
			selector: {},
			issue: `No text lines selected: selector "limit=${rawLimit}" is invalid. Use offset=N;limit=N or lines=N-M.`,
		};
	}

	return { selector: parseTextReferenceSelector(selector) };
}

function requestedTextLineRange(
	selector: TextReferenceSelector,
	totalLines: number,
): TextLineRange {
	if (selector.lines) {
		return selector.lines;
	}
	const start = selector.offset ?? 1;
	if (selector.limit !== undefined) {
		return {
			start,
			end: start + selector.limit - 1,
		};
	}
	return { start, end: totalLines };
}

export function parseTextReferenceSelector(
	selector: string | undefined,
): TextReferenceSelector {
	const parsed = ParsedSelector.parse(selector);
	const lineRange = parsed.integerRange('lines', { min: 1 });
	if (lineRange) {
		return {
			lines: { start: lineRange.start, end: lineRange.end },
		};
	}

	const limit = parsed.integer('limit', { min: 1 });
	const offset = parsed.integer('offset', { min: 1 });
	return {
		...(offset !== undefined ? { offset } : {}),
		...(limit !== undefined ? { limit } : {}),
	};
}

function sliceTextLines(
	lines: readonly string[],
	startLine: number,
	endLine: number,
): string {
	const start = startLine - 1;
	return lines.slice(start, endLine).join('\n');
}

function formatTextLineSelector(range: TextLineRange): string {
	return `lines=${range.start}-${range.end}`;
}

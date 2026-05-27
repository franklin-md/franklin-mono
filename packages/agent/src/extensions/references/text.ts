import { decode } from '@franklin/lib';
import type { CoreModule } from '../../modules/core/index.js';
import type {
	Reference,
	ReferenceHandler,
	ResolvedReference,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import { ParsedSelector } from '../../modules/references/selectors/index.js';
import { defineExtension } from '../../modules/state/index.js';
import { hasBytesData } from './data.js';

export const TEXT_REFERENCE_TYPE = 'text';

export type TextReferenceSelector = {
	readonly lines?: TextLineRange;
	readonly offset?: number;
	readonly limit?: number;
};

export type TextLineRange = {
	readonly start: number;
	readonly end: number;
};

const textDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return (
			reference.type === TEXT_REFERENCE_TYPE ||
			(hasBytesData(reference) && isTextData(reference))
		);
	},
	toContext(reference) {
		const data = reference.data;
		const text = hasBytesData(reference)
			? decode(reference.data.bytes)
			: reference.locator;
		const selectedText = applyTextSelector(text, reference.selector);
		if (data?.type === 'bytes') {
			return {
				content: [
					{
						type: 'text',
						text: selectedText,
					},
				],
			};
		}
		return {
			content: [
				{
					type: 'text',
					text: `Reference: ${referenceLabel(reference)}\n\n${selectedText}`,
				},
			],
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
	return reference.type ?? TEXT_REFERENCE_TYPE;
}

function isTextData(reference: ResolvedReference): boolean {
	const mime = reference.data?.mime;
	return mime === undefined || mime.startsWith('text/');
}

function applyTextSelector(text: string, selector: string | undefined): string {
	const textSelector = parseTextReferenceSelector(selector);
	if (textSelector.lines) {
		return sliceTextLines(
			text,
			textSelector.lines.start,
			textSelector.lines.end,
		);
	}

	if (textSelector.limit === undefined && textSelector.offset === undefined) {
		return text;
	}
	const offset = textSelector.offset ?? 1;
	return sliceTextLines(
		text,
		offset,
		textSelector.limit ? offset + textSelector.limit - 1 : undefined,
	);
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
	text: string,
	startLine: number,
	endLine: number | undefined,
): string {
	const lines = text.split('\n');
	const start = startLine - 1;
	const end = endLine === undefined ? undefined : endLine;
	return lines.slice(start, end).join('\n');
}

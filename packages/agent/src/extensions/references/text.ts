import { decode } from '@franklin/lib';
import type {
	Reference,
	ReferenceHandler,
	ResolvedReference,
} from '../../modules/references/api/index.js';
import { ParsedSelector } from '../../modules/references/selectors/index.js';
import { referenceHandlerExtension } from './handler.js';

const textDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return (
			reference.type === 'text.document' ||
			(reference.data?.type === 'bytes' && isTextData(reference))
		);
	},
	toContext(reference) {
		const data = reference.data;
		const text =
			data?.type === 'bytes' ? decode(data.bytes) : reference.locator;
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

export const textDocumentReferenceExtension = referenceHandlerExtension(
	textDocumentReferenceHandler,
);

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	return reference.type;
}

function isTextData(reference: ResolvedReference): boolean {
	const mime = reference.data?.mime;
	return mime === undefined || mime.startsWith('text/');
}

function applyTextSelector(text: string, selector: string | undefined): string {
	const parsed = ParsedSelector.parse(selector);
	const lineRange = parsed.integerRange('lines', { min: 1 });
	if (lineRange) {
		return sliceTextLines(text, lineRange.start, lineRange.end);
	}

	const limit = parsed.integer('limit', { min: 1 });
	const offset = parsed.integer('offset', { min: 1 }) ?? 1;
	if (limit === undefined && offset === 1) {
		return text;
	}
	return sliceTextLines(text, offset, limit ? offset + limit - 1 : undefined);
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

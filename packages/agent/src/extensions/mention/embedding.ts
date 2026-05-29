import type { Reference } from '../../modules/references/index.js';

const REFERENCE_MENTION_PREFIX = 'reference:';
const REFERENCE_MENTION_PATTERN = /@\{reference:([^}\n]+)\}/g;
const EXACT_REFERENCE_MENTION_PATTERN = /^@\{reference:([^}\n]+)\}$/;

export const MENTION_TRIGGER = '@';

export type MentionSegment =
	| {
			readonly type: 'text';
			readonly text: string;
	  }
	| {
			readonly type: 'reference';
			readonly reference: Reference;
	  };

type ReferenceMentionMatch = {
	readonly index: number;
	readonly text: string;
	readonly reference: Reference;
};

export function formatReferenceMention(reference: Reference): string {
	return `${MENTION_TRIGGER}{${REFERENCE_MENTION_PREFIX}${encodeReference(reference)}}`;
}

export function parseReferenceMention(text: string): Reference | undefined {
	const match = EXACT_REFERENCE_MENTION_PATTERN.exec(text);
	const encoded = match?.[1];
	if (encoded === undefined) return undefined;
	return decodeReference(encoded);
}

export function splitMentionSegments(text: string): readonly MentionSegment[] {
	const segments: MentionSegment[] = [];
	let lastIndex = 0;

	for (const mention of findReferenceMentions(text)) {
		if (mention.index > lastIndex) {
			segments.push({
				type: 'text',
				text: text.slice(lastIndex, mention.index),
			});
		}

		segments.push({
			type: 'reference',
			reference: mention.reference,
		});
		lastIndex = mention.index + mention.text.length;
	}

	if (lastIndex < text.length) {
		segments.push({
			type: 'text',
			text: text.slice(lastIndex),
		});
	}

	return segments;
}

function findReferenceMentions(text: string): readonly ReferenceMentionMatch[] {
	const mentions: ReferenceMentionMatch[] = [];

	for (const match of text.matchAll(REFERENCE_MENTION_PATTERN)) {
		const token = match[0];
		const encoded = match[1];
		if (encoded === undefined || encoded.length === 0) continue;

		const reference = decodeReference(encoded);
		if (reference === undefined) continue;

		mentions.push({
			index: match.index,
			text: token,
			reference,
		});
	}

	return mentions;
}

function encodeReference(reference: Reference): string {
	return encodeURIComponent(JSON.stringify(reference));
}

function decodeReference(encoded: string): Reference | undefined {
	try {
		const value = JSON.parse(decodeURIComponent(encoded));
		return isReference(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

function isReference(value: unknown): value is Reference {
	return (
		typeof value === 'object' &&
		value !== null &&
		'locator' in value &&
		typeof value.locator === 'string' &&
		(!('type' in value) || typeof value.type === 'string') &&
		(!('selector' in value) || typeof value.selector === 'string') &&
		(!('label' in value) || typeof value.label === 'string')
	);
}

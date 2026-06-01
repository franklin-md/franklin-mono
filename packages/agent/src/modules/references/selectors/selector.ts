import type {
	SelectorFieldValue,
	SelectorFields,
	SelectorIntegerOptions,
	SelectorIntegerRange,
	SelectorIntegerRangeParseResult,
} from './types.js';

export class ParsedSelector {
	private constructor(
		private readonly fields: Readonly<Record<string, string>>,
	) {}

	static parse(selector: string | undefined): ParsedSelector {
		// Selector examples:
		// - page=10
		// - pages=10-12
		// - quote=hello%3Bworld;section=intro
		if (!selector) return new ParsedSelector({});
		const fields: Record<string, string> = {};
		for (const part of selector.split(';')) {
			if (!part) continue;
			const [rawKey, rawValue] = part.split('=', 2);
			if (!rawKey || rawValue === undefined) continue;
			const key = decodeSelectorPart(rawKey);
			const value = decodeSelectorPart(rawValue);
			if (key === undefined || value === undefined || !key) continue;
			fields[key] = value;
		}
		return new ParsedSelector(fields);
	}

	static stringify(fields: SelectorFields): string {
		return Object.keys(fields)
			.sort()
			.flatMap((key) => {
				const value = fields[key];
				if (value === undefined) return [];
				return `${encodeSelectorPart(key)}=${encodeSelectorPart(formatSelectorValue(value))}`;
			})
			.join(';');
	}

	string(key: string): string | undefined {
		return this.fields[key];
	}

	integer(
		key: string,
		options: SelectorIntegerOptions = {},
	): number | undefined {
		const value = this.string(key);
		if (value === undefined) return undefined;
		return parseSelectorInteger(value, options);
	}

	integerRange(
		key: string,
		options: SelectorIntegerOptions = {},
	): SelectorIntegerRange | undefined {
		const value = this.string(key);
		if (value === undefined) return undefined;
		const parsed = parseSelectorIntegerRangeValue(value, options);
		return parsed.ok ? parsed.range : undefined;
	}
}

export function parseSelectorIntegerRangeValue(
	value: string,
	options: SelectorIntegerOptions = {},
): SelectorIntegerRangeParseResult {
	const parts = value.split('-');
	if (parts.length > 2) return { ok: false };
	const start = parseSelectorInteger(parts[0], options);
	const end =
		parts.length === 2 ? parseSelectorInteger(parts[1], options) : start;
	if (start === undefined || end === undefined) return { ok: false };
	if (start > end) return { ok: false, reversed: { start, end } };
	return { ok: true, range: { start, end } };
}

function formatSelectorValue(
	value: Exclude<SelectorFieldValue, undefined>,
): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	if (value.start === value.end) return String(value.start);
	return `${value.start}-${value.end}`;
}

function encodeSelectorPart(value: string): string {
	return encodeURIComponent(value);
}

function decodeSelectorPart(value: string): string | undefined {
	try {
		return decodeURIComponent(value);
	} catch {
		return undefined;
	}
}

function parseSelectorInteger(
	value: string | undefined,
	options: SelectorIntegerOptions,
): number | undefined {
	if (value === undefined || !/^-?\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) return undefined;
	if (options.min !== undefined && parsed < options.min) return undefined;
	if (options.max !== undefined && parsed > options.max) return undefined;
	return parsed;
}

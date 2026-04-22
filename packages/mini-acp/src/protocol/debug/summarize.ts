import type { Usage } from '../../types/usage.js';

import {
	ANSI_DIM,
	ANSI_YELLOW,
	bold,
	collapseWhitespace,
	colorAction,
	paint,
	truncate,
} from './style.js';

const TRUNCATE_LENGTH = 2000;

export function summarizeContext(value: unknown): string {
	if (!isRecord(value)) return summarizeJson(value);

	const parts: string[] = [];

	if ('history' in value && isRecord(value.history)) {
		const history = value.history;
		if (typeof history.systemPrompt === 'string') parts.push('systemPrompt');
		if (Array.isArray(history.messages)) {
			parts.push(`messages=${history.messages.length}`);
		}
	}

	if ('tools' in value && Array.isArray(value.tools)) {
		parts.push(`tools=${value.tools.length}`);
	}

	if ('config' in value && isRecord(value.config)) {
		const keys = Object.keys(value.config);
		parts.push(keys.length === 0 ? 'config' : `config=${keys.join(',')}`);
	}

	return parts.length === 0 ? '{}' : parts.join(' ');
}

export function summarizePrompt(value: unknown): string {
	if (!isRecord(value) || typeof value.role !== 'string') {
		return summarizeJson(value);
	}

	return summarizeMessageContent(value.content);
}

export function summarizeMessageBlocks(value: unknown): {
	reasoning: string[];
	visible: string[];
} {
	if (!Array.isArray(value) || value.length === 0) {
		return { reasoning: [], visible: ['(empty)'] };
	}

	const reasoning: string[] = [];
	const visible: string[] = [];

	for (const block of value) {
		if (!isRecord(block) || typeof block.type !== 'string') {
			visible.push(summarizeJson(block));
			continue;
		}

		switch (block.type) {
			case 'thinking':
				reasoning.push(summarizeText(block.text));
				break;
			case 'text':
				visible.push(summarizeText(block.text));
				break;
			case 'image':
				visible.push(`[image ${summarizeMimeType(block.mimeType)}]`);
				break;
			case 'toolCall': {
				const toolName = typeof block.name === 'string' ? block.name : 'tool';
				visible.push(
					colorAction(
						'toolCall',
						`${toolName} ${summarizeArguments(block.arguments)}`,
						ANSI_YELLOW,
					),
				);
				break;
			}
			default:
				visible.push(summarizeJson(block));
				break;
		}
	}

	return { reasoning, visible };
}

export function summarizeToolResultContent(value: unknown): string {
	if (!Array.isArray(value) || value.length === 0) return '(empty)';

	return value
		.map((item) => {
			if (!isRecord(item) || typeof item.type !== 'string') {
				return summarizeJson(item);
			}

			switch (item.type) {
				case 'text':
					return summarizeText(item.text);
				case 'image':
					return `[image ${summarizeMimeType(item.mimeType)}]`;
				default:
					return summarizeJson(item);
			}
		})
		.join(' | ');
}

export function summarizeArguments(value: unknown): string {
	return truncate(summarizeJson(value), TRUNCATE_LENGTH);
}

export function summarizeThrown(error: unknown): string {
	if (error instanceof Error) {
		if (error.name.length > 0 && error.name !== 'Error') {
			return `${error.name}: ${collapseWhitespace(error.message)}`;
		}
		return collapseWhitespace(error.message);
	}

	return summarizeJson(error);
}

export function summarizeUsage(usage: Usage): string[] {
	const { tokens, cost } = usage;
	return [
		`${bold('tokens')} in=${tokens.input} out=${tokens.output} cacheR=${tokens.cacheRead} cacheW=${tokens.cacheWrite} total=${tokens.total}`,
		`${bold('cost')}   in=${formatCost(cost.input)} out=${formatCost(cost.output)} cacheR=${formatCost(cost.cacheRead)} cacheW=${formatCost(cost.cacheWrite)} total=${formatCost(cost.total)}`,
	];
}

function formatCost(value: number): string {
	return `$${value.toFixed(4)}`;
}

export function summarizeJson(value: unknown): string {
	try {
		const serialized = JSON.stringify(value);
		return truncate(
			typeof serialized === 'string' ? serialized : 'null',
			TRUNCATE_LENGTH,
		);
	} catch {
		return '[unserializable]';
	}
}

function summarizeMessageContent(value: unknown): string {
	if (!Array.isArray(value) || value.length === 0) return '(empty)';

	return value.map(summarizeContentBlock).join(' | ');
}

function summarizeContentBlock(value: unknown): string {
	if (!isRecord(value) || typeof value.type !== 'string') {
		return summarizeJson(value);
	}

	switch (value.type) {
		case 'text':
			return summarizeText(value.text);
		case 'thinking':
			return paint(summarizeText(value.text), ANSI_DIM);
		case 'image':
			return `[image ${summarizeMimeType(value.mimeType)}]`;
		case 'toolCall': {
			const toolName = typeof value.name === 'string' ? value.name : 'tool';
			return colorAction(
				'toolCall',
				`${toolName} ${summarizeArguments(value.arguments)}`,
				ANSI_YELLOW,
			);
		}
		default:
			return summarizeJson(value);
	}
}

function summarizeText(value: unknown): string {
	if (typeof value !== 'string') return summarizeJson(value);
	return truncate(collapseWhitespace(value), TRUNCATE_LENGTH);
}

function summarizeMimeType(value: unknown): string {
	return typeof value === 'string' ? value : 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

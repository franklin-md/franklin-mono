import { StopCode, stopCategory } from '../../types/stop-code.js';
import type { StreamEvent } from '../../types/stream.js';
import type { ToolExecuteParams, ToolResult } from '../../types/tool.js';

import {
	ANSI_BLUE,
	ANSI_DIM,
	ANSI_GREEN,
	ANSI_RED,
	ANSI_YELLOW,
	ANSI_CYAN,
	bold,
	collapseWhitespace,
	colorAction,
	indent,
	paint,
	truncate,
} from './style.js';

export function renderInitialize(): string[] {
	return [bold('initialize')];
}

export function renderSetContext(ctx: unknown): string[] {
	return [`${bold('setContext')} ${summarizeContext(ctx)}`];
}

export function renderPrompt(message: unknown): string[] {
	return [
		bold('prompt'),
		indent(1, bold('user')),
		indent(2, `${bold('message')} ${summarizePrompt(message)}`),
		indent(1, bold('assistant')),
	];
}

export function renderCancel(): string[] {
	return [bold('cancel')];
}

export function renderStreamEvent(event: StreamEvent): string[] {
	switch (event.type) {
		case 'turnStart':
			return [indent(2, bold('turnStart'))];
		case 'chunk':
			return [];
		case 'update':
			return renderUpdateMessage(event.message);
		case 'turnEnd':
			return [indent(2, summarizeTurnEnd(event.stopCode, event.stopMessage))];
	}
}

export function renderToolExecute(params: ToolExecuteParams): string[] {
	return [
		indent(
			2,
			colorAction(
				'toolExecute',
				`${params.call.name} ${summarizeArguments(params.call.arguments)}`,
				ANSI_YELLOW,
			),
		),
	];
}

export function renderToolResult(
	toolName: string,
	result: ToolResult,
): string[] {
	const content = summarizeToolResultContent(result.content);
	if (result.isError === true) {
		return [
			indent(2, colorAction('toolError', `${toolName} ${content}`, ANSI_RED)),
		];
	}

	return [
		indent(2, colorAction('toolResult', `${toolName} ${content}`, ANSI_CYAN)),
	];
}

export function renderThrown(
	operation: string,
	error: unknown,
	indentLevel = 0,
): string[] {
	return [
		indent(
			indentLevel,
			colorAction(`${operation} error`, summarizeThrown(error), ANSI_RED),
		),
	];
}

function summarizeContext(value: unknown): string {
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

function summarizePrompt(value: unknown): string {
	if (!isRecord(value) || typeof value.role !== 'string') {
		return summarizeJson(value);
	}

	return summarizeMessageContent(value.content);
}

function renderUpdateMessage(value: unknown): string[] {
	if (!isRecord(value) || typeof value.role !== 'string') {
		return [indent(2, `${bold('update')} ${summarizeJson(value)}`)];
	}

	const blocks = summarizeMessageBlocks(value.content);
	const lines: string[] = [];

	for (const reasoning of blocks.reasoning) {
		lines.push(indent(2, `${bold('reasoning')} ${paint(reasoning, ANSI_DIM)}`));
	}

	if (blocks.visible.length > 0) {
		lines.push(indent(2, `${bold('message')} ${blocks.visible.join(' | ')}`));
	}

	return lines.length === 0 ? [indent(2, bold('update'))] : lines;
}

function summarizeMessageContent(value: unknown): string {
	if (!Array.isArray(value) || value.length === 0) return '(empty)';

	return value.map(summarizeContentBlock).join(' | ');
}

function summarizeMessageBlocks(value: unknown): {
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

function summarizeTurnEnd(stopCode: StopCode, stopMessage?: string): string {
	const stopName = Object.prototype.hasOwnProperty.call(StopCode, stopCode)
		? StopCode[stopCode]
		: 'Unknown';
	const status = paint(
		`${stopName} (${stopCode})`,
		summarizeTurnEndColor(stopCode),
	);
	const message =
		typeof stopMessage === 'string' && stopMessage.length > 0
			? `: ${collapseWhitespace(stopMessage)}`
			: '';

	return `${bold('turnEnd')} ${status}${message}`;
}

function summarizeToolResultContent(value: unknown): string {
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

function summarizeArguments(value: unknown): string {
	return truncate(summarizeJson(value), 120);
}

function summarizeThrown(error: unknown): string {
	if (error instanceof Error) {
		if (error.name.length > 0 && error.name !== 'Error') {
			return `${error.name}: ${collapseWhitespace(error.message)}`;
		}
		return collapseWhitespace(error.message);
	}

	return summarizeJson(error);
}

function summarizeJson(value: unknown): string {
	try {
		const serialized = JSON.stringify(value);
		return truncate(typeof serialized === 'string' ? serialized : 'null', 120);
	} catch {
		return '[unserializable]';
	}
}

function summarizeText(value: unknown): string {
	if (typeof value !== 'string') return summarizeJson(value);
	return truncate(collapseWhitespace(value), 120);
}

function summarizeMimeType(value: unknown): string {
	return typeof value === 'string' ? value : 'unknown';
}

function summarizeTurnEndColor(stopCode: StopCode): string {
	if (stopCode === StopCode.Cancelled) return ANSI_BLUE;
	return stopCategory(stopCode) === 'finished' ? ANSI_GREEN : ANSI_RED;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

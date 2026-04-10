import { StopCode, stopCategory } from '../../types/stop-code.js';
import type { StreamEvent } from '../../types/stream.js';
import type { ToolExecuteParams, ToolResult } from '../../types/tool.js';

import {
	ANSI_CYAN,
	ANSI_DIM,
	ANSI_RED,
	ANSI_YELLOW,
	collapseWhitespace,
	paint,
	truncate,
} from './style.js';

export function renderInitialize(): string {
	return 'initialize';
}

export function renderSetContext(ctx: unknown): string {
	return `setContext ${summarizeContext(ctx)}`;
}

export function renderPrompt(message: unknown): string {
	return `prompt ${summarizePrompt(message)}`;
}

export function renderCancel(): string {
	return 'cancel';
}

export function renderStreamEvent(event: StreamEvent): string | null {
	switch (event.type) {
		case 'turnStart':
			return 'turnStart';
		case 'chunk':
			return null;
		case 'update':
			return `update ${summarizeUpdateMessage(event.message)}`;
		case 'turnEnd': {
			const summary = summarizeTurnEnd(event.stopCode, event.stopMessage);
			return stopCategory(event.stopCode) === 'llm_error'
				? paint(summary, ANSI_RED)
				: summary;
		}
	}
}

export function renderToolExecute(params: ToolExecuteParams): string {
	return paint(summarizeToolExecute(params), ANSI_YELLOW);
}

export function renderToolResult(toolName: string, result: ToolResult): string {
	const content = summarizeToolResultContent(result.content);
	if (result.isError === true) {
		return paint(`toolError ${toolName} ${content}`, ANSI_RED);
	}

	return paint(`toolResult ${toolName} ${content}`, ANSI_CYAN);
}

export function renderThrown(operation: string, error: unknown): string {
	return paint(`${operation} error ${summarizeThrown(error)}`, ANSI_RED);
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

	return `${value.role}: ${summarizeMessageContent(value.content)}`;
}

function summarizeUpdateMessage(value: unknown): string {
	if (!isRecord(value) || typeof value.role !== 'string') {
		return summarizeJson(value);
	}

	const content = summarizeMessageContent(value.content);
	return content.length === 0 ? value.role : `${value.role}: ${content}`;
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
			return paint(
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
	const message =
		typeof stopMessage === 'string' && stopMessage.length > 0
			? `: ${collapseWhitespace(stopMessage)}`
			: '';

	return `turnEnd ${stopName} (${stopCode})${message}`;
}

function summarizeToolExecute(value: ToolExecuteParams): string {
	return `toolExecute ${value.call.name} ${summarizeArguments(value.call.arguments)}`;
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

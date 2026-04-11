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
} from './style.js';
import {
	summarizeArguments,
	summarizeContext,
	summarizeJson,
	summarizeMessageBlocks,
	summarizePrompt,
	summarizeThrown,
	summarizeToolResultContent,
} from './summarize.js';

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

function summarizeTurnEndColor(stopCode: StopCode): string {
	if (stopCode === StopCode.Cancelled) return ANSI_BLUE;
	return stopCategory(stopCode) === 'finished' ? ANSI_GREEN : ANSI_RED;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

import type {
	ToolCall,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';
import { toolCalls, turn, turnEnd } from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	type CoreScenarioExtension,
	runCoreScenario,
} from '../../../testing/index.js';
import { toolResultText } from './tool-result-text.js';

type MockToolCall = { name: string; arguments?: Record<string, unknown> };

function singleToolTurn(tool: MockToolCall) {
	return turn([toolCalls([tool]), turnEnd()]);
}

function createToolObserver() {
	const toolCalls: ToolExecuteParams[] = [];
	const toolResults: Array<ToolResult & { call: ToolCall }> = [];

	const extension: CoreScenarioExtension = (api) => {
		api.on('toolCall', (event) => {
			toolCalls.push(event);
		});
		api.on('toolResult', (event) => {
			toolResults.push(event);
		});
	};

	return { toolCalls, toolResults, extension };
}

describe('core extension tool observers', () => {
	it('observes delegated tool calls and their fallback results', async () => {
		const observer = createToolObserver();

		await runCoreScenario({
			turns: [singleToolTurn({ name: 'lookup' })],
			extensions: [observer.extension],
		});

		expect(observer.toolCalls.map((event) => event.call.name)).toEqual([
			'lookup',
		]);
		expect(
			observer.toolResults.map((event) => ({
				toolCallId: event.toolCallId,
				callName: event.call.name,
			})),
		).toEqual([{ toolCallId: 'mock-tool-call-1', callName: 'lookup' }]);
	});

	it('observes registered tool calls and their results', async () => {
		const observer = createToolObserver();

		const { calls } = await runCoreScenario({
			turns: [
				singleToolTurn({ name: 'myTool', arguments: { input: 'hello' } }),
			],
			extensions: [
				(api) => {
					api.registerTool({
						name: 'myTool',
						description: 'A test tool',
						schema: z.object({ input: z.string() }),
						execute: async ({ input }) => input.toUpperCase(),
					});
					observer.extension(api);
				},
			],
		});

		expect(toolResultText(calls.toolResults[0])).toBe('HELLO');
		expect(observer.toolCalls.map((event) => event.call.id)).toEqual([
			'mock-tool-call-1',
		]);
		expect(observer.toolResults.map((event) => event.toolCallId)).toEqual([
			'mock-tool-call-1',
		]);
	});

	it('still observes tool results when a registered tool throws', async () => {
		const observer = createToolObserver();

		await runCoreScenario({
			turns: [singleToolTurn({ name: 'failTool' })],
			extensions: [
				(api) => {
					api.registerTool({
						name: 'failTool',
						description: 'throws',
						schema: z.object({}),
						execute: async () => {
							throw new Error('boom');
						},
					});
					observer.extension(api);
				},
			],
		});

		expect(
			observer.toolResults.map((event) => ({
				toolCallId: event.toolCallId,
				isError: event.isError,
			})),
		).toEqual([{ toolCallId: 'mock-tool-call-1', isError: true }]);
	});
});

import type { ToolExecuteParams } from '@franklin/mini-acp';
import { toolCalls, turn, turnEnd } from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	type CoreScenarioExtension,
	runCoreScenario,
} from '../../../testing/index.js';
import type { ToolResultEvent } from '../api/handlers.js';
import { toolSpec } from '../api/tool-spec.js';
import { toolResultText } from './tool-result-text.js';

type MockToolCall = { name: string; arguments?: Record<string, unknown> };

function singleToolTurn(tool: MockToolCall) {
	return turn([toolCalls([tool]), turnEnd()]);
}

function createToolObserver() {
	const toolCalls: ToolExecuteParams[] = [];
	const toolResults: ToolResultEvent[] = [];

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
				toolCallId: event.call.id,
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
					api.registerTool(
						toolSpec('myTool', 'A test tool', z.object({ input: z.string() })),
						{
							execute: async ({ input }) => input.toUpperCase(),
						},
					);
					observer.extension(api);
				},
			],
		});

		expect(toolResultText(calls.toolResults[0])).toBe('HELLO');
		expect(observer.toolCalls.map((event) => event.call.id)).toEqual([
			'mock-tool-call-1',
		]);
		expect(observer.toolResults.map((event) => event.call.id)).toEqual([
			'mock-tool-call-1',
		]);
	});

	it('lets observers recover typed raw output through the tool spec', async () => {
		type Output = { count: number };
		const spec = toolSpec<'countTool', { value: number }, Output>(
			'countTool',
			'Counts',
			z.object({ value: z.number() }),
		);
		const observer = createToolObserver();

		await runCoreScenario({
			turns: [singleToolTurn({ name: 'countTool', arguments: { value: 3 } })],
			extensions: [
				(api) => {
					api.registerTool(spec, {
						execute: async ({ value }) => ({ count: value }),
						render: ({ count }) => ({
							content: [{ type: 'text', text: `count:${count}` }],
						}),
					});
					observer.extension(api);
				},
			],
		});

		expect(observer.toolResults[0]?.output).toEqual({ count: 3 });
		expect(observer.toolResults[0]).toMatchObject({
			call: { id: 'mock-tool-call-1' },
			result: { content: [{ type: 'text', text: 'count:3' }] },
		});
	});

	it('includes raw output for registered tools that return undefined', async () => {
		const spec = toolSpec<'undefinedTool', Record<string, never>, undefined>(
			'undefinedTool',
			'Returns undefined',
			z.object({}),
		);
		const observer = createToolObserver();

		await runCoreScenario({
			turns: [singleToolTurn({ name: 'undefinedTool' })],
			extensions: [
				(api) => {
					api.registerTool(spec, {
						execute: async () => undefined,
						render: () => ({
							content: [{ type: 'text', text: 'ok' }],
						}),
					});
					observer.extension(api);
				},
			],
		});

		expect(observer.toolResults[0]).toHaveProperty('output', undefined);
	});

	it('still observes tool results when a registered tool throws', async () => {
		const observer = createToolObserver();

		await runCoreScenario({
			turns: [singleToolTurn({ name: 'failTool' })],
			extensions: [
				(api) => {
					api.registerTool(toolSpec('failTool', 'throws', z.object({})), {
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
				toolCallId: event.call.id,
				isError: event.result.isError,
			})),
		).toEqual([{ toolCallId: 'mock-tool-call-1', isError: true }]);
	});
});

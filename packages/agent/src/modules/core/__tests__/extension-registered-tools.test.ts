import { toolCalls, turn, turnEnd } from '@franklin/mini-acp/mock';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createCoreScenario, runCoreScenario } from '../../../testing/index.js';
import type { RenderedToolOutput } from '../api/tool.js';
import { toolSpec } from '../api/tool-spec.js';
import { toolResultText } from './tool-result-text.js';

describe('core extension registered tools', () => {
	it('advertises registered tools in the agent context', async () => {
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.registerTool(
						toolSpec('my_tool', 'does things', z.object({ x: z.string() })),
						{
							execute: async () => 'ok',
						},
					);
				},
			],
		});

		try {
			expect(scenario.mock.context().tools).toHaveLength(1);
			expect(scenario.mock.context().tools[0]?.name).toBe('my_tool');
		} finally {
			await scenario.dispose();
		}
	});

	it('executes a registered tool instead of the fallback server', async () => {
		const seenArgs: unknown[] = [];

		const { calls, context } = await runCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'myTool', arguments: { input: 'hello' } }]),
					turnEnd(),
				]),
			],
			extensions: [
				(api) => {
					api.registerTool(
						toolSpec('myTool', 'A test tool', z.object({ input: z.string() })),
						{
							execute: async (params) => {
								seenArgs.push(params);
								return params.input.toUpperCase();
							},
						},
					);
				},
			],
		});

		expect(seenArgs).toEqual([{ input: 'hello' }]);
		expect(toolResultText(calls.toolResults[0])).toBe('HELLO');
		expect(context.messages).toContainEqual({
			role: 'toolResult',
			toolCallId: 'mock-tool-call-1',
			content: [{ type: 'text', text: 'HELLO' }],
		});
	});

	it('returns the fallback server error for unknown tools', async () => {
		const { calls } = await runCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'unknownTool', arguments: { value: 1 } }]),
					turnEnd(),
				]),
			],
		});

		expect(calls.toolResults[0]?.isError).toBe(true);
		expect(toolResultText(calls.toolResults[0])).toBe(
			'Unknown tool: unknownTool',
		);
	});

	it('rejects invalid tool arguments before execute runs', async () => {
		const execute = vi.fn(async () => 'not reached');

		const { calls } = await runCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'myTool', arguments: { input: 123 } }]),
					turnEnd(),
				]),
			],
			extensions: [
				(api) => {
					api.registerTool(
						toolSpec('myTool', 'A test tool', z.object({ input: z.string() })),
						{ execute },
					);
				},
			],
		});

		expect(execute).not.toHaveBeenCalled();
		expect(calls.toolResults[0]?.isError).toBe(true);
		expect(toolResultText(calls.toolResults[0])).toContain(
			'Invalid arguments for tool "myTool"',
		);
	});

	it('passes parsed tool arguments to execute', async () => {
		const schema = z.object({
			count: z.coerce.number(),
			label: z.string().default('item'),
		});

		const { calls } = await runCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'parsedTool', arguments: { count: '4' } }]),
					turnEnd(),
				]),
			],
			extensions: [
				(api) => {
					api.registerTool(toolSpec('parsedTool', 'Uses parsed args', schema), {
						execute: async (params) => `${params.count}:${params.label}`,
					});
				},
			],
		});

		expect(toolResultText(calls.toolResults[0])).toBe('4:item');
	});

	it('supports spec-based tool registration', async () => {
		const spec = toolSpec(
			'specTool',
			'Doubles a number',
			z.object({ value: z.number() }),
		);

		const { calls } = await runCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'specTool', arguments: { value: 5 } }]),
					turnEnd(),
				]),
			],
			extensions: [
				(api) => {
					api.registerTool(spec, {
						execute: async ({ value }) =>
							JSON.stringify({ doubled: value * 2 }),
					});
				},
			],
		});

		expect(toolResultText(calls.toolResults[0])).toBe(
			JSON.stringify({ doubled: 10 }),
		);
	});

	it('supports projected raw outputs from spec-based tool registration', async () => {
		type DoubleOutput = { doubled: number };
		const spec = toolSpec<'projectedTool', { value: number }, DoubleOutput>(
			'projectedTool',
			'Doubles a number',
			z.object({ value: z.number() }),
		);

		const { calls } = await runCoreScenario({
			turns: [
				turn([
					toolCalls([{ name: 'projectedTool', arguments: { value: 5 } }]),
					turnEnd(),
				]),
			],
			extensions: [
				(api) => {
					api.registerTool(spec, {
						execute: async ({ value }) => ({ doubled: value * 2 }),
						render: (output) => ({
							content: [{ type: 'text', text: `doubled:${output.doubled}` }],
						}),
					});
				},
			],
		});

		expect(toolResultText(calls.toolResults[0])).toBe('doubled:10');
	});

	it('converts thrown Error values into tool error results', async () => {
		const { calls } = await runCoreScenario({
			turns: [turn([toolCalls([{ name: 'failTool' }]), turnEnd()])],
			extensions: [
				(api) => {
					api.registerTool(
						toolSpec('failTool', 'A tool that throws', z.object({})),
						{
							execute: async () => {
								throw new Error('tool exploded');
							},
						},
					);
				},
			],
		});

		expect(calls.toolResults[0]?.isError).toBe(true);
		expect(toolResultText(calls.toolResults[0])).toBe('Error: tool exploded');
	});

	it('converts thrown non-Error values into tool error results', async () => {
		const { calls } = await runCoreScenario({
			turns: [turn([toolCalls([{ name: 'failTool' }]), turnEnd()])],
			extensions: [
				(api) => {
					api.registerTool(
						toolSpec('failTool', 'A tool that throws a string', z.object({})),
						{
							execute: async () => {
								// eslint-disable-next-line @typescript-eslint/only-throw-error
								throw 'raw string error';
							},
						},
					);
				},
			],
		});

		expect(calls.toolResults[0]?.isError).toBe(true);
		expect(toolResultText(calls.toolResults[0])).toBe('raw string error');
	});

	it('preserves structured RenderedToolOutput values returned by registered tools', async () => {
		const spec = toolSpec<
			'errorTool',
			Record<string, never>,
			RenderedToolOutput
		>('errorTool', 'Returns an error RenderedToolOutput', z.object({}));

		const { calls } = await runCoreScenario({
			turns: [turn([toolCalls([{ name: 'errorTool' }]), turnEnd()])],
			extensions: [
				(api) => {
					api.registerTool(spec, {
						execute: async () => ({
							content: [{ type: 'text' as const, text: 'bad input' }],
							isError: true,
						}),
						render: (output) => output,
					});
				},
			],
		});

		expect(calls.toolResults[0]?.isError).toBe(true);
		expect(toolResultText(calls.toolResults[0])).toBe('bad input');
	});
});

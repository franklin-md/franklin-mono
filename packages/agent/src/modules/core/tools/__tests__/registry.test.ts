import type { ToolCall } from '@franklin/mini-acp';
import type { JsonObject, JsonValue } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { toolSpec } from '../../api/tool-spec.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import { createToolRegistry } from '../registry.js';

const runtime = createTestRuntime();

function toolCall(name: string, args: JsonObject = {}): ToolCall {
	return {
		type: 'toolCall',
		id: 'call-1',
		name,
		arguments: args,
	};
}

describe('ToolRegistry', () => {
	it('serializes registered tool definitions for Mini-ACP context', () => {
		const registrations = createCoreRegistry(
			(api) => {
				api.registerTool(
					toolSpec(
						'search',
						'Search for items',
						z.object({ query: z.string() }),
					),
					{ execute: async () => 'ok' },
				);
			},
			() => runtime,
		);

		const registry = createToolRegistry(registrations.tools);

		expect(registry.definitions()).toMatchObject([
			{
				name: 'search',
				description: 'Search for items',
				inputSchema: {
					type: 'object',
					properties: { query: { type: 'string' } },
					required: ['query'],
				},
			},
		]);
		expect(registry.definitions()[0]?.inputSchema).not.toHaveProperty(
			'$schema',
		);
	});

	it('filters disabled tool definitions', () => {
		const registrations = createCoreRegistry(
			(api) => {
				api.registerTool(
					toolSpec(
						'search',
						'Search for items',
						z.object({ query: z.string() }),
					),
					{ execute: async () => 'ok' },
				);
				api.registerTool(toolSpec('read', 'Read a file', z.object({})), {
					execute: async () => 'ok',
				});
			},
			() => runtime,
		);

		const registry = createToolRegistry(registrations.tools, {
			disabled: ['search'],
		});

		expect(registry.definitions()).toMatchObject([{ name: 'read' }]);

		registry.setEnabled('search', true);
		registry.setEnabled('read', false);

		expect(registry.definitions()).toMatchObject([{ name: 'search' }]);
		expect(registry.filter()).toEqual({ disabled: ['read'] });
	});

	it('returns a copy of its filter', () => {
		const registrations = createCoreRegistry();
		const registry = createToolRegistry(registrations.tools, {
			disabled: ['search'],
		});

		registry.filter().disabled.push('mutated');

		expect(registry.filter()).toEqual({ disabled: ['search'] });
	});

	it('executes registered tools', async () => {
		const execute = vi.fn(async ({ input }: { input: string }) =>
			input.toUpperCase(),
		);
		const registrations = createCoreRegistry(
			(api) => {
				api.registerTool(
					toolSpec('upper', 'Uppercase input', z.object({ input: z.string() })),
					{ execute },
				);
			},
			() => runtime,
		);
		const registry = createToolRegistry(registrations.tools);

		const result = await registry.dispatch(
			toolCall('upper', { input: 'hello' }),
		);

		expect(execute).toHaveBeenCalledWith({ input: 'hello' }, runtime);
		expect(result?.modelOutput.content).toEqual([
			{ type: 'text', text: 'HELLO' },
		]);
	});

	it('binds one runtime value across execute and render for a tool call', async () => {
		const execute = vi.fn(async ({ input }: { input: string }) =>
			input.toUpperCase(),
		);
		const render = vi.fn(async (output: JsonValue) => {
			if (typeof output !== 'string') throw new Error('expected string output');
			return {
				content: [{ type: 'text' as const, text: `rendered:${output}` }],
			};
		});
		const getRuntime = vi.fn(() => runtime);
		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('upper', 'Uppercase input', z.object({ input: z.string() })),
				{ execute, render },
			);
		}, getRuntime);
		const registry = createToolRegistry(registrations.tools);

		const result = await registry.dispatch(
			toolCall('upper', { input: 'hello' }),
		);

		expect(getRuntime).toHaveBeenCalledOnce();
		expect(execute).toHaveBeenCalledWith({ input: 'hello' }, runtime);
		expect(render).toHaveBeenCalledWith('HELLO', { input: 'hello' }, runtime);
		expect(result?.modelOutput.content).toEqual([
			{ type: 'text', text: 'rendered:HELLO' },
		]);
	});

	it('rejects disabled registered tool calls', async () => {
		const execute = vi.fn(async () => 'unexpected');
		const registrations = createCoreRegistry(
			(api) => {
				api.registerTool(toolSpec('disabled_tool', 'Disabled', z.object({})), {
					execute,
				});
			},
			() => runtime,
		);
		const registry = createToolRegistry(registrations.tools, {
			disabled: ['disabled_tool'],
		});

		const result = await registry.dispatch(toolCall('disabled_tool'));

		expect(execute).not.toHaveBeenCalled();
		expect(result?.modelOutput).toEqual({
			toolCallId: 'call-1',
			content: [
				{
					type: 'text',
					text: 'Tool "disabled_tool" is disabled.',
				},
			],
			isError: true,
		});
	});

	it('returns undefined for unknown tools', async () => {
		const registrations = createCoreRegistry(
			(api) => {
				api.registerTool(
					toolSpec('registered_tool', 'Registered', z.object({})),
					{
						execute: async () => 'ok',
					},
				);
			},
			() => runtime,
		);
		const registry = createToolRegistry(registrations.tools, {
			disabled: ['registered_tool'],
		});

		const result = await registry.dispatch(toolCall('external_tool'));

		expect(result).toBeUndefined();
	});
});

import type { ToolExecuteParams } from '@franklin/mini-acp';
import type { JsonObject } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { toolSpec } from '../../../../api/tool-spec.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import { createToolRegistry } from '../registry.js';

const runtime = createTestRuntime();

function toolCall(name: string, args: JsonObject = {}): ToolExecuteParams {
	return {
		call: {
			type: 'toolCall',
			id: 'call-1',
			name,
			arguments: args,
		},
	};
}

describe('ToolRegistry', () => {
	it('serializes registered tool definitions for Mini-ACP context', () => {
		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('search', 'Search for items', z.object({ query: z.string() })),
				{ execute: async () => 'ok' },
			);
		});

		const registry = createToolRegistry(registrations, () => runtime);

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
		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('search', 'Search for items', z.object({ query: z.string() })),
				{ execute: async () => 'ok' },
			);
			api.registerTool(toolSpec('read', 'Read a file', z.object({})), {
				execute: async () => 'ok',
			});
		});

		const registry = createToolRegistry(registrations, () => runtime, {
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
		const registry = createToolRegistry(registrations, () => runtime, {
			disabled: ['search'],
		});

		registry.filter().disabled.push('mutated');

		expect(registry.filter()).toEqual({ disabled: ['search'] });
	});

	it('dispatches registered tools before the fallback handler', async () => {
		const execute = vi.fn(async ({ input }: { input: string }) =>
			input.toUpperCase(),
		);
		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('upper', 'Uppercase input', z.object({ input: z.string() })),
				{ execute },
			);
		});
		const registry = createToolRegistry(registrations, () => runtime);
		const fallback = vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'fallback' }],
		}));

		const result = await registry.dispatch(
			toolCall('upper', { input: 'hello' }),
			fallback,
		);

		expect(execute).toHaveBeenCalledWith({ input: 'hello' }, runtime);
		expect(fallback).not.toHaveBeenCalled();
		expect(result.content).toEqual([{ type: 'text', text: 'HELLO' }]);
	});

	it('rejects disabled registered tool calls before the fallback handler', async () => {
		const execute = vi.fn(async () => 'unexpected');
		const registrations = createCoreRegistry((api) => {
			api.registerTool(toolSpec('disabled_tool', 'Disabled', z.object({})), {
				execute,
			});
		});
		const registry = createToolRegistry(registrations, () => runtime, {
			disabled: ['disabled_tool'],
		});
		const fallback = vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'fallback' }],
		}));

		const result = await registry.dispatch(toolCall('disabled_tool'), fallback);

		expect(execute).not.toHaveBeenCalled();
		expect(fallback).not.toHaveBeenCalled();
		expect(result).toEqual({
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

	it('preserves fallback dispatch for unknown tools', async () => {
		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('registered_tool', 'Registered', z.object({})),
				{
					execute: async () => 'ok',
				},
			);
		});
		const registry = createToolRegistry(registrations, () => runtime, {
			disabled: ['registered_tool'],
		});
		const fallback = vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'fallback' }],
		}));

		const result = await registry.dispatch(toolCall('external_tool'), fallback);

		expect(fallback).toHaveBeenCalledOnce();
		expect(result.content).toEqual([{ type: 'text', text: 'fallback' }]);
	});
});

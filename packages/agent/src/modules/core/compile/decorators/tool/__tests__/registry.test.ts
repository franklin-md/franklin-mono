import type { ToolExecuteParams } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { toolSpec } from '../../../../api/tool-spec.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import { createToolRegistry } from '../registry.js';

const runtime = createTestRuntime();

function toolCall(
	name: string,
	args: Record<string, unknown> = {},
): ToolExecuteParams {
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
});

import type { UserMessage } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../../compile/decorators/__tests__/registry.js';
import { emptyToolFilter } from '../../../state.js';
import { createToolRegistry } from '../../../tools/index.js';
import { createSessionDraft } from '../index.js';

const userMessage: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'seed' }],
};

const runtime = createTestRuntime();

describe('SessionDraft', () => {
	it('commits snapshot state plus registration-produced runtime context', async () => {
		const registrations = createCoreRegistry(
			(api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('system');
				});
				api.registerTool(
					{
						name: 'lookup',
						description: 'Lookup a value',
						schema: z.object({ query: z.string() }),
					},
					{
						execute: () => 'ok',
					},
				);
			},
			() => runtime,
		);
		const draft = createSessionDraft({
			snapshot: {
				messages: [userMessage],
				llmConfig: { model: 'test-model' },
				usage: ZERO_USAGE,
				toolFilter: emptyToolFilter(),
			},
			registrations,
			toolRegistry: createToolRegistry(registrations),
		});

		const commit = await draft.commit();

		expect(commit.context).toMatchObject({
			systemPrompt: 'system',
			messages: [userMessage],
			config: { model: 'test-model' },
		});
		expect(commit.context.tools).toMatchObject([
			{
				name: 'lookup',
				description: 'Lookup a value',
				inputSchema: {
					type: 'object',
					properties: { query: { type: 'string' } },
					required: ['query'],
				},
			},
		]);
	});

	it('keeps runtime context out of the durable draft', async () => {
		const registrations = createCoreRegistry(
			(api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('runtime only');
				});
				api.registerTool(
					{
						name: 'lookup',
						description: 'Lookup a value',
						schema: z.object({}),
					},
					{
						execute: () => 'ok',
					},
				);
			},
			() => runtime,
		);
		const draft = createSessionDraft({
			snapshot: {
				messages: [],
				llmConfig: {},
				usage: ZERO_USAGE,
				toolFilter: emptyToolFilter(),
			},
			registrations,
			toolRegistry: createToolRegistry(registrations),
		});

		await draft.commit();

		expect(draft.get()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});
	});
});

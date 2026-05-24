import type { MiniACPAgent, MiniACPClient, Usage } from '@franklin/mini-acp';
import { StopCode, ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createTrackingDecorator } from '../decorator.js';
import { createContextManager } from '../../../../context-manager/index.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import { createToolRegistry } from '../../../../tools/index.js';

const turnUsage = {
	tokens: { input: 2, output: 3, cacheRead: 0, cacheWrite: 0, total: 5 },
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} satisfies Usage;

function createTestContextManager() {
	const getRuntime = createTestRuntime;
	const registrations = createCoreRegistry(undefined, getRuntime);
	return createContextManager({
		snapshot: {
			messages: [],
			llmConfig: {},
			usage: ZERO_USAGE,
			toolFilter: { disabled: [] },
		},
		registrations,
		toolRegistry: createToolRegistry(registrations.tools),
	});
}

describe('createTrackingDecorator', () => {
	it('tracks tool calls and tool results on the server side', async () => {
		const contextManager = createTestContextManager();
		const decorator = createTrackingDecorator(contextManager);
		const toolExecute: MiniACPAgent['toolExecute'] = async ({ call }) => ({
			toolCallId: call.id,
			content: [{ type: 'text', text: 'ok' }],
		});
		const server: MiniACPAgent = {
			toolExecute: vi.fn(toolExecute),
		};

		const wrapped = await decorator.server(server);
		await wrapped.toolExecute({
			call: {
				type: 'toolCall',
				id: 'call-1',
				name: 'lookup',
				arguments: {},
			},
		});

		expect(contextManager.getAgentContext().messages).toEqual([
			{
				role: 'assistant',
				content: [
					{
						type: 'toolCall',
						id: 'call-1',
						name: 'lookup',
						arguments: {},
					},
				],
			},
			{
				role: 'toolResult',
				toolCallId: 'call-1',
				content: [{ type: 'text', text: 'ok' }],
			},
		]);
	});

	it('tracks client context, messages, and usage in one wrapper', async () => {
		const contextManager = createTestContextManager();
		const decorator = createTrackingDecorator(contextManager);
		const client: MiniACPClient = {
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			prompt: vi.fn(async function* () {
				yield {
					type: 'update' as const,
					messageId: 'message-1',
					message: {
						role: 'assistant' as const,
						content: [{ type: 'text' as const, text: 'hello' }],
					},
				};
				yield {
					type: 'turnEnd' as const,
					stopCode: StopCode.Finished,
					usage: turnUsage,
				};
			}),
			cancel: vi.fn(async () => {}),
		} as MiniACPClient;

		const wrapped = await decorator.client(client);
		await wrapped.setContext({ systemPrompt: 'rules' });
		for await (const _event of wrapped.prompt({
			role: 'user',
			content: [{ type: 'text', text: 'hi' }],
		})) {
			// Drain the stream so tracking callbacks run.
		}

		expect(contextManager.getAgentContext().systemPrompt).toBe('rules');
		expect(contextManager.getAgentContext().messages).toEqual([
			{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
		]);
		expect(contextManager.getSnapshot().usage).toEqual(turnUsage);
	});
});

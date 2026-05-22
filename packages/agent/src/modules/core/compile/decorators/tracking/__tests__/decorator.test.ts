import type { MiniACPAgent, MiniACPClient, Usage } from '@franklin/mini-acp';
import { StopCode, ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createTrackingDecorator } from '../decorator.js';
import { createAgentState } from '../../../../agent-state/index.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';

const turnUsage = {
	tokens: { input: 2, output: 3, cacheRead: 0, cacheWrite: 0, total: 5 },
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} satisfies Usage;

function createTestAgentState() {
	return createAgentState({
		snapshot: {
			messages: [],
			llmConfig: {},
			usage: ZERO_USAGE,
		},
		registrations: createCoreRegistry(),
		getRuntime: createTestRuntime,
	});
}

describe('createTrackingDecorator', () => {
	it('tracks tool calls and tool results on the server side', async () => {
		const agentState = createTestAgentState();
		const decorator = createTrackingDecorator(agentState);
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

		expect(agentState.getAgentContext().messages).toEqual([
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
		const agentState = createTestAgentState();
		const decorator = createTrackingDecorator(agentState);
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

		expect(agentState.getAgentContext().systemPrompt).toBe('rules');
		expect(agentState.getAgentContext().messages).toEqual([
			{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
		]);
		expect(agentState.getSnapshot().usage).toEqual(turnUsage);
	});
});

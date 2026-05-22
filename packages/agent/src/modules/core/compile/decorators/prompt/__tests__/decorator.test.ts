import type {
	ContextPatch,
	MiniACPAgent,
	MiniACPClient,
	StreamEvent,
	UserMessage,
} from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createPromptDecorator } from '../decorator.js';
import { createAgentState } from '../../../../agent-state/index.js';
import { emptySessionSnapshot } from '../../../../state.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import type { AgentState } from '../../../../agent-state/index.js';

const runtime = createTestRuntime();

const userMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'hello' }],
} satisfies UserMessage;

const streamEvents = [
	{
		type: 'chunk',
		messageId: 'message-1',
		role: 'assistant',
		content: { type: 'text', text: 'ok' },
	},
] satisfies StreamEvent[];

function text(message: UserMessage): string {
	return message.content
		.filter((content) => content.type === 'text')
		.map((content) => content.text)
		.join('');
}

function createTestAgentState(
	registrations = createCoreRegistry(),
): AgentState {
	return createAgentState({
		snapshot: emptySessionSnapshot(),
		registrations,
		getRuntime: () => runtime,
	});
}

function stubClient(calls: string[], agentState?: AgentState): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async (patch: ContextPatch) => {
			calls.push(`setContext:${patch.systemPrompt ?? ''}`);
			agentState?.apply(patch);
		}),
		prompt: vi.fn(async function* (message: UserMessage) {
			calls.push(`client.prompt:${text(message)}`);
			yield* streamEvents;
		}),
		cancel: vi.fn(async () => {}),
	} as MiniACPClient;
}

describe('createPromptDecorator', () => {
	it('returns a pass-through decorator when no prompt-time handlers are registered', async () => {
		const decorator = createPromptDecorator(
			createTestAgentState(),
			createCoreRegistry(),
			() => runtime,
		);
		const calls: string[] = [];
		const base = stubClient(calls);
		const client = await decorator.client(base);

		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so the prompt flow runs.
		}

		expect(calls).toEqual(['setContext:', 'client.prompt:hello']);
	});

	it('syncs system prompt, builds user prompt, then observes the response stream', async () => {
		const calls: string[] = [];
		const observed: StreamEvent[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('systemPrompt', (systemPrompt) => {
				calls.push('systemPrompt.handler');
				systemPrompt.setPart('system');
			});
			api.on('prompt', (prompt) => {
				calls.push('prompt.handler');
				prompt.appendContent({ type: 'text', text: ' injected' });
			});
			api.on('chunk', (event) => {
				calls.push('chunk.handler');
				observed.push(event);
			});
		});
		const agentState = createTestAgentState(registrations);
		const decorator = createPromptDecorator(
			agentState,
			registrations,
			() => runtime,
		);

		const base = stubClient(calls, agentState);
		const client = await decorator.client(base);
		const returned: StreamEvent[] = [];
		for await (const event of client.prompt(userMessage)) returned.push(event);

		expect(calls).toEqual([
			'systemPrompt.handler',
			'setContext:system',
			'prompt.handler',
			'client.prompt:hello injected',
			'chunk.handler',
		]);
		expect(observed).toEqual(streamEvents);
		expect(returned).toEqual(streamEvents);
	});

	it('does not resend unchanged system prompts while still rebuilding the user prompt', async () => {
		const calls: string[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('systemPrompt', (systemPrompt) => {
				systemPrompt.setPart('stable');
			});
			api.on('prompt', (prompt) => {
				calls.push('prompt.handler');
				prompt.appendContent({ type: 'text', text: ' rebuilt' });
			});
		});
		const agentState = createTestAgentState(registrations);
		const decorator = createPromptDecorator(
			agentState,
			registrations,
			() => runtime,
		);

		const base = stubClient(calls, agentState);
		const client = await decorator.client(base);
		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so the prompt flow runs.
		}
		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so the prompt flow runs.
		}

		expect(base.setContext).toHaveBeenCalledOnce();
		expect(calls).toEqual([
			'setContext:stable',
			'prompt.handler',
			'client.prompt:hello rebuilt',
			'prompt.handler',
			'client.prompt:hello rebuilt',
		]);
	});

	it('leaves the server side unchanged', async () => {
		const decorator = createPromptDecorator(
			createTestAgentState(),
			createCoreRegistry((api) => {
				api.on('prompt', () => {});
			}),
			() => runtime,
		);
		const server = { toolExecute: vi.fn() } as unknown as MiniACPAgent;

		await expect(decorator.server(server)).resolves.toBe(server);
	});
});

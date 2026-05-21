import type { MiniACPClient, UserMessage } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createSystemPromptDecorator } from '../decorator.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';

const runtime = createTestRuntime();

const userMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'hello' }],
} satisfies UserMessage;

function stubClient(): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => {}),
	} as MiniACPClient;
}

describe('createSystemPromptDecorator', () => {
	it('returns undefined when no system prompt handlers are registered', () => {
		expect(
			createSystemPromptDecorator(createCoreRegistry(), () => runtime),
		).toBeUndefined();
	});

	it('sets the assembled system prompt before prompting the client', async () => {
		const registrations = createCoreRegistry((api) => {
			api.on('systemPrompt', (systemPrompt) => {
				systemPrompt.setPart('first');
			});
			api.on('systemPrompt', (systemPrompt) => {
				systemPrompt.setPart('second');
			});
		});
		const decorator = createSystemPromptDecorator(registrations, () => runtime);
		if (!decorator) throw new Error('Expected system prompt decorator');

		const base = stubClient();
		const client = await decorator.client(base);
		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so the prompt wrapper runs.
		}

		expect(base.setContext).toHaveBeenCalledWith({
			systemPrompt: 'first\n\nsecond',
		});
		expect(base.prompt).toHaveBeenCalledWith(userMessage);
	});

	it('does not resend unchanged system prompts', async () => {
		const registrations = createCoreRegistry((api) => {
			api.on('systemPrompt', (systemPrompt) => {
				systemPrompt.setPart('stable');
			});
		});
		const decorator = createSystemPromptDecorator(registrations, () => runtime);
		if (!decorator) throw new Error('Expected system prompt decorator');

		const base = stubClient();
		const client = await decorator.client(base);
		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so the prompt wrapper runs.
		}
		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so the prompt wrapper runs.
		}

		expect(base.setContext).toHaveBeenCalledOnce();
	});
});

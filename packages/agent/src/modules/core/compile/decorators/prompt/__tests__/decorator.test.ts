import type {
	MiniACPAgent,
	MiniACPClient,
	UserMessage,
} from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createPromptDecorator } from '../decorator.js';
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
		prompt: vi.fn(async function* (message: UserMessage) {
			yield {
				type: 'update' as const,
				messageId: 'message-1',
				message: { role: 'user', content: message.content },
			};
		}),
		cancel: vi.fn(async () => {}),
	} as MiniACPClient;
}

describe('createPromptDecorator', () => {
	it('returns undefined when no prompt handlers are registered', () => {
		expect(
			createPromptDecorator(createCoreRegistry(), () => runtime),
		).toBeUndefined();
	});

	it('applies prompt handlers before the prompt reaches the client', async () => {
		const registrations = createCoreRegistry((api) => {
			api.on('prompt', (prompt) => {
				prompt.appendContent({ type: 'text', text: ' [injected]' });
			});
		});
		const decorator = createPromptDecorator(registrations, () => runtime);
		if (!decorator) throw new Error('Expected prompt decorator');

		const base = stubClient();
		const client = await decorator.client(base);
		const events = [];
		for await (const event of client.prompt(userMessage)) events.push(event);

		expect(base.prompt).toHaveBeenCalledWith({
			role: 'user',
			content: [
				{ type: 'text', text: 'hello' },
				{ type: 'text', text: ' [injected]' },
			],
		});
		expect(events).toHaveLength(1);
	});

	it('leaves the server side unchanged', async () => {
		const decorator = createPromptDecorator(
			createCoreRegistry((api) => {
				api.on('prompt', () => {});
			}),
			() => runtime,
		);
		if (!decorator) throw new Error('Expected prompt decorator');
		const server = { toolExecute: vi.fn() } as unknown as MiniACPAgent;

		await expect(decorator.server(server)).resolves.toBe(server);
	});
});

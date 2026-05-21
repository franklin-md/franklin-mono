import type {
	MiniACPAgent,
	MiniACPClient,
	StreamEvent,
} from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createAgentObserverDecorator } from '../decorator.js';
import type { AgentStreamObservers } from '../types.js';

const userMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'hello' }],
} satisfies Parameters<MiniACPClient['prompt']>[0];

const streamEvents = [
	{ type: 'turnStart' },
	{
		type: 'chunk',
		messageId: 'message-1',
		role: 'assistant',
		content: { type: 'text', text: 'o' },
	},
	{
		type: 'update',
		messageId: 'message-1',
		message: {
			role: 'assistant',
			content: [{ type: 'text', text: 'ok' }],
		},
	},
	{ type: 'turnEnd', stopCode: StopCode.Finished },
] satisfies StreamEvent[];

function emptyObservers(): AgentStreamObservers {
	return {
		turnStart: [],
		chunk: [],
		update: [],
		turnEnd: [],
	};
}

function stubClient(events: readonly StreamEvent[]): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {
			yield* events;
		}),
		cancel: vi.fn(async () => {}),
	} as MiniACPClient;
}

describe('createAgentObserverDecorator', () => {
	it('observes prompt stream events while preserving the returned stream', async () => {
		const observed: StreamEvent[] = [];
		const observers = emptyObservers();
		observers.turnStart.push((event) => observed.push(event));
		observers.chunk.push((event) => observed.push(event));
		observers.update.push((event) => observed.push(event));
		observers.turnEnd.push((event) => observed.push(event));

		const decorator = createAgentObserverDecorator(observers);
		const client = await decorator.client(stubClient(streamEvents));

		const returned: StreamEvent[] = [];
		for await (const event of client.prompt(userMessage)) returned.push(event);

		expect(observed).toEqual(streamEvents);
		expect(returned).toEqual(streamEvents);
	});

	it('runs multiple observers for the same stream event in registration order', async () => {
		const calls: string[] = [];
		const observers = emptyObservers();
		observers.chunk.push(() => calls.push('first'));
		observers.chunk.push(() => calls.push('second'));

		const decorator = createAgentObserverDecorator(observers);
		const client = await decorator.client(stubClient(streamEvents));

		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so observer callbacks run.
		}

		expect(calls).toEqual(['first', 'second']);
	});

	it('leaves the server side unchanged', async () => {
		const decorator = createAgentObserverDecorator(emptyObservers());
		const server = { toolExecute: vi.fn() } as unknown as MiniACPAgent;

		await expect(decorator.server(server)).resolves.toBe(server);
	});
});

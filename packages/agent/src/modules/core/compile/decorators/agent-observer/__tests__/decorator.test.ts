import type {
	MiniACPAgent,
	MiniACPClient,
	StreamEvent,
} from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createAgentObserverDecorator } from '../decorator.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';

const runtime = createTestRuntime();

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
	it('returns undefined when no stream observers are registered', () => {
		expect(
			createAgentObserverDecorator(createCoreRegistry(), () => runtime),
		).toBeUndefined();
	});

	it('observes prompt stream events while preserving the returned stream', async () => {
		const observed: StreamEvent[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('turnStart', (event) => observed.push(event));
			api.on('chunk', (event) => observed.push(event));
			api.on('update', (event) => observed.push(event));
			api.on('turnEnd', (event) => observed.push(event));
		});

		const decorator = createAgentObserverDecorator(
			registrations,
			() => runtime,
		);
		if (!decorator) throw new Error('Expected observer decorator');
		const client = await decorator.client(stubClient(streamEvents));

		const returned: StreamEvent[] = [];
		for await (const event of client.prompt(userMessage)) returned.push(event);

		expect(observed).toEqual(streamEvents);
		expect(returned).toEqual(streamEvents);
	});

	it('runs multiple observers for the same stream event in registration order', async () => {
		const calls: string[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('chunk', () => calls.push('first'));
			api.on('chunk', () => calls.push('second'));
		});

		const decorator = createAgentObserverDecorator(
			registrations,
			() => runtime,
		);
		if (!decorator) throw new Error('Expected observer decorator');
		const client = await decorator.client(stubClient(streamEvents));

		for await (const _event of client.prompt(userMessage)) {
			// Drain the stream so observer callbacks run.
		}

		expect(calls).toEqual(['first', 'second']);
	});

	it('leaves the server side unchanged', async () => {
		const decorator = createAgentObserverDecorator(
			createCoreRegistry((api) => {
				api.on('chunk', () => {});
			}),
			() => runtime,
		);
		if (!decorator) throw new Error('Expected observer decorator');
		const server = { toolExecute: vi.fn() } as unknown as MiniACPAgent;

		await expect(decorator.server(server)).resolves.toBe(server);
	});
});

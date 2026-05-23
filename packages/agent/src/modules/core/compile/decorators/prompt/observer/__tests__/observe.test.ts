import type { StreamEvent } from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';
import { describe, expect, it } from 'vitest';
import { createPromptObserver } from '../index.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../../__tests__/registry.js';
import { createCoreEventRegistrations } from '../../../../registrations/index.js';

const runtime = createTestRuntime();

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

async function* stream(events: readonly StreamEvent[]) {
	yield* events;
}

describe('agent stream observers', () => {
	it('passes stream events through when no observers are registered', async () => {
		const observePrompt = createPromptObserver(
			createCoreEventRegistrations(createCoreRegistry(), () => runtime),
		);
		const returned: StreamEvent[] = [];

		for await (const event of observePrompt(stream(streamEvents))) {
			returned.push(event);
		}

		expect(returned).toEqual(streamEvents);
	});

	it('observes prompt stream events while preserving the returned stream', async () => {
		const observed: StreamEvent[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('turnStart', (event) => observed.push(event));
			api.on('chunk', (event) => observed.push(event));
			api.on('update', (event) => observed.push(event));
			api.on('turnEnd', (event) => observed.push(event));
		});
		const observePrompt = createPromptObserver(
			createCoreEventRegistrations(registrations, () => runtime),
		);

		const returned: StreamEvent[] = [];
		for await (const event of observePrompt(stream(streamEvents))) {
			returned.push(event);
		}

		expect(observed).toEqual(streamEvents);
		expect(returned).toEqual(streamEvents);
	});

	it('runs multiple observers for the same stream event in registration order', async () => {
		const calls: string[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('chunk', () => calls.push('first'));
			api.on('chunk', () => calls.push('second'));
		});
		const observePrompt = createPromptObserver(
			createCoreEventRegistrations(registrations, () => runtime),
		);

		for await (const _event of observePrompt(stream(streamEvents))) {
			// Drain the stream so observer callbacks run.
		}

		expect(calls).toEqual(['first', 'second']);
	});
});

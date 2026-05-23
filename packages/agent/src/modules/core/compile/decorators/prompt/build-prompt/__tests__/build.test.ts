import type { UserMessage } from '@franklin/mini-acp';
import { describe, expect, it } from 'vitest';
import { createPromptBuilder } from '../index.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../../__tests__/registry.js';
import { createCoreEventRegistrations } from '../../../../registrations/index.js';

const runtime = createTestRuntime();

const userMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'hello' }],
} satisfies UserMessage;

describe('createPromptBuilder', () => {
	it('returns the original prompt when no handlers are registered', async () => {
		const buildPrompt = createPromptBuilder(
			createCoreEventRegistrations(createCoreRegistry(), () => runtime),
		);

		await expect(buildPrompt(userMessage)).resolves.toBe(userMessage);
	});

	it('applies prompt handlers to produce the full user prompt', async () => {
		const buildPrompt = createPromptBuilder(
			createCoreEventRegistrations(
				createCoreRegistry((api) => {
					api.on('prompt', (prompt) => {
						prompt.appendContent({ type: 'text', text: ' [injected]' });
					});
				}),
				() => runtime,
			),
		);

		await expect(buildPrompt(userMessage)).resolves.toEqual({
			role: 'user',
			content: [
				{ type: 'text', text: 'hello' },
				{ type: 'text', text: ' [injected]' },
			],
		});
	});

	it('runs multiple prompt handlers against the original request', async () => {
		const callsSeen: string[] = [];
		const inputsSeen: string[] = [];

		const buildPrompt = createPromptBuilder(
			createCoreEventRegistrations(
				createCoreRegistry((api) => {
					api.on('prompt', (prompt) => {
						callsSeen.push('first');
						inputsSeen.push(prompt.request.content[0]?.type ?? '');
						prompt.prependContent({ type: 'text', text: 'first' });
					});
					api.on('prompt', (prompt) => {
						callsSeen.push('second');
						inputsSeen.push(prompt.request.content[0]?.type ?? '');
						prompt.appendContent({ type: 'text', text: ' [injected]' });
					});
				}),
				() => runtime,
			),
		);
		const prompt = await buildPrompt(userMessage);

		expect(callsSeen).toEqual(['first', 'second']);
		expect(inputsSeen).toEqual(['text', 'text']);
		expect(prompt).toEqual({
			role: 'user',
			content: [
				{ type: 'text', text: 'first' },
				{ type: 'text', text: 'hello' },
				{ type: 'text', text: ' [injected]' },
			],
		});
	});
});

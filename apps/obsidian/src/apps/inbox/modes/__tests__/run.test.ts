import { describe, expect, it, vi } from 'vitest';
import { createMockMiniACP, toolCalls, turnEnd } from '@franklin/mini-acp/mock';
import type { AuthManager } from '@franklin/agent';
import { createInboxTestEnvironment } from '../../agent/test-environment.js';
import { createSplitter } from '../run.js';
import type { ThoughtDump } from '../types.js';

const auth = {
	getApiKey: vi.fn(async () => 'test-key'),
	onAuthChange: () => () => {},
} as unknown as AuthManager;
const dump: ThoughtDump = {
	id: 'dump',
	text: 'What are pages? Why use them?',
	createdAt: 1,
	provider: 'test',
	model: 'test-model',
	reasoning: 'low',
	answerInstructions: '',
	state: { kind: 'running' },
};

describe('extraction runtime', () => {
	it('accepts structured questions through the completion tool and disposes the agent', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([
					{
						name: 'return_questions',
						arguments: {
							questions: ['What are memory pages?', 'Why use memory pages?'],
						},
					},
				]),
				turnEnd(),
			],
		});
		const result = await createSplitter(
			createInboxTestEnvironment().runnerOptions(mock.connector, auth),
		)({ dump, signal: new AbortController().signal });
		expect(result).toEqual(['What are memory pages?', 'Why use memory pages?']);
		expect(mock.calls().disposes).toBe(1);
		expect(mock.context().systemPrompt).toContain(
			'Do not invent a research agenda',
		);
		expect(JSON.stringify(mock.calls().prompts)).toContain(dump.text);
		expect(mock.calls().toolResults[0]?.isError).toBeFalsy();
	});
	it.each([[], undefined])(
		'rejects missing or empty extraction (%j)',
		async (questions) => {
			const mock = createMockMiniACP({
				defaultTurn: [
					...(questions
						? [
								toolCalls([
									{ name: 'return_questions', arguments: { questions } },
								]),
							]
						: []),
					turnEnd(),
				],
			});
			await expect(
				createSplitter(
					createInboxTestEnvironment().runnerOptions(mock.connector, auth),
				)({ dump, signal: new AbortController().signal }),
			).rejects.toThrow();
			expect(mock.calls().disposes).toBe(1);
		},
	);
});

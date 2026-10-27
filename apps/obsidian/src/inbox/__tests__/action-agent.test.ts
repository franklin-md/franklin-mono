import type { AuthManager } from '@franklin/agent';
import { toAbsolutePath } from '@franklin/lib';
import {
	createMockMiniACP,
	delay,
	finishedTurn,
	toolCalls,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { StopCode } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { createInboxActionRunner } from '../actions/run.js';
import type { InboxActionRun } from '../actions/types.js';
import { createInboxTestEnvironment } from '../agent/test-environment.js';

const run: InboxActionRun = {
	id: 'action-run',
	attemptId: 'attempt',
	action: {
		id: 'cards',
		name: '🃏',
		prompt: 'Read Design.md and append proposals to Inbox.md.',
	},
	provider: 'test',
	model: 'action-model',
	reasoning: 'low',
	createdAt: 1,
	state: { kind: 'running' },
	question: {
		id: 'q',
		rootId: 'q',
		attemptId: 'q-attempt',
		text: 'Why recheck?',
		createdAt: 1,
		updatedAt: 1,
		provider: 'test',
		model: 'question-model',
		reasoning: 'off',
		answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
		source: {
			note: 'Sleep',
			heading: 'Waking',
			quote: 'Check the condition again.',
		},
		state: {
			kind: 'answered',
			answer: 'The condition may change before the process runs.',
		},
	},
	ancestors: [],
};
const auth = {
	getApiKey: async () => 'private-key',
	onAuthChange: () => () => {},
} as unknown as AuthManager;

describe('action runtime', () => {
	it('reads a workflow prompt and edits files through real tools, using the saved answer and selected model', async () => {
		const environment = createInboxTestEnvironment();
		await environment.filesystem.mkdir(toAbsolutePath('/vault'), {
			recursive: true,
		});
		for (const [name, text] of [
			['Design.md', 'Keep cards independently answerable.'],
			['Inbox.md', '- Existing proposal'],
		] as const)
			await environment.filesystem.writeFile(
				toAbsolutePath('/vault/' + name),
				new TextEncoder().encode(text),
			);
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([{ name: 'read_file', arguments: { path: 'Design.md' } }]),
				toolCalls([{ name: 'read_file', arguments: { path: 'Inbox.md' } }]),
				toolCalls([
					{
						name: 'edit_file',
						arguments: {
							path: 'Inbox.md',
							old_text: '- Existing proposal',
							new_text:
								'- Existing proposal\n- [ ] Why recheck? The condition may change.',
						},
					},
				]),
				toolCalls([{ name: 'read_file', arguments: { path: 'Inbox.md' } }]),
				toolCalls([
					{
						name: 'finish_action',
						arguments: {
							success: true,
							summary: 'Added one proposal to Inbox.md.',
						},
					},
				]),
				turnEnd(),
			],
		});
		const result = await createInboxActionRunner(
			environment.runnerOptions(mock.connector, auth),
		)({ run, signal: new AbortController().signal });
		expect(result).toBe('Added one proposal to Inbox.md.');
		expect(
			new TextDecoder().decode(
				await environment.filesystem.readFile(
					toAbsolutePath('/vault/Inbox.md'),
				),
			),
		).toContain('Why recheck?');
		expect(mock.calls().toolResults.every((result) => !result.isError)).toBe(
			true,
		);
		expect(mock.context().config.model).toBe('action-model');
		expect(mock.context().tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				'read_file',
				'edit_file',
				'write_file',
				'bash',
				'finish_action',
			]),
		);
		expect(mock.context().tools.map((tool) => tool.name)).not.toContain(
			'return_answer',
		);
		expect(mock.context().systemPrompt).not.toContain(
			'Only reading and research',
		);
		expect(JSON.stringify(mock.calls().prompts)).toContain(
			run.question.state.kind === 'answered' ? run.question.state.answer : '',
		);
		expect(JSON.stringify(mock.calls().prompts)).toContain('action-run');
		expect(mock.calls().disposes).toBe(1);
	});

	it('retains the workflow failure reason and rejects a missing completion', async () => {
		const setup = createInboxTestEnvironment();
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([
					{
						name: 'finish_action',
						arguments: {
							success: false,
							summary: 'The referenced design prompt could not be found.',
						},
					},
				]),
				turnEnd(),
			],
		});
		await expect(
			createInboxActionRunner(setup.runnerOptions(mock.connector, auth))({
				run,
				signal: new AbortController().signal,
			}),
		).rejects.toThrow('design prompt could not be found');
		await expect(
			createInboxActionRunner(
				setup.runnerOptions(
					createMockMiniACP({ defaultTurn: finishedTurn() }).connector,
					auth,
				),
			)({ run, signal: new AbortController().signal }),
		).rejects.toThrow('without completing');
	});

	it('does not accept a completion after cancellation or a failed provider turn', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				delay(100),
				toolCalls([
					{
						name: 'finish_action',
						arguments: { success: true, summary: 'Late success' },
					},
				]),
				turnEnd(),
			],
		});
		const abort = new AbortController();
		const result = createInboxActionRunner(
			createInboxTestEnvironment().runnerOptions(mock.connector, auth),
		)({ run, signal: abort.signal }).catch((error: unknown) => error);
		await vi.waitFor(() => expect(mock.calls().prompts).toHaveLength(1));
		abort.abort();
		expect(await result).toBeInstanceOf(Error);
		expect(mock.calls().disposes).toBe(1);
		const failed = createMockMiniACP({
			defaultTurn: [
				toolCalls([
					{
						name: 'finish_action',
						arguments: { success: true, summary: 'Premature success' },
					},
				]),
				turnEnd({
					stopCode: StopCode.AuthKeyInvalid,
					stopMessage: 'Invalid key',
				}),
			],
		});
		await expect(
			createInboxActionRunner(
				createInboxTestEnvironment().runnerOptions(failed.connector, auth),
			)({ run, signal: new AbortController().signal }),
		).rejects.toThrow('Invalid key');
	});
});

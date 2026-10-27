import { describe, expect, it, vi } from 'vitest';
import {
	createMockMiniACP,
	delay,
	finishedTurn,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { StopCode } from '@franklin/mini-acp';
import type { AuthManager } from '@franklin/agent';
import { toAbsolutePath } from '@franklin/lib';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { createInboxRunner } from '../agent/run.js';
import { createInboxTestEnvironment } from '../agent/test-environment.js';
import type { AnswerRequest } from '../controller/types.js';

function request(): AnswerRequest {
	return {
		question: {
			id: 'q',
			rootId: 'q',
			attemptId: 'attempt',
			text: 'Why recheck?',
			createdAt: 1,
			updatedAt: 1,
			provider: 'test',
			model: 'test-model',
			reasoning: 'low',
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			state: { kind: 'running' },
			source: {
				note: 'Sleep',
				heading: 'Waking',
				quote: 'Check the condition again.',
			},
		},
		ancestors: [],
		signal: new AbortController().signal,
		submit: vi.fn(async () => {}),
	};
}
const auth = {
	getApiKey: vi.fn(async () => 'test-key'),
	onAuthChange: () => () => {},
} as unknown as AuthManager;

describe('inbox Franklin runtime', () => {
	it('allows a question to finish beyond two minutes within its document download allowance', async () => {
		vi.useFakeTimers();
		vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
			const controller = new AbortController();
			setTimeout(
				() => controller.abort(new Error('Request timed out')),
				milliseconds,
			);
			return controller.signal;
		});
		try {
			const mock = createMockMiniACP({
				defaultTurn: [
					delay(130_000),
					toolCalls([
						{
							name: 'return_answer',
							arguments: {
								title: 'Why recheck?',
								answer: 'Finished after downloading.',
							},
						},
					]),
					turnEnd(),
				],
			});
			const input = request();
			const finished = createInboxRunner(
				createInboxTestEnvironment().runnerOptions(mock.connector, auth),
			)(input).then(
				() => undefined,
				(error: unknown) => error,
			);
			await vi.advanceTimersByTimeAsync(130_001);
			expect(await finished).toBeUndefined();
			expect(input.submit).toHaveBeenCalledWith(
				'Finished after downloading.',
				'Why recheck?',
			);
		} finally {
			vi.restoreAllMocks();
			vi.useRealTimers();
		}
	});

	it('supplies research tools, study context and auth, and routes tool results to its question', async () => {
		const mock = createMockMiniACP({
			defaultTurn: turn([
				toolCalls([
					{
						name: 'return_answer',
						arguments: {
							title: 'Why recheck?',
							answer: 'The condition can change.',
						},
					},
				]),
				turnEnd(),
			]),
		});
		const run = createInboxRunner(
			createInboxTestEnvironment().runnerOptions(mock.connector, auth),
		);
		const input = request();
		input.question.answerInstructions =
			'Derive the mechanism step by step.\nUse a C example.';
		await run(input);
		expect(input.submit).toHaveBeenCalledWith(
			'The condition can change.',
			'Why recheck?',
		);
		const context = mock.context();
		expect(context.tools.map((t) => t.name).sort()).toEqual(
			[
				'fetch_url',
				'glob',
				'grep',
				'read_file',
				'return_answer',
				'search_web',
			].sort(),
		);
		expect(context.systemPrompt).toContain(input.question.answerInstructions);
		expect(context.systemPrompt).not.toContain('1–3 short sentences');
		expect(context.systemPrompt).not.toContain(DEFAULT_ANSWER_INSTRUCTIONS);
		expect(context.config.apiKey).toBe('test-key');
		expect(mock.calls().prompts[0]).toMatchObject({
			content: [
				{
					type: 'text',
					text: expect.stringContaining('Check the condition again.'),
				},
			],
		});
	});
	it('reports credential errors and propagates provider failures', async () => {
		const mock = createMockMiniACP({
			defaultTurn: turn([
				turnEnd({
					stopCode: StopCode.AuthKeyInvalid,
					stopMessage: 'Invalid key',
				}),
			]),
		});
		await expect(
			createInboxRunner(
				createInboxTestEnvironment().runnerOptions(mock.connector, auth),
			)(request()),
		).rejects.toThrow('Invalid key');
		const missing = {
			getApiKey: vi.fn(async () => undefined),
			onAuthChange: () => () => {},
		} as unknown as AuthManager;
		await expect(
			createInboxRunner(
				createInboxTestEnvironment().runnerOptions(
					createMockMiniACP({ defaultTurn: finishedTurn() }).connector,
					missing,
				),
			)(request()),
		).rejects.toThrow('Sign in or add a key');
	});
	it('never publishes after cancellation during runtime creation', async () => {
		const abort = new AbortController();
		const input = { ...request(), signal: abort.signal };
		abort.abort();
		const connect = vi.fn(createMockMiniACP().connector);
		await expect(
			createInboxRunner(
				createInboxTestEnvironment().runnerOptions(connect, auth),
			)(input),
		).rejects.toThrow();
		expect(connect).not.toHaveBeenCalled();
		expect(input.submit).not.toHaveBeenCalled();
	});
	it('disposes an agent when cancellation happens while its factory is completing', async () => {
		const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
		const options = createInboxTestEnvironment().runnerOptions(
			mock.connector,
			auth,
		);
		const created = Promise.withResolvers<undefined>();
		const release = Promise.withResolvers<undefined>();
		const abort = new AbortController();
		const input = { ...request(), signal: abort.signal };
		const running = createInboxRunner({
			...options,
			createAgent: async (input) => {
				const runtime = await options.createAgent(input);
				created.resolve(undefined);
				await release.promise;
				return runtime;
			},
		})(input).catch((error: unknown) => error);
		await created.promise;
		abort.abort();
		release.resolve(undefined);
		expect(await running).toBeInstanceOf(Error);
		expect(mock.calls().prompts).toEqual([]);
		expect(mock.calls().disposes).toBe(1);
		expect(input.submit).not.toHaveBeenCalled();
	});
	it('cancels an in-flight agent and rejects its late answer', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				delay(60),
				toolCalls([
					{
						name: 'return_answer',
						arguments: { title: 'Why recheck?', answer: 'late' },
					},
				]),
				turnEnd(),
			],
		});
		const abort = new AbortController();
		const input = { ...request(), signal: abort.signal };
		const running = createInboxRunner(
			createInboxTestEnvironment().runnerOptions(mock.connector, auth),
		)(input);
		const rejected = running.then(
			() => undefined,
			(error: unknown) => error,
		);
		await vi.waitFor(() => expect(mock.calls().prompts).toHaveLength(1));
		abort.abort();
		expect(await rejected).toBeInstanceOf(Error);
		expect(input.submit).not.toHaveBeenCalled();
		expect(mock.calls().cancels).toBe(1);
		expect(mock.calls().disposes).toBe(1);
	});
	it('rejects empty answers at the tool boundary', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([
					{
						name: 'return_answer',
						arguments: { title: 'Why recheck?', answer: '   ' },
					},
				]),
				turnEnd(),
			],
		});
		const input = request();
		await createInboxRunner(
			createInboxTestEnvironment().runnerOptions(mock.connector, auth),
		)(input);
		expect(input.submit).not.toHaveBeenCalled();
		expect(mock.calls().toolResults[0]?.isError).toBe(true);
	});
});

describe('inbox research execution', () => {
	it('reads source files and searches/fetches the web before returning the answer', async () => {
		const fetch = vi.fn(async ({ url }: { url: string }) => ({
			url,
			status: 200,
			statusText: 'OK',
			headers: {
				'content-type': url.includes('exa.ai')
					? 'application/json'
					: 'text/plain',
			},
			body: new TextEncoder().encode(
				url.includes('exa.ai')
					? JSON.stringify({
							result: {
								content: [
									{
										type: 'text',
										text: 'Title: RISC-V privileged specification\nURL: https://riscv.org/spec\nText: stvec holds the supervisor trap vector base address.',
									},
								],
							},
						})
					: 'stvec holds the supervisor trap vector base address.',
			),
		}));
		const setup = createInboxTestEnvironment({ fetch });
		await setup.filesystem.mkdir(toAbsolutePath('/vault'), { recursive: true });
		await setup.filesystem.writeFile(
			toAbsolutePath('/vault/xv6 SP.md'),
			new TextEncoder().encode(
				'- [[System Call]] Mechanism\n\t- Same entry point\n\t\t- [ ] What defines this entry point?',
			),
		);
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([{ name: 'read_file', arguments: { path: 'xv6 SP.md' } }]),
				toolCalls([
					{
						name: 'search_web',
						arguments: {
							query:
								'RISC-V supervisor stvec ecall trap entry official specification',
						},
					},
				]),
				toolCalls([
					{ name: 'fetch_url', arguments: { url: 'https://riscv.org/spec' } },
				]),
				toolCalls([
					{
						name: 'return_answer',
						arguments: {
							title: 'What defines this entry point?',
							answer:
								'The supervisor trap vector comes from `stvec`. [Specification](https://riscv.org/spec)',
						},
					},
				]),
				turnEnd(),
			],
		});
		const input = request();
		input.question.text = 'What defines this entry point?';
		input.question.source = {
			note: 'xv6 SP',
			heading: 'Lecture 3',
			outline: ['Lecture 3', '[[System Call]] Mechanism', 'Same entry point'],
			quote: '- [ ] What defines this entry point?',
		};
		await createInboxRunner(setup.runnerOptions(mock.connector, auth))(input);
		expect(mock.calls().toolResults).toHaveLength(4);
		expect(mock.calls().toolResults.every((result) => !result.isError)).toBe(
			true,
		);
		expect(JSON.stringify(mock.calls().toolResults)).toContain(
			'Same entry point',
		);
		expect(JSON.stringify(mock.calls().toolResults)).toContain(
			'supervisor trap vector base address',
		);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(input.submit).toHaveBeenCalledWith(
			expect.stringContaining('`stvec`'),
			'What defines this entry point?',
		);
		expect(mock.context().systemPrompt).toContain('parent list items');
		expect(JSON.stringify(mock.calls().prompts)).toContain('Same entry point');
		expect(mock.calls().disposes).toBe(1);
	});
});

describe('question header submission', () => {
	it.each([undefined, '', 'x'.repeat(181), 'First line\nSecond line'])(
		'rejects invalid headers before publishing an answer (%s)',
		async (title) => {
			const mock = createMockMiniACP({
				defaultTurn: [
					toolCalls([
						{
							name: 'return_answer',
							arguments: {
								...(title === undefined ? {} : { title }),
								answer: 'An otherwise valid answer.',
							},
						},
					]),
					turnEnd(),
				],
			});
			const input = request();
			await createInboxRunner(
				createInboxTestEnvironment().runnerOptions(mock.connector, auth),
			)(input);
			expect(input.submit).not.toHaveBeenCalled();
			expect(mock.calls().toolResults[0]?.isError).toBe(true);
		},
	);
});

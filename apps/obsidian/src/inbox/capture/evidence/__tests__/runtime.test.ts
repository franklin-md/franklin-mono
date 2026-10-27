import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AuthManager } from '@franklin/agent';
import { toAbsolutePath } from '@franklin/lib';
import {
	createMockMiniACP,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEvidenceRepository } from '../repository.js';
import { createInboxRunner } from '../../../agent/run.js';
import { createInboxTestEnvironment } from '../../../agent/test-environment.js';
import { ResearchRecorder } from '../recorder.js';
import { pinResearch } from '../../pin-research.js';
import { answeredQuestion } from '../../__tests__/question.js';
import type { AnswerRequest } from '../../../controller/types.js';

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(
		roots.splice(0).map((path) => rm(path, { force: true, recursive: true })),
	);
});
async function repository() {
	const directory = await mkdtemp(join(tmpdir(), 'franklin-evidence-'));
	roots.push(directory);
	return { directory, evidence: createEvidenceRepository(directory) };
}
function request(): AnswerRequest {
	return {
		question: { ...answeredQuestion(), state: { kind: 'running' } },
		ancestors: [],
		signal: new AbortController().signal,
		submit: vi.fn(async () => {}),
	};
}

describe('original research evidence', () => {
	it('captures actual file/search/fetch arguments and tool-visible results with accepted-at identity, without config, credentials or reasoning', async () => {
		const { directory, evidence } = await repository();
		const secret = 'private-credential-value';
		const environment = createInboxTestEnvironment({
			fetch: async ({ url }) => ({
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
											text: 'Title: Specification\nURL: https://example.com/spec\nText: Research search result',
										},
									],
								},
							})
						: `Fetched material. Authorization: Bearer ${secret}`,
				),
			}),
		});
		await environment.filesystem.mkdir(toAbsolutePath('/vault'), {
			recursive: true,
		});
		await environment.filesystem.writeFile(
			toAbsolutePath('/vault/Source.md'),
			new TextEncoder().encode(`Original file excerpt. api_key=${secret}`),
		);
		const mock = createMockMiniACP({
			defaultTurn: turn([
				toolCalls([{ name: 'read_file', arguments: { path: 'Source.md' } }]),
				toolCalls([
					{
						name: 'search_web',
						arguments: { query: 'mechanism official specification' },
					},
				]),
				toolCalls([
					{ name: 'fetch_url', arguments: { url: 'https://example.com/spec' } },
				]),
				toolCalls([
					{
						name: 'return_answer',
						arguments: {
							title: 'Question q?',
							answer: 'Answer from the original research.',
						},
					},
				]),
				turnEnd(),
			]),
		});
		const input = request();
		await createInboxRunner({
			...environment.runnerOptions(mock.connector, {
				getApiKey: async () => secret,
				onAuthChange: () => () => {},
			} as unknown as AuthManager),
			evidence,
		})(input);
		const saved = await evidence.load('q', 'q-accepted');
		expect(saved).toMatchObject({
			status: 'complete',
			question: { id: 'q', attemptId: 'q-accepted' },
		});
		expect(saved?.acceptedAt).toEqual(expect.any(Number));
		expect(saved?.events.map((event) => event.name)).toEqual([
			'read_file',
			'search_web',
			'fetch_url',
		]);
		expect(saved?.systemPrompt?.text).toContain('personal study inbox');
		const text = await readFile(
			join(directory, (await readdir(directory))[0]!),
			'utf8',
		);
		expect(text).toContain('Original file excerpt');
		expect(text).toContain('Research search result');
		expect(text).toContain('Fetched material');
		expect(text).toContain('https://example.com/spec');
		expect(text).not.toContain(secret);
		expect(text).not.toContain('apiKey');
		expect(text).not.toContain('"reasoning":[');
		expect(input.submit).toHaveBeenCalledOnce();
	});

	it('bounds long research with explicit omission counts and does not mix attempts or sibling branches', async () => {
		const { evidence } = await repository();
		const input = request();
		const parent = answeredQuestion('parent');
		input.question.parentId = parent.id;
		input.question.rootId = parent.id;
		input.ancestors = [parent];
		const longSource = 'Original excerpt\n' + 'x'.repeat(80_000);
		const environment = createInboxTestEnvironment();
		await environment.filesystem.mkdir(toAbsolutePath('/vault'), {
			recursive: true,
		});
		await environment.filesystem.writeFile(
			toAbsolutePath('/vault/Source.md'),
			new TextEncoder().encode(longSource),
		);
		const mock = createMockMiniACP({
			defaultTurn: turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: { path: 'Source.md', limit: 1_000_000 },
					},
				]),
				toolCalls([
					{
						name: 'return_answer',
						arguments: { title: 'Question q?', answer: 'Accepted answer.' },
					},
				]),
				turnEnd(),
			]),
		});
		await createInboxRunner({
			...environment.runnerOptions(mock.connector, {
				getApiKey: async () => 'key',
				onAuthChange: () => () => {},
			} as unknown as AuthManager),
			evidence,
		})(input);
		const accepted = { ...input.question, state: answeredQuestion().state };
		const pinned = await pinResearch(accepted, [parent], evidence);
		expect(pinned.map((entry) => entry.question.id)).toEqual(['q', 'parent']);
		expect(pinned[0]?.ancestors.map((ancestor) => ancestor.id)).toEqual([
			'parent',
		]);
		expect(pinned[0]?.status).toBe('partial');
		expect(pinned[0]?.events[0]?.result?.omittedCharacters).toBeGreaterThan(0);
		expect(pinned[1]?.status).toBe('missing');
		expect(
			(await pinResearch(accepted, [answeredQuestion('sibling')], evidence))[0]
				?.missing[0],
		).toContain('different ancestor branch');
		const retry = answeredQuestion();
		retry.attemptId = 'different-attempt';
		expect((await pinResearch(retry, [], evidence))[0]?.status).toBe('missing');
		expect(await evidence.load('q', 'different-attempt')).toBeUndefined();
	});

	it('keeps interrupted and damaged research explicitly partial and preserves corrupt sidecars', async () => {
		const { evidence, directory } = await repository();
		const recorder = new ResearchRecorder(
			request(),
			'Original prompt',
			evidence,
		);
		await recorder.save();
		let pinned = await pinResearch(answeredQuestion(), [], evidence);
		expect(pinned[0]?.status).toBe('partial');
		expect(pinned[0]?.missing).toContain('Research capture was interrupted');
		await recorder.interrupt();
		pinned = await pinResearch(answeredQuestion(), [], evidence);
		expect(pinned[0]?.status).toBe('partial');
		const { writeFile } = await import('node:fs/promises');
		const path = join(directory, (await readdir(directory))[0]!);
		await writeFile(path, 'broken');
		pinned = await pinResearch(answeredQuestion(), [], evidence);
		expect(pinned[0]?.status).toBe('missing');
		expect(pinned[0]?.missing[0]).toContain('validated');
		expect(await readFile(path, 'utf8')).toBe('broken');
	});
});

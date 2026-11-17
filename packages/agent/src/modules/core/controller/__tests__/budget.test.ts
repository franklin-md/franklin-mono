import { describe, expect, it, vi } from 'vitest';
import {
	ZERO_USAGE,
	type LLMConfig,
	type UserMessage,
} from '@franklin/mini-acp';
import { createMockMiniACP } from '@franklin/mini-acp/mock';
import { createCoreRegistry } from '../../__tests__/registry.js';
import { emptySessionSnapshot } from '../../state.js';
import { createToolRegistry } from '../../tools/index.js';
import { createMessageEntries } from '../../../../testing/session-entries.js';
import { estimateContextTokens } from '../../compaction/tokens/context.js';
import type { Summarize } from '../../compaction/types.js';
import { createAgentSession } from '../session.js';
import { fallbackServer } from '../fallback.js';

const small = { provider: 'openai', model: 'gpt-4' };
const large = { provider: 'openai-codex', model: 'gpt-5.5' };
const larger = { provider: 'openai-codex', model: 'gpt-5.6-sol' };
// Pin both reserve branches against the existing catalog, including a local override.
const budgets = [
	{ config: small, contextWindow: 8192, limit: 6144 },
	{ config: large, contextWindow: 272_000, limit: 255_616 },
	{ config: larger, contextWindow: 372_000, limit: 355_616 },
];

async function setup(config: LLMConfig, tokens: number) {
	const registrations = createCoreRegistry();
	const snapshot = emptySessionSnapshot();
	snapshot.llmConfig = config;
	// Empty schemas contribute one token, and a text message has eight overhead tokens.
	snapshot.entries = createMessageEntries([
		{
			role: 'user',
			content: [{ type: 'text', text: 'x'.repeat((tokens - 9) * 4) }],
		},
	]);
	const summarize = vi.fn<Summarize>(async () => ({
		summary: 'Remember the research.',
		usage: ZERO_USAGE,
	}));
	const session = createAgentSession({
		snapshot,
		registrations,
		toolRegistry: createToolRegistry(registrations.tools),
		summarize,
	});
	const client = await createMockMiniACP().connector(fallbackServer);
	const signal = new AbortController().signal;
	await session.sync(client);
	expect(estimateContextTokens(session.getSentContext())).toBe(tokens);
	return { session, client, signal, summarize };
}

describe('selected-model compaction budgets', () => {
	for (const { config, contextWindow, limit } of budgets) {
		it.each([-1, 0, 1])(
			`${config.model} compacts only above its ${limit}-token threshold (offset %i)`,
			async (offset) => {
				const test = await setup(config, limit + offset);
				await test.session.prepare(test.client, test.signal);
				expect(test.summarize).toHaveBeenCalledTimes(offset > 0 ? 1 : 0);
				expect(
					test.summarize.mock.calls.map(([input]) => ({
						config: input.config,
						contextWindow: input.contextWindow,
					})),
				).toEqual(offset > 0 ? [{ config, contextWindow }] : []);
				expect(
					test.session
						.getSnapshot()
						.entries.filter((entry) => entry.type === 'compaction'),
				).toHaveLength(offset > 0 ? 1 : 0);
			},
		);

		it(`uses ${config.model}'s window for manual compaction`, async () => {
			const test = await setup(small, 1000);
			test.session.recordContext({ config });
			await expect(
				test.session.compact(test.client, test.signal),
			).resolves.toBe(true);
			expect(test.summarize).toHaveBeenCalledOnce();
			const input = test.summarize.mock.calls[0]![0];
			expect(input.config).toEqual(config);
			expect(input.contextWindow).toBe(contextWindow);
		});
	}

	it('includes the pending prompt in the threshold without summarizing it', async () => {
		const test = await setup(large, 255_616);
		const incoming: UserMessage = {
			role: 'user',
			content: [{ type: 'text', text: 'Continue' }],
		};
		await test.session.prepare(test.client, test.signal, incoming);
		expect(test.summarize).toHaveBeenCalledOnce();
		expect(test.summarize.mock.calls[0]![0].messages).not.toContainEqual(
			incoming,
		);
	});

	it('lowers the threshold and summary budget when the selected model changes', async () => {
		const test = await setup(larger, 260_000);
		await test.session.prepare(test.client, test.signal);
		expect(test.summarize).not.toHaveBeenCalled();
		test.session.recordContext({ config: { model: large.model } });
		await test.session.prepare(test.client, test.signal);
		expect(test.summarize).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				config: large,
				contextWindow: 272_000,
			}),
		);
	});

	it('raises the threshold when the selected model changes', async () => {
		const test = await setup(large, 260_000);
		test.session.recordContext({ config: { model: larger.model } });
		await test.session.prepare(test.client, test.signal);
		expect(test.summarize).not.toHaveBeenCalled();
	});

	it('preserves the fallback budget for configs outside the built-in catalog', async () => {
		const test = await setup({ provider: 'custom', model: 'custom' }, 7000);
		await test.session.prepare(test.client, test.signal);
		expect(test.summarize).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				contextWindow: 8192,
			}),
		);
	});
});

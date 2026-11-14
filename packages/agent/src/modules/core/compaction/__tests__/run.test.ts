import { describe, expect, it, vi } from 'vitest';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { createSessionDraft } from '../../context/draft/index.js';
import { createCoreRegistry } from '../../__tests__/registry.js';
import { createToolRegistry } from '../../tools/index.js';
import { createMessageEntries } from '../../history/create.js';
import { projectEntries } from '../../history/project.js';
import { emptySessionSnapshot } from '../../state.js';
import { runCompaction } from '../run.js';
import type { Summarize } from '../types.js';

function setup() {
	const registrations = createCoreRegistry();
	const snapshot = emptySessionSnapshot();
	snapshot.entries = createMessageEntries([
		{
			role: 'user',
			content: [{ type: 'text', text: 'old context '.repeat(100) }],
		},
		{ role: 'user', content: [{ type: 'text', text: 'recent' }] },
	]);
	const draft = createSessionDraft({
		snapshot,
		registrations,
		toolRegistry: createToolRegistry(registrations.tools),
	});
	const abort = new AbortController();
	const summarize = vi.fn<Summarize>(async () => ({
		summary: 'A short summary',
		usage: ZERO_USAGE,
	}));
	const addUsage = vi.fn();
	return {
		draft,
		abort,
		summarize,
		addUsage,
		run: () =>
			runCompaction({
				draft,
				summarize,
				addUsage,
				signal: abort.signal,
				keepRecentTokens: 10,
				contextWindow: 8192,
			}),
	};
}

describe('compaction commit', () => {
	it('appends a checkpoint without mutating raw messages', async () => {
		const test = setup();
		const before = test.draft.getEntries();
		await expect(test.run()).resolves.toBe(true);
		expect(test.draft.getEntries().slice(0, before.length)).toEqual(before);
		expect(projectEntries(test.draft.getEntries())).toHaveLength(2);
		expect(test.addUsage).toHaveBeenCalledExactlyOnceWith(ZERO_USAGE);
	});

	it('uses the previous summary and new prefix on repeated compaction', async () => {
		const test = setup();
		await test.run();
		test.draft.append({
			role: 'user',
			content: [{ type: 'text', text: 'newest' }],
		});
		test.summarize.mockResolvedValueOnce({
			summary: 'Shorter',
			usage: ZERO_USAGE,
		});
		await test.run();
		const input = test.summarize.mock.calls[1]![0];
		expect(JSON.stringify(input.messages)).toContain('A short summary');
		expect(JSON.stringify(input.messages)).toContain('recent');
		expect(JSON.stringify(input.messages)).not.toContain(
			'old context old context',
		);
		expect(
			test.draft.getEntries().filter((entry) => entry.type === 'compaction'),
		).toHaveLength(2);
	});

	it.each(['', 'x'.repeat(10_000)])(
		'rejects an unusable summary without appending a checkpoint',
		async (summary) => {
			const test = setup();
			const before = test.draft.getEntries();
			test.summarize.mockResolvedValueOnce({ summary, usage: ZERO_USAGE });
			await expect(test.run()).rejects.toThrow('did not reduce');
			expect(test.draft.getEntries()).toEqual(before);
		},
	);

	it('leaves history unchanged when summary generation fails', async () => {
		const test = setup();
		const before = test.draft.getEntries();
		test.summarize.mockRejectedValueOnce(new Error('provider failed'));
		await expect(test.run()).rejects.toThrow('provider failed');
		expect(test.draft.getEntries()).toEqual(before);
	});

	it('does not commit a summary after cancellation', async () => {
		const test = setup();
		const before = test.draft.getEntries();
		test.summarize.mockImplementationOnce(async () => {
			test.abort.abort();
			return { summary: 'summary', usage: ZERO_USAGE };
		});
		await expect(test.run()).rejects.toThrow();
		expect(test.draft.getEntries()).toEqual(before);
	});

	it('rejects a stale summary when history or model config changes', async () => {
		const test = setup();
		test.summarize.mockImplementationOnce(async () => {
			test.draft.apply({ config: { model: 'another-model' } });
			return { summary: 'summary', usage: ZERO_USAGE };
		});
		await expect(test.run()).rejects.toThrow('Session changed');
		expect(
			test.draft.getEntries().some((entry) => entry.type === 'compaction'),
		).toBe(false);
	});
});

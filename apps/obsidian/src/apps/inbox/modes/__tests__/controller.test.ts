import { describe, expect, it, vi } from 'vitest';
import { InboxController } from '../../controller/controller.js';
import type {
	InboxDocument,
	InboxControllerOptions,
} from '../../controller/types.js';
import { inboxCodec } from '../../controller/schema.js';

const defaults = {
	provider: 'test',
	model: 'original',
	reasoning: 'low' as const,
};
async function setup(split: InboxControllerOptions['split']) {
	let saved: InboxDocument | undefined;
	const save = vi.fn(async (value: InboxDocument) => {
		saved = structuredClone(value);
	});
	const run = vi.fn(async () => {});
	const options = {
		defaults,
		split,
		run,
		persistence: {
			save,
			load: async () => ({
				value: saved ? structuredClone(saved) : undefined,
				issues: [],
			}),
			delete: async () => {},
		},
	};
	const inbox = await InboxController.create(options);
	return { inbox, save, run, options, read: () => saved };
}

describe('thought dump queue', () => {
	it('extracts in the background, snapshots settings and creates grouped independent questions once', async () => {
		let finish!: (questions: string[]) => void;
		const split = vi.fn(
			() =>
				new Promise<string[]>((resolve) => {
					finish = resolve;
				}),
		);
		const h = await setup(split);
		const source = { note: 'VM', heading: 'Paging', quote: 'page tables' };
		await h.inbox.thoughtDumps.add('Why pages? How big?', source);
		await vi.waitFor(() => expect(split).toHaveBeenCalledTimes(1));
		await h.inbox.configure({
			model: 'changed',
			answerInstructions: 'Changed',
		});
		finish(['Why use pages?', 'How big are pages?', 'Why use pages?']);
		await vi.waitFor(() =>
			expect(h.inbox.state.get().thoughtDumps?.[0]?.state).toEqual({
				kind: 'succeeded',
				count: 2,
			}),
		);
		expect(h.inbox.state.get().questions).toHaveLength(2);
		for (const q of h.inbox.state.get().questions) {
			expect(q.model).toBe('original');
			expect(q.source).toEqual(source);
			expect(q.parentId).toBe(h.inbox.state.get().groups?.[0]?.id);
			expect(q.rootId).toBe(q.parentId);
		}
		expect(h.inbox.state.get().groups).toHaveLength(1);
		expect(h.inbox.state.get().groups?.[0]?.context).toBe(
			'Why pages? How big?',
		);
		await h.inbox.thoughtDumps.retry(h.inbox.state.get().thoughtDumps![0]!.id);
		expect(split).toHaveBeenCalledTimes(1);
		expect(h.read()?.thoughtDumps?.[0]?.text).toBe('Why pages? How big?');
		const encoded = inboxCodec.encode(h.read()!);
		const decoded = inboxCodec.decode(encoded);
		if (!decoded.ok) throw new Error('Could not decode saved thought dump');
		expect(decoded.value).toEqual(h.read());
		await h.inbox.thoughtDumps.dismiss(
			h.inbox.state.get().thoughtDumps![0]!.id,
		);
		expect(h.inbox.state.get().groups).toHaveLength(1);
		expect(h.inbox.state.get().groups?.[0]?.context).toBe(
			'Why pages? How big?',
		);
		await h.inbox.dispose();
	});
	it('retains empty/failed extraction and retries with the original settings', async () => {
		const split = vi
			.fn<NonNullable<InboxControllerOptions['split']>>()
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(['Why pages?']);
		const h = await setup(split);
		await h.inbox.thoughtDumps.add('Why pages?');
		await vi.waitFor(() =>
			expect(h.inbox.state.get().thoughtDumps?.[0]?.state.kind).toBe('failed'),
		);
		expect(h.inbox.state.get().questions).toHaveLength(0);
		await h.inbox.configure({ model: 'changed' });
		await h.inbox.thoughtDumps.retry(h.inbox.state.get().thoughtDumps![0]!.id);
		await vi.waitFor(() =>
			expect(h.inbox.state.get().questions).toHaveLength(1),
		);
		expect(split.mock.calls[1]?.[0].dump.model).toBe('original');
		await h.inbox.dispose();
	});
	it('retains the batch after a failed completion save without extracting or enqueueing twice', async () => {
		const split = vi.fn(async () => ['Why pages?']);
		const h = await setup(split);
		h.save.mockImplementation(async (value) => {
			if (value.thoughtDumps?.[0]?.state.kind === 'succeeded')
				throw new Error('disk full');
		});
		await h.inbox.thoughtDumps.add('Why pages?');
		await vi.waitFor(() =>
			expect(h.inbox.state.get().storageError).toContain('disk full'),
		);
		expect(h.inbox.state.get().groups).toHaveLength(1);
		expect(h.inbox.state.get().questions).toHaveLength(1);
		expect(h.run).not.toHaveBeenCalled();
		h.save.mockResolvedValue(undefined);
		await h.inbox.retrySave();
		await vi.waitFor(() => expect(h.run).toHaveBeenCalledTimes(1));
		expect(split).toHaveBeenCalledTimes(1);
		expect(h.inbox.state.get().questions).toHaveLength(1);
		expect(h.inbox.state.get().groups).toHaveLength(1);
		await h.inbox.dispose();
	});
	it('rejects an initial save failure without leaving a second job for composer retry', async () => {
		const split = vi.fn(async () => ['Why?']);
		const h = await setup(split);
		h.save.mockRejectedValueOnce(new Error('disk full'));
		await expect(h.inbox.thoughtDumps.add('Why?')).rejects.toThrow('disk full');
		expect(h.inbox.state.get().thoughtDumps).toEqual([]);
		await h.inbox.thoughtDumps.add('Why?');
		await vi.waitFor(() => expect(split).toHaveBeenCalledTimes(1));
		await h.inbox.dispose();
	});
	it('interrupts extraction on shutdown, ignores late output and allows retry after restart', async () => {
		let finish!: (questions: string[]) => void;
		const h = await setup(
			() =>
				new Promise<string[]>((resolve) => {
					finish = resolve;
				}),
		);
		await h.inbox.thoughtDumps.add('Why?');
		await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
		await h.inbox.dispose();
		finish(['Late question']);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(h.inbox.state.get().questions).toEqual([]);
		const restored = await InboxController.create({
			...h.options,
			split: async () => ['Why?'],
		});
		expect(restored.state.get().thoughtDumps?.[0]?.state.kind).toBe('failed');
		await restored.thoughtDumps.retry(
			restored.state.get().thoughtDumps![0]!.id,
		);
		await vi.waitFor(() =>
			expect(restored.state.get().questions).toHaveLength(1),
		);
		await restored.dispose();
	});
});

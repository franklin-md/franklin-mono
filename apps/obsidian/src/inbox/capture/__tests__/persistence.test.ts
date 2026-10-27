import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CaptureController } from '../controller.js';
import { captureSetup, cardSnapshot } from './setup.js';
import { answeredQuestion } from './question.js';

const roots: string[] = [];
afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
	);
});
async function setup() {
	const result = await captureSetup();
	roots.push(result.root);
	return result;
}

describe('recording completion recovery', () => {
	it('finishes a legacy pending review using its stored selection without recollecting or claiming human confirmation', async () => {
		const { capture, options, root, readCards } = await setup();
		await capture.start(answeredQuestion(), []);
		const document = (await options.load())!;
		const pending = document.pending!;
		pending.phase = 'reviewing';
		pending.endedAt = Date.now();
		pending.snapshots = [cardSnapshot('kept', 'excluded')];
		pending.excludedCardIds = ['excluded'];
		pending.confirmedAt = Date.now();
		await options.save(document);
		await capture.dispose();
		const restored = await CaptureController.create(options);
		await restored.stop();
		expect(readCards).not.toHaveBeenCalled();
		const saved: {
			cardIds: string[];
			snapshots: { cards: unknown[] }[];
			completionMode: string;
		} = JSON.parse(
			await readFile(join(root, pending.folder, `${pending.id}.json`), 'utf8'),
		);
		expect(saved.cardIds).toEqual(['kept']);
		expect(saved.snapshots[0]?.cards).toHaveLength(2);
		expect(saved.completionMode).toBe('automatic');
		expect(saved).not.toHaveProperty('confirmedAt');
		await restored.dispose();
	});
	it('persists Stop before querying and recovers failed checkpoints and delayed collection in the same window', async () => {
		const { capture, options, readCards, root } = await setup();
		vi.spyOn(Date, 'now').mockReturnValue(1000);
		await capture.start(answeredQuestion(), []);
		const original = capture.state.get().pending!;
		vi.spyOn(options, 'save').mockRejectedValueOnce(new Error('Disk full'));
		vi.spyOn(Date, 'now').mockReturnValue(2000);
		await expect(capture.stop()).rejects.toThrow('Disk full');
		expect(readCards).not.toHaveBeenCalled();
		readCards.mockRejectedValueOnce(new Error('Database busy'));
		await expect(capture.retry()).rejects.toThrow('Database busy');
		await capture.dispose();
		const restored = await CaptureController.create(options);
		expect(restored.state.get().pending?.endedAt).toBe(2000);
		vi.spyOn(Date, 'now').mockReturnValue(4000);
		readCards.mockResolvedValue(cardSnapshot('delayed'));
		await restored.retry();
		expect(readCards).toHaveBeenLastCalledWith(
			expect.any(String),
			1000,
			2000,
			[],
		);
		const saved: { snapshotAt: number; cardIds: string[] } = JSON.parse(
			await readFile(
				join(root, original.folder, `${original.id}.json`),
				'utf8',
			),
		);
		expect(saved.snapshotAt).toBe(4000);
		expect(saved.cardIds).toEqual(['delayed']);
		await restored.dispose();
	});
	it('retries an atomic episode write and completion checkpoint without duplicates, recollection or premature success notices', async () => {
		const { capture, options, root, readCards, notify } = await setup();
		await capture.start(answeredQuestion(), []);
		const pending = capture.state.get().pending!;
		readCards.mockResolvedValue(cardSnapshot('new'));
		const destination = join(root, pending.folder, `${pending.id}.json`);
		const write = vi
			.spyOn(options, 'writeEpisode')
			.mockRejectedValueOnce(new Error('Interrupted write'));
		await expect(capture.stop()).rejects.toThrow('Interrupted');
		await expect(readFile(destination)).rejects.toThrow();
		expect(capture.state.get().pending?.phase).toBe('saving');
		await capture.dispose();
		const restored = await CaptureController.create(options);
		const originalSave = options.save;
		const save = vi
			.spyOn(options, 'save')
			.mockImplementation(async (document) => {
				if (!document.pending) throw new Error('Completion checkpoint failed');
				await originalSave(document);
			});
		await expect(restored.retry()).rejects.toThrow('Completion checkpoint');
		expect(restored.state.get().pending?.id).toBe(pending.id);
		expect(notify).toHaveBeenCalledTimes(1);
		save.mockRestore();
		await restored.retry();
		expect(write).toHaveBeenCalledTimes(3);
		expect(readCards).toHaveBeenCalledTimes(1);
		expect(await readdir(join(root, pending.folder))).toEqual([
			`${pending.id}.json`,
		]);
		expect(restored.state.get().completed).toHaveLength(1);
		expect(JSON.parse(await readFile(destination, 'utf8'))).toMatchObject({
			captureVersion: 4,
			id: pending.id,
			phase: 'complete',
		});
		expect(notify.mock.calls.map(([message]) => message)).toEqual([
			'Recording started.',
			'Recording completed: 1 card saved.',
		]);
		await restored.stop();
		expect(restored.state.get().completed).toHaveLength(1);
		await restored.dispose();
	});
});

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

describe('automatic recording completion', () => {
	it('keeps an empty recording recoverable until the discard checkpoint succeeds', async () => {
		const { capture, options, notify, readCards } = await setup();
		await capture.start(answeredQuestion(), []);
		const originalSave = options.save;
		const save = vi
			.spyOn(options, 'save')
			.mockImplementation(async (document) => {
				if (!document.pending) throw new Error('Disk full');
				await originalSave(document);
			});
		await expect(capture.stop()).rejects.toThrow('Disk full');
		expect(capture.state.get().pending).toBeDefined();
		expect(notify).toHaveBeenCalledTimes(1);
		save.mockRestore();
		await capture.retry();
		expect(capture.state.get().pending).toBeUndefined();
		expect(capture.state.get().completed).toEqual([]);
		expect(readCards).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenLastCalledWith(
			'Recording completed: no cards saved.',
		);
		await capture.dispose();
	});
	it('completes the previous recording at the new start time, saves its cards and notifies once', async () => {
		const { capture, readCards, notify, root } = await setup();
		vi.spyOn(Date, 'now').mockReturnValue(1000);
		await capture.start(answeredQuestion('first'), []);
		const first = capture.state.get().pending!;
		readCards.mockResolvedValue(cardSnapshot('first-card'));
		vi.spyOn(Date, 'now').mockReturnValue(2000);
		await Promise.all([
			capture.start(answeredQuestion('second'), []),
			capture.start(answeredQuestion('second'), []),
		]);
		expect(capture.state.get().pending).toMatchObject({
			startedAt: 2000,
			phase: 'recording',
			question: { id: 'second' },
		});
		expect(readCards).toHaveBeenCalledWith(first.databasePath, 1000, 2000, []);
		expect(capture.state.get().completed).toHaveLength(1);
		const saved = JSON.parse(
			await readFile(join(root, first.folder, `${first.id}.json`), 'utf8'),
		);
		expect(saved).toMatchObject({
			captureVersion: 4,
			startedAt: 1000,
			endedAt: 2000,
			completedAt: 2000,
			completionMode: 'automatic',
			cardIds: ['first-card'],
		});
		expect(saved).not.toHaveProperty('confirmedAt');
		readCards.mockResolvedValue(cardSnapshot('second-card', 'third-card'));
		vi.spyOn(Date, 'now').mockReturnValue(3000);
		await Promise.all([capture.stop(), capture.stop()]);
		expect(capture.state.get().pending).toBeUndefined();
		expect(capture.state.get().completed).toHaveLength(2);
		expect(await readdir(join(root, first.folder))).toHaveLength(2);
		expect(notify.mock.calls.map(([message]) => message)).toEqual([
			'Recording started.',
			'Recording completed: 1 card saved.',
			'Recording started.',
			'Recording completed: 2 cards saved.',
		]);
		await capture.dispose();
	});
	it('discards empty recordings on switch and Stop without creating an episode file or completion entry', async () => {
		const { capture, root, appDir, notify } = await setup();
		await capture.start(answeredQuestion('empty-first'), []);
		const folder = capture.state.get().pending!.folder;
		await capture.start(answeredQuestion('empty-second'), []);
		await capture.stop();
		expect(capture.state.get().pending).toBeUndefined();
		expect(capture.state.get().completed).toEqual([]);
		await expect(readdir(join(root, folder))).rejects.toThrow();
		const journal: { completed: unknown[] } = JSON.parse(
			await readFile(join(appDir, 'capture.json'), 'utf8'),
		);
		expect(journal).not.toHaveProperty('pending');
		expect(journal.completed).toEqual([]);
		expect(
			notify.mock.calls.filter(
				([message]) => message === 'Recording completed: no cards saved.',
			),
		).toHaveLength(2);
		await capture.dispose();
	});
	it('preserves failed completion instead of replacing it, then retries the same window after reload', async () => {
		const { capture, options, readCards } = await setup();
		vi.spyOn(Date, 'now').mockReturnValue(1000);
		await capture.start(answeredQuestion('first'), []);
		const id = capture.state.get().pending!.id;
		vi.spyOn(Date, 'now').mockReturnValue(2000);
		readCards.mockRejectedValueOnce(new Error('Database busy'));
		await expect(capture.start(answeredQuestion('second'), [])).rejects.toThrow(
			'Database busy',
		);
		expect(capture.state.get().pending).toMatchObject({
			id,
			endedAt: 2000,
			question: { id: 'first' },
		});
		await capture.dispose();
		const restored = await CaptureController.create(options);
		readCards.mockResolvedValue(cardSnapshot('recovered'));
		vi.spyOn(Date, 'now').mockReturnValue(3000);
		await restored.start(answeredQuestion('second'), []);
		expect(readCards).toHaveBeenLastCalledWith(
			expect.any(String),
			1000,
			2000,
			[],
		);
		expect(restored.state.get().completed[0]?.id).toBe(id);
		expect(restored.state.get().pending?.question.id).toBe('second');
		await restored.dispose();
	});
});

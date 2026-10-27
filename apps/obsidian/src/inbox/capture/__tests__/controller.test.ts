import { readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
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

describe('durable flashcard episodes', () => {
	it('pins open drafts once at Record and restores them for collection and retries', async () => {
		const { capture, options, readDraftIds, readCards } = await setup();
		readDraftIds.mockResolvedValueOnce(['already-open-draft']);
		vi.spyOn(Date, 'now').mockReturnValue(1000);
		await capture.start(answeredQuestion(), []);
		expect(capture.state.get().pending?.draftBaseline).toEqual({
			cardIds: ['already-open-draft'],
			capturedAt: 1000,
			source: 'record-start',
		});
		await capture.dispose();
		const restored = await CaptureController.create(options);
		vi.spyOn(Date, 'now').mockReturnValue(2000);
		readCards.mockRejectedValueOnce(new Error('Busy'));
		await expect(restored.stop()).rejects.toThrow('Busy');
		await restored.retry();
		expect(readDraftIds).toHaveBeenCalledTimes(1);
		expect(readCards).toHaveBeenCalledTimes(2);
		expect(readCards).toHaveBeenLastCalledWith(expect.any(String), 1000, 2000, [
			'already-open-draft',
		]);
		await restored.dispose();
	});
	it('does not start a recording when the draft baseline cannot be read', async () => {
		const { capture, readDraftIds, readCards, appDir } = await setup();
		readDraftIds.mockRejectedValueOnce(new Error('Mochi database busy'));
		await expect(capture.start(answeredQuestion(), [])).rejects.toThrow(
			'database busy',
		);
		expect(capture.state.get().pending).toBeUndefined();
		expect(capture.state.get().storageError).toContain('database busy');
		expect(readCards).not.toHaveBeenCalled();
		await expect(readFile(join(appDir, 'capture.json'))).rejects.toThrow();
		await capture.dispose();
	});
	it('permits stopping after a backwards-clock error is corrected', async () => {
		const { capture, readCards } = await setup();
		vi.spyOn(Date, 'now').mockReturnValue(1000);
		await capture.start(answeredQuestion(), []);
		vi.spyOn(Date, 'now').mockReturnValue(900);
		await expect(capture.stop()).rejects.toThrow('clock moved backwards');
		expect(capture.state.get().pending?.endedAt).toBeUndefined();
		vi.spyOn(Date, 'now').mockReturnValue(2000);
		readCards.mockResolvedValue(cardSnapshot('one', 'two'));
		await capture.stop();
		expect(capture.state.get().completed[0]?.cardCount).toBe(2);
		await capture.dispose();
	});
	it('pins question/attempt/ancestor context, restores it and automatically saves all matched cards in one file', async () => {
		const { capture, root, options, readCards } = await setup();
		vi.spyOn(Date, 'now').mockReturnValue(1000);
		const question = answeredQuestion();
		const parent = answeredQuestion('parent');
		question.parentId = parent.id;
		question.rootId = parent.id;
		await Promise.all([
			capture.start(question, [parent]),
			capture.start(question, [parent]),
		]);
		question.text = 'Later changed question';
		const original = capture.state.get().pending!;
		expect(original.question.text).toBe('Question q?');
		expect(original.research.map((entry) => entry.question.attemptId)).toEqual([
			'q-accepted',
			'parent-accepted',
		]);
		expect(original.research.every((entry) => entry.status === 'missing')).toBe(
			true,
		);
		await capture.dispose();
		const restored = await CaptureController.create(options);
		expect(restored.state.get().pending?.id).toBe(original.id);
		readCards.mockResolvedValue(cardSnapshot('one', 'two'));
		vi.spyOn(Date, 'now').mockReturnValue(2000);
		await Promise.all([restored.stop(), restored.stop()]);
		expect(readCards).toHaveBeenCalledTimes(1);
		const saved: {
			snapshots: { cards: { id: string }[] }[];
			context: string;
			research: unknown[];
		} = JSON.parse(
			await readFile(
				join(root, original.folder, `${original.id}.json`),
				'utf8',
			),
		);
		expect(saved).toMatchObject({
			captureVersion: 4,
			phase: 'complete',
			cardIds: ['one', 'two'],
			question: { attemptId: 'q-accepted' },
		});
		expect(saved.snapshots[0]?.cards.map((card) => card.id)).toEqual([
			'one',
			'two',
		]);
		expect(saved.context).toContain('Original source context');
		expect(saved.research).toHaveLength(2);
		expect(await readdir(join(root, original.folder))).toEqual([
			`${original.id}.json`,
		]);
		expect(restored.state.get().completed[0]?.path).toBe(
			`${original.folder}/${original.id}.json`,
		);
		expect(restored.state.get().pending).toBeUndefined();
		expect(
			(await CaptureController.create(options)).state.get().completed,
		).toHaveLength(1);
		await restored.dispose();
	});
	it.each(['folder', 'path'])(
		'restores legacy completed %s references and completion times without rewriting episodes',
		async (key) => {
			const { capture, options, appDir } = await setup();
			await capture.dispose();
			const id = crypto.randomUUID();
			const path = `Legacy examples/${id}`;
			await writeFile(
				join(appDir, 'capture.json'),
				JSON.stringify({
					version: 1,
					settings: options.defaults,
					completed: [
						{
							id,
							questionId: 'old',
							attemptId: 'old-attempt',
							[key]: path,
							cardCount: 2,
							confirmedAt: 2000,
						},
					],
				}),
			);
			const restored = await CaptureController.create(options);
			expect(restored.state.get().completed[0]).toMatchObject({
				path,
				completedAt: 2000,
			});
			expect(restored.state.get().storageError).toBeUndefined();
			await restored.dispose();
		},
	);
	it('preserves malformed/newer journals and rejects path traversal and symlink escapes', async () => {
		const { capture, root, appDir, options, readCards } = await setup();
		await capture.dispose();
		const path = join(appDir, 'capture.json');
		await writeFile(path, '{"version":999}');
		const broken = await CaptureController.create(options);
		expect(broken.state.get().storageError).toContain('preserved');
		await expect(broken.start(answeredQuestion(), [])).rejects.toThrow(
			'Restore',
		);
		expect(await readFile(path, 'utf8')).toBe('{"version":999}');
		for (const collectionFolder of [
			'../escape',
			'/outside',
			'.obsidian/records',
			'a/../b',
		])
			expect(() =>
				options.validateSettings({ ...options.defaults, collectionFolder }),
			).toThrow();
		await rm(path);
		const restored = await CaptureController.create(options);
		await symlink(appDir, join(root, 'linked'));
		await restored.configure({
			...options.defaults,
			collectionFolder: 'linked',
		});
		await restored.start(answeredQuestion(), []);
		readCards.mockResolvedValue(cardSnapshot('one'));
		await expect(restored.stop()).rejects.toThrow('configuration');
		expect(restored.state.get().pending?.phase).toBe('saving');
		await restored.dispose();
	});
});

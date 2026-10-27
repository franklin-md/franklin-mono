import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { readMochiCards } from '../read.js';
import { decodeTransit } from '../decode.js';
import { readMochiDraftIds } from '../drafts.js';
import { createMochiFixture } from './fixture.js';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
	for (const dispose of cleanup.splice(0)) await dispose();
});
async function fixture() {
	const directory = await mkdtemp(join(tmpdir(), 'franklin-mochi-'));
	const path = join(directory, 'mochi.db');
	const result = await createMochiFixture(path);
	cleanup.push(async () => {
		result.database.close();
		await rm(directory, { recursive: true, force: true });
	});
	return { ...result, path };
}
const fields = (created: unknown, content = 'Card') => ({
	'~:created-at': { '~#dt': created },
	'~:content': content,
});

const hasSqlite = await import('node:sqlite').then(
	() => true,
	() => false,
);
describe.skipIf(!hasSqlite)('read-only Mochi capture', () => {
	it('captures an open draft first saved during recording and excludes the next empty draft and edits to older saved cards', async () => {
		const { put, path } = await fixture();
		// Mochi's save-and-new flow creates the next empty document immediately.
		// Its created-at precedes authoring; updated-at records the eventual Save.
		put('open-draft', { ...fields(90, ''), '~:new?': true });
		put('older-card', { ...fields(80, 'Existing card'), '~:new?': false });
		put('trashed-draft', {
			...fields(90, ''),
			'~:new?': true,
			'~:trashed?': true,
		});
		put(
			'deleted-draft',
			{ ...fields(90, ''), '~:new?': true },
			{ deleted: true },
		);
		const draftIds = await readMochiDraftIds(path);
		expect(draftIds).toEqual(['open-draft']);
		put('open-draft', {
			...fields(90, 'Stack down\n---\nHeap up'),
			'~:updated-at': { '~#dt': 150 },
			'~:new?': false,
		});
		put('older-card', {
			...fields(80, 'Edited existing card'),
			'~:updated-at': { '~#dt': 150 },
			'~:new?': false,
		});
		put('next-empty-draft', { ...fields(150, ''), '~:new?': true });
		const { cards } = await readMochiCards(path, 100, 200, draftIds);
		expect(cards.map((card) => card.id)).toEqual(['open-draft']);
		expect(cards[0]).toMatchObject({
			content: 'Stack down\n---\nHeap up',
			createdAt: 90,
			updatedAt: 150,
			matchedBy: 'draft-saved-in-window',
		});
	});
	it('keeps draft saves inside the original half-open window and does not infer earlier drafts without a baseline', async () => {
		const { put, path } = await fixture();
		for (const [id, updatedAt] of [
			['before', 99],
			['start', 100],
			['end', 200],
		] as const)
			put(id, {
				...fields(50, `Saved ${id}`),
				'~:id': `~:${id}`,
				'~:new?': false,
				'~:updated-at': { '~#dt': updatedAt },
			});
		const snapshot = await readMochiCards(path, 100, 200, [
			'before',
			'start',
			'end',
		]);
		expect(snapshot.cards.map((card) => card.id)).toEqual(['start']);
		expect(snapshot.captureVersion).toBe(4);
		expect((await readMochiCards(path, 100, 200)).cards).toEqual([]);
	});
	it('fails rather than losing a tracked draft whose saved timestamp cannot be interpreted', async () => {
		const { put, path } = await fixture();
		put('draft', { ...fields(50, 'Saved'), '~:new?': false });
		await expect(readMochiCards(path, 100, 200, ['draft'])).rejects.toThrow(
			'Could not read',
		);
	});
	it('uses [start,end), winning revisions and current content, excluding older edited, deleted and trashed cards but retaining archived cards', async () => {
		const { put, path } = await fixture();
		put('before', { ...fields(99), '~:updated-at': { '~#dt': 150 } });
		put('start', fields(100, 'First version'));
		put('start', {
			...fields(100, 'Final content'),
			'~:template-id': null,
			'~:fields': null,
		});
		put('start', fields(100, 'Losing branch'), { winning: false });
		put('inside', { ...fields(150), '~:archived?': true });
		put('end', fields(200));
		put('trashed', { ...fields(150), '~:trashed?': true });
		put('deleted', fields(150));
		put('deleted', {}, { deleted: true });
		const databaseBefore = await readFile(path);
		const walBefore = await readFile(`${path}-wal`);
		const snapshot = await readMochiCards(path, 100, 200);
		expect(snapshot.cards.map((card) => card.id)).toEqual(['start', 'inside']);
		expect(snapshot.cards[0]?.content).toBe('Final content');
		expect(snapshot.cards[1]?.raw['archived?']).toBe(true);
		expect(snapshot.snapshotAt).toBeGreaterThanOrEqual(
			snapshot.snapshotStartedAt,
		);
		expect(await readFile(path)).toEqual(databaseBefore);
		expect(await readFile(`${path}-wal`)).toEqual(walBefore);
	});
	it('retains template fields, template/deck context and attachment references with explicit asset limits', async () => {
		const { put, path } = await fixture();
		put('deck', { '~:name': 'Systems' }, { type: 'deck' });
		put(
			'template',
			{
				'~:content': '<< Front >>\n---\n<< Back >>',
				'~:fields': { '~:f': { '~:name': 'Front' } },
			},
			{ type: 'template' },
		);
		put('templated', {
			...fields(150, ''),
			'~:deck-id': '~:deck',
			'~:template-id': '~:template',
			'~:fields': { '~:f': { '~:value': 'Why recheck?' } },
			'~:attachments': { '~#set': ['image.png'] },
		});
		const { cards } = await readMochiCards(path, 100, 200);
		expect(cards[0]).toMatchObject({
			id: 'templated',
			content: '',
			fields: { f: { value: 'Why recheck?' } },
			deck: { name: 'Systems' },
			template: { content: '<< Front >>\n---\n<< Back >>' },
			attachments: { references: ['image.png'], assets: 'not-copied' },
			missing: [],
		});
	});
	it('fails visibly for unsupported timestamps even outside the window, missing databases and unsupported schemas', async () => {
		const { put, path, database } = await fixture();
		put('unsupported', fields('150'));
		await expect(readMochiCards(path, 100, 200)).rejects.toThrow(
			'Could not read',
		);
		database.exec('DROP TABLE "document-store"');
		await expect(readMochiCards(path, 100, 200)).rejects.toThrow(
			'Could not read',
		);
		await expect(readMochiCards(`${path}.missing`, 100, 200)).rejects.toThrow();
		await expect(readFile(`${path}.missing`)).rejects.toThrow();
	});
	it('reports locked reads without treating them as an empty set', async () => {
		const { path, database } = await fixture();
		database.exec(
			'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE; BEGIN EXCLUSIVE;',
		);
		try {
			await expect(readMochiCards(path, 100, 200)).rejects.toThrow(
				'Could not read',
			);
		} finally {
			database.exec('ROLLBACK');
		}
	});
	it('rejects backwards/invalid clocks and unknown Transit forms', async () => {
		await expect(readMochiCards('/missing', 200, 100)).rejects.toThrow('clock');
		await expect(readMochiCards('/missing', NaN, 100)).rejects.toThrow(
			'Invalid',
		);
		expect(
			decodeTransit({
				'~:fields': { '~:f': { '~:value': '~~literal' } },
				'~:when': { '~#dt': 123 },
				'~:tags': { '~#set': ['~:x'] },
			}),
		).toEqual({ fields: { f: { value: '~literal' } }, when: 123, tags: ['x'] });
		expect(() => decodeTransit({ '~#unsupported': [] })).toThrow('Unsupported');
	});
});

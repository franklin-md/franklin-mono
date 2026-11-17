import {
	MemoryFilesystem,
	createMapFilePersister,
	jsonCodec,
	versioned,
	type AbsolutePath,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../../../modules/store/api/create.js';
import { StoreRegistry } from '../../../../modules/store/api/registry/index.js';
import { createStoreResult } from '../../../../modules/store/api/registry/result.js';
import type { StoreSnapshot } from '../../../../modules/store/api/registry/snapshot.js';
import { createStoreRuntime } from '../../../../modules/store/runtime.js';
import { sha256Hex } from '../../hash.js';
import { createFileControl } from '../control.js';
import { fileKey } from '../key.js';
import type { FileRecord, FileSnapshot } from '../types.js';

const path = '/note.md' as AbsolutePath;
const encode = (text: string) => new TextEncoder().encode(text);

describe('file control freshness', () => {
	it.each([
		['unrelated changes', 'user above\ntarget\nuser below', false],
		['changed target suffix', 'above\ntarget USER\nbelow', true],
		['shifted target', 'inserted\nabove\ntarget\nbelow', true],
		['deleted target', 'above\nbelow', true],
		['new occurrence elsewhere', 'above\ntarget\ntarget', false],
		['changed line endings', '\uFEFFabove\r\ntarget\r\nuser below', false],
	] as const)(
		'checks whole target lines after %s',
		async (_name, current, changed) => {
			const fs = new MemoryFilesystem();
			const store = createStore<FileRecord>({});
			const file = createFileControl(store);
			await file.markFileRead(fs, path, 'above\ntarget\nbelow');
			const saved = store.get();

			expect(await file.changedSinceRead(fs, path, encode(current))).toBe(true);
			expect(
				await file.changedSinceRead(fs, path, encode(current), {
					startLine: 2,
					endLine: 2,
				}),
			).toBe(changed);
			expect(store.get()).toBe(saved);
		},
	);

	it('checks every line in an inclusive range', async () => {
		const fs = new MemoryFilesystem();
		const file = createFileControl(createStore<FileRecord>({}));
		await file.markFileRead(fs, path, 'above\nfirst\nlast\nbelow');
		expect(
			await file.changedSinceRead(
				fs,
				path,
				encode('above\nfirst\nlast USER\nbelow'),
				{
					startLine: 2,
					endLine: 3,
				},
			),
		).toBe(true);
	});

	it.each([
		{ startLine: 0, endLine: 1 },
		{ startLine: 2, endLine: 1 },
		{ startLine: 1.5, endLine: 2 },
		{ startLine: 1, endLine: 4 },
	])('rejects an invalid range: %j', async (range) => {
		const fs = new MemoryFilesystem();
		const file = createFileControl(createStore<FileRecord>({}));
		const bytes = encode('above\ntarget\nbelow');
		await file.markFileRead(fs, path, bytes);
		await expect(file.changedSinceRead(fs, path, bytes, range)).rejects.toThrow(
			/range/i,
		);
	});

	it('rejects never-read files without reading or recording current bytes', async () => {
		const fs = new MemoryFilesystem();
		const read = vi.spyOn(fs, 'readFile');
		const store = createStore<FileRecord>({});
		const file = createFileControl(store);
		await expect(
			file.changedSinceRead(fs, path, encode('current')),
		).rejects.toThrow(/never read/);
		expect(store.get()).toEqual({});
		expect(read).not.toHaveBeenCalled();
	});

	it('uses the supplied bytes rather than rereading the file', async () => {
		const fs = new MemoryFilesystem();
		const file = createFileControl(createStore<FileRecord>({}));
		await file.markFileRead(fs, path, 'target');
		fs.seed(path, 'newer disk content');
		const read = vi.spyOn(fs, 'readFile');
		expect(await file.changedSinceRead(fs, path, encode('target'))).toBe(false);
		expect(read).not.toHaveBeenCalled();
	});

	it('requires whole-file freshness for hash-only snapshots even with a range', async () => {
		const fs = new MemoryFilesystem();
		const file = createFileControl(
			createStore<FileRecord>({
				[path]: { hash: sha256Hex(encode('above\ntarget')) },
			}),
		);
		expect(
			await file.changedSinceRead(fs, path, encode('above\ntarget'), {
				startLine: 2,
				endLine: 2,
			}),
		).toBe(false);
		expect(
			await file.changedSinceRead(fs, path, encode('user above\ntarget'), {
				startLine: 2,
				endLine: 2,
			}),
		).toBe(true);
	});
});

describe('file record migration', () => {
	it('upgrades restored hash strings once, persists them, and preserves existing snapshots', async () => {
		const fs = new MemoryFilesystem();
		const dir = '/stores' as AbsolutePath;
		const persister = createMapFilePersister(
			fs,
			dir,
			versioned().version(1, jsonCodec<StoreSnapshot>()).build(),
		);
		const legacyHash = sha256Hex(encode('above\ntarget'));
		const legacy: Record<string, string | FileSnapshot> = {
			[path]: legacyHash,
			'/text.md': { hash: 'text-hash', text: 'retained text' },
			'/binary': { hash: 'binary-hash' },
		};
		await persister.save('file-record', {
			ref: 'file-record',
			sharing: 'private',
			value: legacy,
		});
		const registry = new StoreRegistry(persister);
		expect(await registry.restore()).toEqual({ issues: [] });
		const runtime = createStoreRuntime(
			createStoreResult(registry, { last_read: 'file-record' }),
		);
		const store = runtime.getStore(fileKey);
		const file = createFileControl(store);
		const upgraded = {
			...legacy,
			[path]: { hash: legacyHash },
		};
		expect(store.get()).toEqual(upgraded);
		expect(
			await file.changedSinceRead(fs, path, encode('user above\ntarget'), {
				startLine: 2,
				endLine: 2,
			}),
		).toBe(true);
		await vi.waitFor(async () => {
			const saved = await persister.load();
			expect(saved.values.get('file-record')?.value).toEqual(upgraded);
		});

		const restored = new StoreRegistry(persister);
		await restored.restore();
		const restoredStore = createStoreRuntime(
			createStoreResult(restored, { last_read: 'file-record' }),
		).getStore(fileKey);
		const listener = vi.fn();
		restoredStore.subscribe(listener);
		createFileControl(restoredStore);
		createFileControl(restoredStore);
		expect(restoredStore.get()).toEqual(upgraded);
		expect(listener).not.toHaveBeenCalled();
	});
});

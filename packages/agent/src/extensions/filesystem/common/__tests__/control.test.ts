import { MemoryFilesystem, type AbsolutePath } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../../../modules/store/api/create.js';
import { sha256Hex } from '../../hash.js';
import { createFileControl } from '../control.js';
import type { FileRecord } from '../types.js';

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
		['current file becomes hash-only', 'above\ntarget\nbelow\0', true],
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

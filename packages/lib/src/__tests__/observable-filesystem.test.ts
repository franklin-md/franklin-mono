import { describe, expect, it, vi } from 'vitest';

import { createObservableFilesystem } from '../filesystem/observable/create.js';
import type { Filesystem } from '../filesystem/types.js';
import { MemoryFilesystem } from '../filesystem/memory.js';
import { toAbsolutePath } from '../paths/index.js';

const PATH = toAbsolutePath('/vault/note.md');

function wrapReadFile(
	base: Filesystem,
	readFile: Filesystem['readFile'],
): Filesystem {
	return {
		resolve: base.resolve.bind(base),
		readFile,
		writeFile: base.writeFile.bind(base),
		mkdir: base.mkdir.bind(base),
		access: base.access.bind(base),
		stat: base.stat.bind(base),
		readdir: base.readdir.bind(base),
		exists: base.exists.bind(base),
		glob: base.glob.bind(base),
		deleteFile: base.deleteFile.bind(base),
	};
}

function bytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

describe('createObservableFilesystem', () => {
	it('emits prev + next when the file existed before the write', async () => {
		const mem = new MemoryFilesystem();
		mem.seed(PATH, 'before');

		const fs = createObservableFilesystem(mem);
		const listener = vi.fn();
		fs.onWrite(listener);

		await fs.writeFile(PATH, 'after');

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(
			PATH,
			bytes('before'),
			bytes('after'),
		);
		// Write actually landed on disk.
		expect(await mem.readFile(PATH)).toEqual(bytes('after'));
	});

	it('emits prev=null when the file did not exist (created)', async () => {
		const mem = new MemoryFilesystem();
		const fs = createObservableFilesystem(mem);
		const listener = vi.fn();
		fs.onWrite(listener);

		await fs.writeFile(PATH, 'fresh');

		expect(listener).toHaveBeenCalledWith(PATH, null, bytes('fresh'));
	});

	it('normalizes Uint8Array writes: next payload is the bytes written', async () => {
		const mem = new MemoryFilesystem();
		const fs = createObservableFilesystem(mem);
		const listener = vi.fn();
		fs.onWrite(listener);

		const payload = bytes('raw');
		await fs.writeFile(PATH, payload);

		expect(listener).toHaveBeenCalledWith(PATH, null, payload);
	});

	it('emits for every write (no dedup in the primitive)', async () => {
		const mem = new MemoryFilesystem();
		const fs = createObservableFilesystem(mem);
		const listener = vi.fn();
		fs.onWrite(listener);

		await fs.writeFile(PATH, 'one');
		await fs.writeFile(PATH, 'two');

		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenNthCalledWith(1, PATH, null, bytes('one'));
		expect(listener).toHaveBeenNthCalledWith(
			2,
			PATH,
			bytes('one'),
			bytes('two'),
		);
	});

	it('notifies AFTER the inner write has landed', async () => {
		const mem = new MemoryFilesystem();
		const fs = createObservableFilesystem(mem);
		// MemoryFilesystem.has() is sync, so the listener can observe
		// whether the write has already landed by the time notify fires.
		let onDiskAtNotify = false;
		fs.onWrite((p) => {
			onDiskAtNotify = mem.has(p);
		});

		await fs.writeFile(PATH, 'landed');

		expect(onDiskAtNotify).toBe(true);
	});

	it('unsubscribe stops future notifications', async () => {
		const mem = new MemoryFilesystem();
		const fs = createObservableFilesystem(mem);
		const listener = vi.fn();

		const off = fs.onWrite(listener);
		await fs.writeFile(PATH, 'one');
		off();
		await fs.writeFile(PATH, 'two');

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('falls back to prev=null and warns when pre-read fails non-ENOENT', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const mem = new MemoryFilesystem();
		mem.seed(PATH, 'ignored');
		const throwing = wrapReadFile(mem, () =>
			Promise.reject(new Error('EACCES: permission denied')),
		);

		const fs = createObservableFilesystem(throwing);
		const listener = vi.fn();
		fs.onWrite(listener);

		await fs.writeFile(PATH, 'after');

		expect(listener).toHaveBeenCalledWith(PATH, null, bytes('after'));
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('passes non-write operations through to the inner filesystem', async () => {
		const mem = new MemoryFilesystem();
		mem.seed(PATH, 'hello');
		mem.seedDir(toAbsolutePath('/vault'));

		const fs = createObservableFilesystem(mem);

		expect(await fs.readFile(PATH)).toEqual(bytes('hello'));
		expect(await fs.exists(PATH)).toBe(true);
		expect((await fs.stat(PATH)).isFile).toBe(true);
		expect(await fs.readdir(toAbsolutePath('/vault'))).toEqual(['note.md']);

		await fs.deleteFile(PATH);
		expect(await fs.exists(PATH)).toBe(false);
	});
});

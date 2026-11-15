import { compile } from '@franklin/extensibility';
import {
	createMapFilePersister,
	DebouncedPersister,
	jsonCodec,
	MemoryFilesystem,
	toAbsolutePath,
	versioned,
	type JsonObject,
	type JsonValue,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { StoreRegistry } from '../../../../modules/store/api/registry/index.js';
import type { StoreSnapshot } from '../../../../modules/store/api/registry/snapshot.js';
import { createStoreModule } from '../../../../modules/store/module.js';
import { editExtension } from '../../edit/extension.js';
import { sha256Hex } from '../../hash.js';
import { createFileControl } from '../control.js';
import { fileKey } from '../key.js';

const path = toAbsolutePath('/note.md');
const content = new TextEncoder().encode('above\ntarget');

function compileFileStore(registry: StoreRegistry) {
	const module = createStoreModule(registry, { last_read: 'file-record' });
	return compile(module.extensionPoint, module.compiler, (api) => {
		// Exercise the real store registration without compiling tool handlers.
		editExtension()({ ...api, on: vi.fn(), registerTool: vi.fn() });
	});
}

async function restoreFileStore(value: JsonValue, schemaVersion?: number) {
	const fs = new MemoryFilesystem();
	const dir = toAbsolutePath('/stores');
	const persister = createMapFilePersister(
		fs,
		dir,
		versioned().version(1, jsonCodec<StoreSnapshot>()).build(),
	);
	await persister.save('file-record', {
		ref: 'file-record',
		sharing: 'private',
		value,
		...(schemaVersion === undefined ? {} : { schemaVersion }),
	});
	const storePath = toAbsolutePath('/stores/file-record.json');
	const original = await fs.readFile(storePath);
	const open = () => new StoreRegistry(new DebouncedPersister(persister));
	const registry = open();
	await registry.restore();
	return { fs, persister, registry, open, storePath, original };
}

describe('file record store codec', () => {
	it('upgrades mixed legacy values before file-control access and persists the upgrade', async () => {
		const legacyHash = sha256Hex(content);
		const legacy: JsonObject = {
			[path]: legacyHash,
			'/text.md': { hash: 'text-hash', text: 'retained text' },
			'/binary': { hash: 'binary-hash' },
		};
		const fixture = await restoreFileStore(legacy);
		const originalStore = fixture.registry.get('file-record').store;
		const runtime = await compileFileStore(fixture.registry);
		const store = runtime.getStore(fileKey);
		const upgraded = { ...legacy, [path]: { hash: legacyHash } };

		expect(store).toBe(originalStore);
		expect(store.get()).toEqual(upgraded);
		expect((await fixture.persister.load()).values.get('file-record')).toEqual({
			ref: 'file-record',
			sharing: 'private',
			schemaVersion: 1,
			value: upgraded,
		});
		const file = createFileControl(store);
		expect(await file.changedSinceRead(fixture.fs, path, content)).toBe(false);
		expect(
			await file.changedSinceRead(
				fixture.fs,
				path,
				new TextEncoder().encode('user above\ntarget'),
				{ startLine: 2, endLine: 2 },
			),
		).toBe(true);

		const restored = fixture.open();
		await restored.restore();
		const writes = vi.spyOn(fixture.fs, 'writeFile');
		const again = await compileFileStore(restored);
		expect(again.getStore(fileKey).get()).toEqual(upgraded);
		expect(writes).not.toHaveBeenCalled();
	});

	it.each([undefined, 1])(
		'preserves existing snapshot objects at schema version %s',
		async (schemaVersion) => {
			const value: JsonObject = {
				[path]: { hash: sha256Hex(content), text: 'above\ntarget' },
				'/binary': { hash: 'binary-hash' },
			};
			const fixture = await restoreFileStore(value, schemaVersion);
			const runtime = await compileFileStore(fixture.registry);
			expect(runtime.getStore(fileKey).get()).toEqual(value);
			expect(fixture.registry.get('file-record').schemaVersion).toBe(1);
			const listener = vi.fn();
			runtime.getStore(fileKey).subscribe(listener);
			createFileControl(runtime.getStore(fileKey));
			createFileControl(runtime.getStore(fileKey));
			expect(listener).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ value: { [path]: { hash: 7 } }, schemaVersion: undefined },
		{ value: { [path]: { hash: 'hash', text: 7 } }, schemaVersion: 1 },
		{ value: { [path]: 'legacy-hash' }, schemaVersion: 1 },
		{ value: { [path]: { hash: 'hash' } }, schemaVersion: 2 },
	])(
		'preserves invalid or future data: $schemaVersion, $value',
		async ({ value, schemaVersion }) => {
			const fixture = await restoreFileStore(value, schemaVersion);
			const entry = fixture.registry.get('file-record');
			await expect(compileFileStore(fixture.registry)).rejects.toThrow(
				/Store "last_read".*file-record.*(schema-mismatch|version-ahead)/,
			);
			expect(entry.store.get()).toEqual(value);
			expect(entry.schemaVersion).toBe(schemaVersion);
			expect(entry.codec).toBeUndefined();
			expect(await fixture.fs.readFile(fixture.storePath)).toEqual(
				fixture.original,
			);
		},
	);
});

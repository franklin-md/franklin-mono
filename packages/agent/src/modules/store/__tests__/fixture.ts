import { compile } from '@franklin/extensibility';
import type { Extension } from '@franklin/extensibility';
import { joinAbsolute, MemoryFilesystem, toAbsolutePath } from '@franklin/lib';
import type { JsonValue } from '@franklin/lib';
import { franklinSessionCodec } from '../../../app/session/codecs/index.js';
import { createStorage } from '../../../storage/create-storage.js';
import type { StoreAPI } from '../api/api.js';
import type { StoreMapping } from '../api/registry/mapping.js';
import type { StoreRegistry } from '../api/registry/index.js';
import { createStoreModule } from '../module.js';

export function createStoreFixture(value?: JsonValue, schemaVersion?: number) {
	const fs = new MemoryFilesystem();
	const appDir = toAbsolutePath('/app');
	const ref = 'counter-ref';
	const path = joinAbsolute(appDir, 'store', `${ref}.json`);
	const original = JSON.stringify({
		version: 1,
		data: {
			ref,
			sharing: 'shared',
			value,
			...(schemaVersion === undefined ? {} : { schemaVersion }),
		},
	});
	if (value !== undefined) {
		fs.seedDir(joinAbsolute(appDir, 'store'));
		fs.seed(path, original);
	}
	const open = () =>
		createStorage(fs, appDir, { sessionCodec: franklinSessionCodec });
	const storage = open();

	return {
		fs,
		appDir,
		ref,
		path,
		original,
		storage,
		open,
		async read() {
			return new TextDecoder().decode(await fs.readFile(path));
		},
		compile(
			registry: StoreRegistry,
			extension: Extension<StoreAPI>,
			mapping: StoreMapping = value === undefined ? {} : { counter: ref },
		) {
			const module = createStoreModule(registry, mapping);
			return compile(module.extensionPoint, module.compiler, extension);
		},
	};
}

import type { BaseState } from '../modules/state/index.js';
import type {
	AbsolutePath,
	Codec,
	Filesystem,
	RestoreResult,
} from '@franklin/lib';
import {
	createMapFilePersister,
	DebouncedPersister,
	jsonCodec,
	joinAbsolute,
	versioned,
} from '@franklin/lib';
import {
	StoreRegistry,
	type StoreSnapshot,
} from '../modules/store/api/index.js';
import { createSettingsStore } from './settings.js';
import type { Storage } from './types.js';

type CreateStorageOptions<S extends BaseState> = {
	readonly sessionCodec: Codec<S>;
};

export function createStorage<S extends BaseState>(
	filesystem: Filesystem,
	appDir: AbsolutePath,
	opts: CreateStorageOptions<S>,
): Storage<S> {
	const settings = createSettingsStore(filesystem, appDir);
	const sessions = new DebouncedPersister(
		createMapFilePersister<S>(
			filesystem,
			joinAbsolute(appDir, 'sessions'),
			opts.sessionCodec,
		),
		500,
	);

	const storeCodec = versioned().version(1, jsonCodec<StoreSnapshot>()).build();
	const storePersister = new DebouncedPersister(
		createMapFilePersister<StoreSnapshot>(
			filesystem,
			joinAbsolute(appDir, 'store'),
			storeCodec,
		),
		500,
	);
	const stores = new StoreRegistry(storePersister);

	return {
		settings,
		sessions,
		stores,
		async restore(): Promise<RestoreResult> {
			const [a, b] = await Promise.all([settings.restore(), stores.restore()]);
			return { issues: [...a.issues, ...b.issues] };
		},
	};
}

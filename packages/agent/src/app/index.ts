import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	SessionTree,
	createRuntime,
	systems,
	createSessionSystem,
	type RuntimeSystem,
	SessionCollection,
} from '@franklin/extensions';
import { PersistedSessionCollection } from '../agent/session/registry.js';
import { createPersistence } from '../agent/session/persist/file-persister.js';
import { withAuth, syncAuth } from '../auth/with-auth.js';
import {
	createSettings,
	loadSettings,
	addPersistOnChange,
} from '../settings/store.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import type { IAuthManager } from '../auth/types.js';
import type {
	FranklinState,
	FranklinAPI,
	FranklinRuntime,
	FranklinExtension,
} from '../types.js';

export class FranklinApp {
	readonly auth: IAuthManager;
	readonly settings: SettingsStore;
	// TODO: Maybe rename?
	readonly agents: SessionTree<FranklinState, FranklinRuntime>;

	private readonly platform: Platform;
	private readonly storeRegistry: StoreRegistry;

	constructor(opts: {
		extensions: FranklinExtension[];
		platform: Platform;
		auth: IAuthManager;
		persistDir?: string;
	}) {
		const { extensions, platform, auth, persistDir } = opts;
		this.auth = auth;
		this.platform = platform;
		this.settings = createSettings();

		const persistence = persistDir
			? createPersistence<FranklinState>(persistDir, platform.filesystem)
			: undefined;

		this.storeRegistry = new StoreRegistry(persistence?.store);
		const registry = persistence?.session
			? new PersistedSessionCollection<FranklinState, FranklinRuntime>(
					persistence.session,
				)
			: new SessionCollection<FranklinRuntime>();

		const coreSystem = withAuth(createCoreSystem(platform.spawn), auth);

		this.agents = new SessionTree<FranklinState, FranklinRuntime>({
			collection: registry,
			emptyState: () => system.emptyState(),
			spawn: (state) => createRuntime(system, state, extensions),
			getId: (state) => state.session.id,
		});
		const system: RuntimeSystem<FranklinState, FranklinAPI, FranklinRuntime> =
			systems(coreSystem)
				.add(createStoreSystem(this.storeRegistry))
				.add(createEnvironmentSystem(platform.environment))
				.add(createSessionSystem(this.agents))
				.done();
	}

	async start(): Promise<void> {
		await loadSettings(this.settings, this.platform.filesystem);
		addPersistOnChange(this.settings, this.platform.filesystem);
		syncAuth(
			() => this.agents.list().map((session) => session.runtime),
			this.auth,
		);
		await this.storeRegistry.restore();

		/*
	}
}

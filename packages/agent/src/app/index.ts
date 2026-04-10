import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
	SessionCollection,
	createSessionManager,
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
	FranklinRuntime,
	FranklinExtension,
} from '../types.js';
import { createAgents, type Agents } from './agents.js';

export class FranklinApp {
	readonly auth: IAuthManager;
	readonly settings: SettingsStore;
	readonly agents: Agents;

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
		const collection = persistence?.session
			? new PersistedSessionCollection<FranklinState, FranklinRuntime>(
					persistence.session,
				)
			: new SessionCollection<FranklinRuntime>();

		// Static base system — shared across all sessions
		const baseSystem = systems(withAuth(createCoreSystem(platform.spawn), auth))
			.add(createStoreSystem(this.storeRegistry))
			.add(createEnvironmentSystem(platform.environment))
			.done();

		// Session manager — wraps base system, handles per-session session system internally
		const manager = createSessionManager({
			system: baseSystem,
			collection,
			extensions,
		});

		this.agents = createAgents(manager.create, collection);
	}

	async start(): Promise<void> {
		await loadSettings(this.settings, this.platform.filesystem);
		addPersistOnChange(this.settings, this.platform.filesystem);
		syncAuth(
			() => this.agents.list().map((session) => session.runtime),
			this.auth,
		);
		await this.storeRegistry.restore();
	}
}

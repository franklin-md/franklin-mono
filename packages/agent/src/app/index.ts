import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
	createSessionManager,
} from '@franklin/extensions';
import type { SessionManager } from '@franklin/extensions';
import { PersistedSessionCollection } from '../agent/session/persisted-session-collection.js';
import { createPersistence } from '../agent/session/persist/file-persister.js';
import { withAuth } from '../auth/with-auth.js';
import { createSettings } from '../settings/store.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import { AuthManager } from '../auth/manager.js';
import { restoreAll } from './restorable.js';
import type {
	BaseSystem,
	FranklinState,
	FranklinRuntime,
	FranklinExtension,
} from '../types.js';
import { createAgents, type Agents } from './agents.js';

export class FranklinApp {
	readonly auth: AuthManager;
	readonly settings: SettingsStore;
	readonly agents: Agents;
	readonly platform: Platform;

	private readonly storeRegistry: StoreRegistry;
	private readonly manager: SessionManager<BaseSystem>;
	private readonly collection: PersistedSessionCollection<
		FranklinState,
		FranklinRuntime
	>;

	constructor(opts: {
		extensions: FranklinExtension[];
		platform: Platform;
		persistDir: string;
	}) {
		const { extensions, platform, persistDir } = opts;
		this.auth = new AuthManager(platform);
		this.platform = platform;
		this.settings = createSettings(platform.filesystem);

		const persistence = createPersistence<FranklinState>(
			persistDir,
			platform.filesystem,
		);

		this.storeRegistry = new StoreRegistry(persistence.store);
		this.collection = new PersistedSessionCollection<
			FranklinState,
			FranklinRuntime
		>(persistence.session);

		// Static base system — shared across all sessions
		const baseSystem = systems(
			withAuth(createCoreSystem(platform.spawn), this.auth),
		)
			.add(createStoreSystem(this.storeRegistry))
			.add(createEnvironmentSystem(platform.environment))
			.done();

		// Session manager — wraps base system, handles per-session session system internally
		this.manager = createSessionManager({
			system: baseSystem,
			collection: this.collection,
			extensions,
		});

		this.agents = createAgents(
			this.manager.create.bind(this.manager),
			this.collection,
		);
	}

	async start(): Promise<void> {
		await restoreAll(this.auth, this.settings, this.storeRegistry);
		await this.collection.restore((id, state) =>
			this.manager.materialize(id, state),
		);
	}
}

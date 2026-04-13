import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
	SessionCollection,
	createSessionManager,
} from '@franklin/extensions';
import type { SessionManager } from '@franklin/extensions';
import { PersistedSessionCollection } from '../agent/session/persisted-session-collection.js';
import { createPersistence } from '../agent/session/persist/file-persister.js';
import { withAuth, syncAuth } from '../auth/with-auth.js';
import {
	createSettings,
	loadSettings,
	addPersistOnChange,
} from '../settings/store.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import type {
	BaseSystem,
	FranklinState,
	FranklinRuntime,
	FranklinExtension,
} from '../types.js';
import { createAgents, type Agents } from './agents.js';

export class FranklinApp {
	readonly auth: Platform['auth'];
	readonly settings: SettingsStore;
	readonly agents: Agents;

	private readonly platform: Platform;
	private readonly storeRegistry: StoreRegistry;
	private readonly manager: SessionManager<BaseSystem>;
	private readonly persistedCollection?: PersistedSessionCollection<
		FranklinState,
		FranklinRuntime
	>;

	constructor(opts: {
		extensions: FranklinExtension[];
		platform: Platform;
		persistDir?: string;
	}) {
		const { extensions, platform, persistDir } = opts;
		this.auth = platform.auth;
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

		if (collection instanceof PersistedSessionCollection) {
			this.persistedCollection = collection;
		}

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
			collection,
			extensions,
		});

		this.agents = createAgents(
			this.manager.create.bind(this.manager),
			collection,
		);
	}

	async start(): Promise<void> {
		await loadSettings(this.settings, this.platform.filesystem);
		addPersistOnChange(this.settings, this.platform.filesystem);
		syncAuth(
			() => this.agents.list().map((session) => session.runtime),
			this.auth,
		);
		await this.storeRegistry.restore();

		// Rehydrate persisted sessions
		if (this.persistedCollection) {
			await this.persistedCollection.restore((id, state) =>
				this.manager.materialize(id, state),
			);
		}
	}
}

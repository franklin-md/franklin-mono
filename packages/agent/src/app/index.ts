import {
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
	createSessionManager,
} from '@franklin/extensions';
import type { SessionManager } from '@franklin/extensions';
import type { AbsolutePath, RestoreResult } from '@franklin/lib';
import { PersistedSessionCollection } from '../agent/session/persisted-session-collection.js';
import { withAuth } from '../auth/with-auth.js';
import { AuthManager } from '../auth/manager.js';
import { createStorage } from '../storage/create-storage.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import type {
	BaseSystem,
	FranklinState,
	FranklinRuntime,
	FranklinExtension,
} from '../types.js';
import type { AuthStore } from '../storage/types.js';
import { createAgents, type Agents } from './agents.js';

export class FranklinApp {
	readonly auth: AuthManager;
	readonly settings: SettingsStore;
	readonly agents: Agents;
	readonly platform: Platform;

	private readonly manager: SessionManager<BaseSystem>;
	private readonly collection: PersistedSessionCollection<
		FranklinState,
		FranklinRuntime
	>;
	private readonly restoreStorage: () => Promise<RestoreResult>;

	constructor(opts: {
		extensions: FranklinExtension[];
		platform: Platform;
		appDir: AbsolutePath;
		authStore?: AuthStore;
	}) {
		const { extensions, platform, appDir } = opts;
		const storage = createStorage<FranklinState>(
			platform.os.filesystem,
			appDir,
			{
				authStore: opts.authStore,
			},
		);

		this.auth = new AuthManager(platform, storage.auth);
		this.platform = platform;
		this.settings = storage.settings;
		this.restoreStorage = () => storage.restore();

		// Static base system — shared across all sessions
		const baseSystem = systems(
			withAuth(createCoreSystem(platform.spawn), this.auth),
		)
			.add(createStoreSystem(storage.stores))
			.add(createEnvironmentSystem(platform.environment))
			.done();

		this.collection = new PersistedSessionCollection<
			FranklinState,
			FranklinRuntime
		>(storage.sessions, (runtime) => baseSystem.state(runtime));

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

	async start(): Promise<RestoreResult> {
		const storageResult = await this.restoreStorage();
		const collectionResult = await this.collection.restore((id, state) =>
			this.manager.materialize(id, state),
		);
		return {
			issues: [...storageResult.issues, ...collectionResult.issues],
		};
	}
}

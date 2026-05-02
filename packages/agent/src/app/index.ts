import {
	createCoreModule,
	createStoreModule,
	createEnvironmentModule,
	modules,
	createOrchestrator,
} from '@franklin/extensions';
import type { Orchestrator } from '@franklin/extensions';
import type { AbsolutePath, RestoreResult } from '@franklin/lib';
import { PersistedSessionCollection } from '../agent/session/persisted-session-collection.js';
import { withAuth } from '../auth/with-auth.js';
import { AuthManager } from '../auth/manager.js';
import { createStorage } from '../storage/create-storage.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import type {
	BaseModule,
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

	private readonly orchestrator: Orchestrator<BaseModule>;
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

		const baseModule = modules(
			withAuth(createCoreModule(platform.spawn), this.auth),
		)
			.add(createStoreModule(storage.stores))
			.add(createEnvironmentModule(platform.environment))
			.done();

		this.collection = new PersistedSessionCollection<
			FranklinState,
			FranklinRuntime
		>(storage.sessions, (runtime) => baseModule.state(runtime));

		this.orchestrator = createOrchestrator({
			module: baseModule,
			collection: this.collection,
			extensions,
		});

		this.agents = createAgents(
			this.orchestrator.create.bind(this.orchestrator),
			this.collection,
		);
	}

	async start(): Promise<RestoreResult> {
		const storageResult = await this.restoreStorage();
		const collectionResult = await this.collection.restore((id, state) =>
			this.orchestrator.materialize(id, state),
		);
		return {
			issues: [...storageResult.issues, ...collectionResult.issues],
		};
	}
}

import {
	createConfigurationModule,
	createDependencyModule,
} from '@franklin/extensibility/module';
import type { AbsolutePath, RestoreResult } from '@franklin/lib';
import { createMiniACPRpcConnector } from '@franklin/mini-acp/rpc';
import { withAuth } from '../auth/with-auth.js';
import type { AuthManager } from '../auth/manager.js';
import { createCoreStateModule } from '../modules/core/module.js';
import { createEnvironmentModule } from '../modules/environment/module.js';
import {
	createOrchestrator,
	type Orchestrator,
} from '../modules/orchestrator/index.js';
import { createStoreStateModule } from '../modules/store/state-module.js';
import { createStorage } from '../storage/create-storage.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import type {
	FranklinBase,
	FranklinExtension,
	FranklinModules,
	FranklinRuntime,
} from '../types.js';
import {
	createSessionPersistence,
	type FranklinSession,
	type SessionPersistenceController,
} from './session/index.js';
import { franklinSessionCodec } from './session/codecs/index.js';

function observeSessionChanges(
	runtime: FranklinRuntime,
	listener: () => void,
): () => void {
	const unsubscribeCore = runtime.coreEvents.subscribe(() => {
		listener();
	});
	const unsubscribeEnvironment = runtime.environmentEvents.subscribe(() => {
		listener();
	});

	return () => {
		unsubscribeCore();
		unsubscribeEnvironment();
	};
}

export class FranklinApp {
	readonly auth: AuthManager;
	readonly settings: SettingsStore;
	readonly agents: Orchestrator<FranklinBase>;

	private readonly sessionPersistence: SessionPersistenceController;
	private readonly restoreStorage: () => Promise<RestoreResult>;

	constructor(opts: {
		extensions: readonly FranklinExtension[];
		platform: Platform;
		appDir: AbsolutePath;
		auth: AuthManager;
	}) {
		const { platform, appDir } = opts;
		const storage = createStorage<FranklinSession>(
			platform.os.filesystem,
			appDir,
			{
				sessionCodec: franklinSessionCodec,
			},
		);

		this.auth = opts.auth;
		this.settings = storage.settings;
		this.restoreStorage = () => storage.restore();
		const extensions = [...opts.extensions];

		const connectAgent = createMiniACPRpcConnector(platform.spawn);
		const baseModules: FranklinModules = [
			withAuth(createCoreStateModule(connectAgent), this.auth),
			createStoreStateModule(storage.stores),
			createEnvironmentModule(platform.environment),
			createDependencyModule('auth', this.auth),
			createConfigurationModule(),
		];
		this.agents = createOrchestrator({
			modules: baseModules,
			extensions,
		});
		this.sessionPersistence = createSessionPersistence({
			source: this.agents,
			persistedSessions: storage.sessions,
			observeSessionChanges,
		});
	}

	async start(): Promise<RestoreResult> {
		const [authResult, storageResult] = await Promise.all([
			this.auth.restore(),
			this.restoreStorage(),
		]);
		const collectionResult = await this.sessionPersistence.restore();
		return {
			issues: [
				...authResult.issues,
				...storageResult.issues,
				...collectionResult.issues,
			],
		};
	}
}

import { buildStateExtensionModule } from '../modules/state/index.js';
import type { AbsolutePath, RestoreResult } from '@franklin/lib';
import { createMiniACPRpcConnector } from '@franklin/mini-acp/rpc';
import { withAuth } from '../auth/with-auth.js';
import { AuthManager } from '../auth/manager.js';
import { createCoreStateModule } from '../modules/core/module.js';
import { createEnvironmentModule } from '../modules/environment/module.js';
import {
	createOrchestrator,
	type Orchestrator,
	RuntimeCollection,
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
import type { AuthStore } from '../storage/types.js';
import { createAgents, type Agents } from './agents.js';
import {
	createSessionPersistence,
	type FranklinSession,
	type SessionPersistenceController,
} from './session/index.js';
import { franklinSessionCodec } from './session/codecs/index.js';

export interface FranklinAppExtensionContext {
	readonly auth: AuthManager;
	readonly platform: Platform;
	readonly settings: SettingsStore;
}

export type FranklinAppExtensions =
	| readonly FranklinExtension[]
	| ((context: FranklinAppExtensionContext) => readonly FranklinExtension[]);

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
	readonly agents: Agents;
	readonly platform: Platform;

	private readonly orchestrator: Orchestrator<FranklinBase>;
	private readonly collection: RuntimeCollection<FranklinRuntime>;
	private readonly sessionPersistence: SessionPersistenceController<
		FranklinSession,
		FranklinRuntime
	>;
	private readonly restoreStorage: () => Promise<RestoreResult>;

	constructor(opts: {
		extensions: FranklinAppExtensions;
		platform: Platform;
		appDir: AbsolutePath;
		authStore?: AuthStore;
	}) {
		const { platform, appDir } = opts;
		const storage = createStorage<FranklinSession>(
			platform.os.filesystem,
			appDir,
			{
				authStore: opts.authStore,
				sessionCodec: franklinSessionCodec,
			},
		);

		this.auth = new AuthManager(platform, storage.auth);
		this.platform = platform;
		this.settings = storage.settings;
		this.restoreStorage = () => storage.restore();
		const extensions = [
			...resolveExtensions(opts.extensions, {
				auth: this.auth,
				platform,
				settings: this.settings,
			}),
		];

		const connectAgent = createMiniACPRpcConnector(platform.spawn);
		const baseModules: FranklinModules = [
			withAuth(createCoreStateModule(connectAgent), this.auth),
			createStoreStateModule(storage.stores),
			createEnvironmentModule(platform.environment),
		];
		const baseModule = buildStateExtensionModule(baseModules);

		this.collection = new RuntimeCollection<FranklinRuntime>();
		this.sessionPersistence = createSessionPersistence({
			collection: this.collection,
			persistedSessions: storage.sessions,
			getSession: (runtime) => baseModule.state(runtime).get(),
			observeSessionChanges,
		});

		this.orchestrator = createOrchestrator({
			modules: baseModules,
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
		const collectionResult = await this.sessionPersistence.restore(
			(id, state) => this.orchestrator.materialize(id, state),
		);
		return {
			issues: [...storageResult.issues, ...collectionResult.issues],
		};
	}
}

function resolveExtensions(
	extensions: FranklinAppExtensions,
	context: FranklinAppExtensionContext,
): readonly FranklinExtension[] {
	return typeof extensions === 'function' ? extensions(context) : extensions;
}

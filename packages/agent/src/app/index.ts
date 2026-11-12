import type { AbsolutePath, RestoreResult } from '@franklin/lib';
import { createMiniACPRpcConnector } from '@franklin/mini-acp/rpc';
import { priority } from '@franklin/extensibility';
import { documentDownloadPolicy } from '../extensions/references/download-policy/configuration.js';
import type { AuthManager } from '../auth/manager.js';
import type { Orchestrator } from '../modules/orchestrator/index.js';
import type { StoreRegistry } from '../modules/store/api/registry/index.js';
import { createStorage } from '../storage/create-storage.js';
import type { SettingsStore } from '../settings/store.js';
import type { Platform } from '../platform.js';
import type {
	FranklinBase,
	FranklinExtension,
	FranklinRuntime,
} from '../types.js';
import { createFranklinAgents } from './agents/factory.js';
import type { CreateAgentInput } from './agents/types.js';
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

	private readonly createAgents: (
		extensions: readonly FranklinExtension[],
		stores?: StoreRegistry,
	) => Orchestrator<FranklinBase>;
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
		const connectAgent = createMiniACPRpcConnector(platform.spawn);
		this.createAgents = (extensions, stores) =>
			createFranklinAgents({
				connect: connectAgent,
				environment: platform.environment,
				auth: this.auth,
				extensions: [
					...extensions,
					// Resolve saved settings at tool-call time, including for independent
					// inbox agents. Existing agents see edits without rebuilding runtimes.
					priority.lowest(
						documentDownloadPolicy.compute(
							[],
							() => this.settings.get().documentDownloads,
						),
					),
				],
				stores,
			});
		this.agents = this.createAgents(opts.extensions, storage.stores);
		this.sessionPersistence = createSessionPersistence({
			source: this.agents,
			persistedSessions: storage.sessions,
			observeSessionChanges,
		});
	}

	/** Create an isolated agent with in-memory stores and caller-owned disposal. */
	async createAgent({
		extensions,
		state,
	}: CreateAgentInput): Promise<FranklinRuntime> {
		const { runtime } = await this.createAgents(extensions).create({ state });
		return runtime;
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

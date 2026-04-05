import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
} from '@franklin/extensions';
import { SessionManager } from '../agent/session/index.js';
import { SessionRegistry } from '../agent/session/registry.js';
import { createPersistence } from '../agent/session/persist/file-persister.js';
import { withAuth, syncAuth } from '../auth/with-auth.js';
import type { Platform } from '../platform.js';
import type { IAuthManager } from '../auth/types.js';
import type { FranklinState, FranklinAPI, FranklinRuntime } from '../types.js';

export type FranklinExtensionApi = FranklinAPI;
export type FranklinExtension = (api: FranklinExtensionApi) => void;

export class FranklinApp {
	readonly agents: SessionManager<
		FranklinState,
		FranklinExtensionApi,
		FranklinRuntime
	>;
	readonly auth: IAuthManager;

	private readonly storeRegistry: StoreRegistry;
	private readonly sessionRegistry: SessionRegistry<
		FranklinState,
		FranklinRuntime
	>;

	constructor(opts: {
		extensions: FranklinExtension[];
		platform: Platform;
		auth: IAuthManager;
		persistDir?: string;
	}) {
		const { extensions, platform, auth, persistDir } = opts;
		this.auth = auth;

		const persistence = persistDir
			? createPersistence<FranklinState>(persistDir, platform.filesystem)
			: undefined;

		this.storeRegistry = new StoreRegistry(persistence?.store);
		this.sessionRegistry = new SessionRegistry<FranklinState, FranklinRuntime>(
			persistence?.session,
		);

		const coreSystem = withAuth(createCoreSystem(platform.spawn), auth);

		const system = systems(coreSystem)
			.add(createStoreSystem(this.storeRegistry))
			.add(createEnvironmentSystem(platform.environment))
			.done();

		this.agents = new SessionManager(this.sessionRegistry, system, extensions);
	}

	async start(): Promise<void> {
		syncAuth(this.sessionRegistry, this.auth);
		await this.storeRegistry.restore();
		await this.agents.restore();
	}
}

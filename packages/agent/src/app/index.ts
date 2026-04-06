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
import {
	createSettings,
	loadSettings,
	addPersistOnChange,
} from '../settings/store.js';
import type { SettingsStore } from '../settings/store.js';
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
	readonly settings: SettingsStore;

	private readonly platform: Platform;
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
		this.platform = platform;
		this.settings = createSettings();

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
		await loadSettings(this.settings, this.platform.filesystem);
		addPersistOnChange(this.settings, this.platform.filesystem);
		syncAuth(this.sessionRegistry, this.auth);
		await this.storeRegistry.restore();
		await this.agents.restore();
	}
}

import {
	createConfigurationModule,
	createDependencyModule,
} from '@franklin/extensibility/module';
import type { MiniACPConnector } from '@franklin/mini-acp';
import type { AuthManager } from '../../auth/manager.js';
import { withAuth } from '../../auth/with-auth.js';
import { createCoreStateModule } from '../../modules/core/module/index.js';
import {
	createEnvironmentModule,
	type EnvironmentFactory,
} from '../../modules/environment/module.js';
import {
	createOrchestrator,
	type Orchestrator,
} from '../../modules/orchestrator/index.js';
import { createReferencesModule } from '../../modules/references/index.js';
import { StoreRegistry } from '../../modules/store/api/registry/index.js';
import { createStoreStateModule } from '../../modules/store/state-module.js';
import type {
	FranklinBase,
	FranklinExtension,
	FranklinModules,
} from '../../types.js';

type Options = {
	readonly connect: MiniACPConnector;
	readonly environment: EnvironmentFactory;
	readonly auth: AuthManager;
	readonly extensions: readonly FranklinExtension[];
	readonly stores?: StoreRegistry;
};

/** Build a Franklin agent collection; persistence is supplied by its owner. */
export function createFranklinAgents({
	connect,
	environment,
	auth,
	extensions,
	stores = new StoreRegistry(),
}: Options): Orchestrator<FranklinBase> {
	const modules: FranklinModules = [
		withAuth(createCoreStateModule(connect), auth),
		createStoreStateModule(stores),
		createEnvironmentModule(environment),
		createReferencesModule(),
		createDependencyModule('auth', auth),
		createConfigurationModule(),
	];
	return createOrchestrator({ modules, extensions: [...extensions] });
}

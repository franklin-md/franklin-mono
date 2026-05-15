import { createExtensionPoint } from '../../algebra/extension-points/create.js';
import type { HarnessModule } from '../../harness/modules/index.js';
import type { IdentityAPI } from '../identity/api.js';
import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from './api/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
	environmentStateHandle,
} from './runtime.js';
import type { EnvironmentState } from './state.js';
import { emptyEnvironmentState } from './state.js';

export type EnvironmentFactory = (
	config: EnvironmentConfig,
) => Promise<ReconfigurableEnvironment>;

const identityExtensionPoint = createExtensionPoint<IdentityAPI>({});

export type EnvironmentModule = HarnessModule<
	EnvironmentState,
	IdentityAPI,
	EnvironmentRuntime
>;

export function createEnvironmentModule(
	factory: EnvironmentFactory,
): EnvironmentModule {
	return {
		emptyState: emptyEnvironmentState,

		state: environmentStateHandle,

		instantiate(state) {
			return {
				extensionPoint: identityExtensionPoint,
				compiler: {
					async compile() {
						const env = await factory(state.env);
						return createEnvironmentRuntime(env);
					},
				},
			};
		},
	};
}

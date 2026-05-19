import { createExtensionPoint } from '@franklin/extensibility';
import type { StateExtensionModule } from '@franklin/extensibility';
import type { IdentitySignature } from '@franklin/extensibility';
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

const identityExtensionPoint = createExtensionPoint<IdentitySignature>({});

export type EnvironmentModule = StateExtensionModule<
	EnvironmentState,
	IdentitySignature,
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

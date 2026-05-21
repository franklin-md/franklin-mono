import type { Compiler } from '../../compiler/types.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { RegistryView } from '../../extension-points/view.js';
import type { ExtensionModule } from '../../modules/simple/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { CONFIGURATION_REGISTRATION } from './internal.js';
import { assertNoDeclaredConfigurationCycles } from './resolver/cycles.js';
import { createConfigurationRuntime } from './runtime.js';
import type { ConfigurationSignature } from './types.js';
import type { ConfigurationRuntime } from './runtime.js';

export type ConfigurationModule = ExtensionModule<
	ConfigurationSignature,
	ConfigurationRuntime
>;

const configurationExtensionPoint =
	createExtensionPoint<ConfigurationSignature>({
		[CONFIGURATION_REGISTRATION]: true,
	});

function createConfigurationCompiler(): Compiler<
	ConfigurationSignature,
	ConfigurationRuntime
> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: RegistryView<ConfigurationSignature, ContextRuntime>,
		): Promise<ConfigurationRuntime> {
			const values = registry
				.argsFor(CONFIGURATION_REGISTRATION)
				.map(([value]) => value);
			assertNoDeclaredConfigurationCycles(values);
			return createConfigurationRuntime(values);
		},
	};
}

export function createConfigurationModule(): ConfigurationModule {
	return {
		extensionPoint: configurationExtensionPoint,
		compiler: createConfigurationCompiler(),
	};
}

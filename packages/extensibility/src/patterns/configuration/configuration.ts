import type { Extension } from '../../extension/types.js';
import {
	CONFIGURATION_INTERNALS,
	CONFIGURATION_REGISTRATION,
} from './internal.js';
import type { ConfigurationOptions } from './options.js';
import type { ConfigurationCompute } from './reader.js';
import type {
	ConfigurationRegistrationAPI,
	ConfigurationInternals,
} from './types.js';

// Configuration is Franklin's version of CodeMirror Facets: extensions
// contribute typed inputs, the module compiler combines them, and runtimes
// read the derived value through getConfig(configuration).
export class Configuration<Input, Output = Input> {
	declare readonly [CONFIGURATION_INTERNALS]: ConfigurationInternals<
		Input,
		Output
	>;

	constructor(options: ConfigurationOptions<Input, Output>) {
		Object.defineProperty(this, CONFIGURATION_INTERNALS, {
			value: {
				id: Symbol(options.name),
				name: options.name,
				combine: options.combine,
			},
			enumerable: false,
			configurable: false,
		});
	}

	of(input: Input): Extension<ConfigurationRegistrationAPI> {
		return (api) => {
			api[CONFIGURATION_REGISTRATION]({
				kind: 'static',
				configuration: this,
				input,
			});
		};
	}

	compute(
		dependencies: readonly Configuration<any, any>[],
		compute: ConfigurationCompute<Input>,
	): Extension<ConfigurationRegistrationAPI> {
		return (api) => {
			api[CONFIGURATION_REGISTRATION]({
				kind: 'computed',
				configuration: this,
				dependencies,
				compute,
			});
		};
	}
}

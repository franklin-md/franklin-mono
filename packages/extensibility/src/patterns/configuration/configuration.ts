import type { Extension } from '../../extension/types.js';
import {
	CONFIGURATION_INTERNALS,
	CONFIGURATION_REGISTRATION,
} from './internal.js';
import type {
	ConfigurationRegistrationAPI,
	ConfigurationInternals,
	ConfigurationOptions,
} from './types.js';

// Configuration is Franklin's version of CodeMirror Facets: extensions
// contribute typed inputs, the module compiler combines them, and runtimes
// read the derived value through config(configuration).
export class Configuration<Input, Output = readonly Input[]> {
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
			api[CONFIGURATION_REGISTRATION]({ configuration: this, input });
		};
	}
}

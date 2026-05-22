import type { StaticSignature } from '../../api/types.js';
import type { ConfigurationContribution } from './contribution.js';
import type { CONFIGURATION_API } from './internal.js';

export type ConfigurationAPI = {
	readonly [CONFIGURATION_API]: (
		contribution: ConfigurationContribution,
	) => void;
};

export type ConfigurationSignature = StaticSignature<ConfigurationAPI>;

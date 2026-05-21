import type { StaticSignature } from '../../api/types.js';
import type { Extension } from '../../extension/types.js';
import type {
	CONFIGURATION_REGISTRATION,
	FACET_INTERNALS,
} from './internal.js';

export type FacetCombine<Input, Output> = (values: readonly Input[]) => Output;

export type FacetInternals<Input, Output> = {
	readonly id: symbol;
	readonly name: string;
	readonly combine: FacetCombine<Input, Output>;
};

export type Facet<Input, Output = readonly Input[]> = {
	readonly of: (input: Input) => Extension<ConfigurationRegistrationAPI>;
	readonly [FACET_INTERNALS]: FacetInternals<Input, Output>;
};

export type ConfigurationContribution<Input = any, Output = any> = {
	readonly facet: Facet<Input, Output>;
	readonly input: Input;
};

export type ConfigurationRegistrationAPI = {
	readonly [CONFIGURATION_REGISTRATION]: (
		contribution: ConfigurationContribution,
	) => void;
};

export type ConfigurationSignature =
	StaticSignature<ConfigurationRegistrationAPI>;

export type FacetOptions<Input, Output> = {
	readonly name: string;
	readonly combine: FacetCombine<Input, Output>;
};

import type { Compiler } from '../../compiler/types.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { RegistryView } from '../../extension-points/view.js';
import type { ExtensionModule } from '../../modules/simple/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { CONFIGURATION_REGISTRATION, getFacetInternals } from './internal.js';
import { createConfigurationRuntime } from './runtime.js';
import type {
	ConfigurationContribution,
	ConfigurationSignature,
	Facet,
	FacetCombine,
} from './types.js';
import type { ConfigurationRuntime } from './runtime.js';

export type ConfigurationModule = ExtensionModule<
	ConfigurationSignature,
	ConfigurationRuntime
>;

type ConfigurationGroup = {
	readonly facet: Facet<any, any>;
	readonly combine: FacetCombine<any, any>;
	readonly name: string;
	readonly inputs: any[];
};

const configurationExtensionPoint =
	createExtensionPoint<ConfigurationSignature>({
		[CONFIGURATION_REGISTRATION]: true,
	});

function collectConfigurationValues(
	contributions: readonly ConfigurationContribution[],
): Map<symbol, unknown> {
	const groups = new Map<symbol, ConfigurationGroup>();

	for (const contribution of contributions) {
		const internals = getFacetInternals(contribution.facet);
		const existing = groups.get(internals.id);
		if (existing === undefined) {
			groups.set(internals.id, {
				facet: contribution.facet,
				combine: internals.combine,
				name: internals.name,
				inputs: [contribution.input],
			});
			continue;
		}
		if (existing.combine !== internals.combine) {
			throw new Error(
				`Conflicting combine functions registered for configuration facet "${internals.name}"`,
			);
		}
		existing.inputs.push(contribution.input);
	}

	const values = new Map<symbol, unknown>();
	for (const [id, group] of groups) {
		values.set(id, group.combine(group.inputs));
	}
	return values;
}

function createConfigurationCompiler(): Compiler<
	ConfigurationSignature,
	ConfigurationRuntime
> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: RegistryView<ConfigurationSignature, ContextRuntime>,
		): Promise<ConfigurationRuntime> {
			const contributions = registry
				.argsFor(CONFIGURATION_REGISTRATION)
				.map(([contribution]) => contribution);
			return createConfigurationRuntime(
				collectConfigurationValues(contributions),
			);
		},
	};
}

export function createConfigurationModule(): ConfigurationModule {
	return {
		extensionPoint: configurationExtensionPoint,
		compiler: createConfigurationCompiler(),
	};
}

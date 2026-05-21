import type {
	ConfigurationProvider,
	ConfigurationReader,
} from '../configuration.js';
import type {
	ComputedConfigurationContribution,
	ConfigurationContribution,
} from '../contribution.js';
import { configurationCycleEntry } from '../cycle-error.js';
import { assertNoDeclaredConfigurationCycles } from './cycles.js';
import {
	groupConfigurationContributions,
	type ConfigurationContributionGroup,
} from './group.js';

function resolveConfigurationContribution<Input>(
	contribution: ConfigurationContribution<Input>,
	resolve: <Input, Output>(
		provider: ConfigurationProvider<Input, Output>,
	) => Output,
): Input {
	switch (contribution.kind) {
		case 'static':
			return contribution.input;
		case 'computed':
			return contribution.compute(
				createComputedConfigurationReader(contribution, resolve),
			);
	}
}

function createComputedConfigurationReader<Input>(
	contribution: ComputedConfigurationContribution<Input>,
	resolve: <Input, Output>(
		provider: ConfigurationProvider<Input, Output>,
	) => Output,
): ConfigurationReader {
	const target = configurationCycleEntry(contribution.provider);
	const dependencies = new Set(contribution.dependencies);

	return {
		getConfig(dependency) {
			const dependencyEntry = configurationCycleEntry(dependency);
			if (!dependencies.has(dependency)) {
				throw new Error(
					`Computed configuration "${target.name}" read undeclared dependency "${dependencyEntry.name}"`,
				);
			}
			return resolve(dependency);
		},
	};
}

function resolveConfigurationGroup(
	group: ConfigurationContributionGroup,
	resolve: <Input, Output>(
		provider: ConfigurationProvider<Input, Output>,
	) => Output,
): unknown {
	const inputs = group.contributions.map((contribution) =>
		resolveConfigurationContribution(contribution, resolve),
	);
	return group.provider.configuration.combine(inputs);
}

export function createConfigurationResolver(
	contributions: readonly ConfigurationContribution[],
): ConfigurationReader {
	assertNoDeclaredConfigurationCycles(contributions);
	const groups = groupConfigurationContributions(contributions);

	const resolve = <Input, Output>(
		provider: ConfigurationProvider<Input, Output>,
	): Output => {
		const group = groups.get(provider);
		if (group === undefined) {
			return provider.configuration.combine([]);
		}

		return resolveConfigurationGroup(group, resolve) as Output;
	};

	return {
		getConfig(provider) {
			// TODO(FRA-330): Consider caching resolved provider values and invalidating
			// that cache when configuration contributions change.
			return resolve(provider);
		},
	};
}

import type { Configuration } from '../configuration.js';
import type { ConfigurationContribution } from '../contribution.js';

export type ConfigurationContributionGroup = {
	readonly configuration: Configuration<any, any>;
	readonly contributions: ConfigurationContribution[];
};

export function groupConfigurationContributions(
	contributions: readonly ConfigurationContribution[],
): Map<Configuration<any, any>, ConfigurationContributionGroup> {
	const groups = new Map<
		Configuration<any, any>,
		ConfigurationContributionGroup
	>();

	for (const contribution of contributions) {
		const existing = groups.get(contribution.configuration);
		if (existing === undefined) {
			groups.set(contribution.configuration, {
				configuration: contribution.configuration,
				contributions: [contribution],
			});
			continue;
		}

		existing.contributions.push(contribution);
	}

	return groups;
}

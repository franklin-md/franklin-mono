import type { ConfigurationProvider } from '../configuration.js';
import type { ConfigurationContribution } from '../contribution.js';

export type ConfigurationContributionGroup = {
	readonly provider: ConfigurationProvider<any, any>;
	readonly contributions: ConfigurationContribution[];
};

export function groupConfigurationContributions(
	contributions: readonly ConfigurationContribution[],
): Map<ConfigurationProvider<any, any>, ConfigurationContributionGroup> {
	const groups = new Map<
		ConfigurationProvider<any, any>,
		ConfigurationContributionGroup
	>();

	for (const contribution of contributions) {
		const existing = groups.get(contribution.provider);
		if (existing === undefined) {
			groups.set(contribution.provider, {
				provider: contribution.provider,
				contributions: [contribution],
			});
			continue;
		}

		existing.contributions.push(contribution);
	}

	return groups;
}

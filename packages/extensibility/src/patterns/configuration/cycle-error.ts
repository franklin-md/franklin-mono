import type { ConfigurationProvider } from './configuration.js';

export type ConfigurationCycleEntry = {
	readonly provider: ConfigurationProvider<any, any>;
	readonly name: string;
};

function formatConfigurationCycle(
	cycle: readonly ConfigurationCycleEntry[],
): string {
	const providersByName = new Map<
		string,
		Set<ConfigurationProvider<any, any>>
	>();
	for (const entry of cycle) {
		const providers = providersByName.get(entry.name) ?? new Set();
		providers.add(entry.provider);
		providersByName.set(entry.name, providers);
	}

	const duplicateNames = new Set(
		[...providersByName.entries()]
			.filter(([, providers]) => providers.size > 1)
			.map(([name]) => name),
	);
	const labelsByProvider = new Map<ConfigurationProvider<any, any>, string>();
	const countsByName = new Map<string, number>();

	return cycle
		.map((entry) => {
			if (!duplicateNames.has(entry.name)) return entry.name;

			const existing = labelsByProvider.get(entry.provider);
			if (existing !== undefined) return existing;

			const count = (countsByName.get(entry.name) ?? 0) + 1;
			countsByName.set(entry.name, count);

			const label = `${entry.name}#${count}`;
			labelsByProvider.set(entry.provider, label);
			return label;
		})
		.join(' -> ');
}

export function configurationCycleEntry(
	provider: ConfigurationProvider<any, any>,
): ConfigurationCycleEntry {
	return {
		provider,
		name: provider.name,
	};
}

export class ConfigurationCycleError extends Error {
	readonly cycle: readonly ConfigurationCycleEntry[];

	constructor(cycle: readonly ConfigurationCycleEntry[]) {
		super(
			`Circular configuration computation: ${formatConfigurationCycle(cycle)}`,
		);
		this.name = 'ConfigurationCycleError';
		this.cycle = cycle.map((entry) => ({ ...entry }));
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

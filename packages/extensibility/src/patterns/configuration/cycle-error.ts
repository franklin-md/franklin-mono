import type { Configuration } from './configuration.js';

export type ConfigurationCycleEntry = {
	readonly configuration: Configuration<any, any>;
	readonly name: string;
};

function formatConfigurationCycle(
	cycle: readonly ConfigurationCycleEntry[],
): string {
	const configurationsByName = new Map<string, Set<Configuration<any, any>>>();
	for (const entry of cycle) {
		const configurations = configurationsByName.get(entry.name) ?? new Set();
		configurations.add(entry.configuration);
		configurationsByName.set(entry.name, configurations);
	}

	const duplicateNames = new Set(
		[...configurationsByName.entries()]
			.filter(([, configurations]) => configurations.size > 1)
			.map(([name]) => name),
	);
	const labelsByConfiguration = new Map<Configuration<any, any>, string>();
	const countsByName = new Map<string, number>();

	return cycle
		.map((entry) => {
			if (!duplicateNames.has(entry.name)) return entry.name;

			const existing = labelsByConfiguration.get(entry.configuration);
			if (existing !== undefined) return existing;

			const count = (countsByName.get(entry.name) ?? 0) + 1;
			countsByName.set(entry.name, count);

			const label = `${entry.name}#${count}`;
			labelsByConfiguration.set(entry.configuration, label);
			return label;
		})
		.join(' -> ');
}

export function configurationCycleEntry(
	configuration: Configuration<any, any>,
): ConfigurationCycleEntry {
	return {
		configuration,
		name: configuration.name,
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

import { describe, expect, it } from 'vitest';
import { ConfigurationCycleError } from '../../cycle-error.js';
import type { Configuration } from '../../configuration.js';
import type { ConfigurationContribution } from '../../contribution.js';
import { createConfiguration } from '../../create.js';
import { assertNoDeclaredConfigurationCycles } from '../cycles.js';

function numberConfiguration(name: string): Configuration<number> {
	return createConfiguration<number>({
		name,
		combine: (values) => values.at(-1) ?? 0,
	});
}

function staticValue(
	configuration: Configuration<number>,
	input = 1,
): ConfigurationContribution<number> {
	return {
		kind: 'static',
		configuration,
		input,
	};
}

function computedValue(
	configuration: Configuration<number>,
	dependencies: readonly Configuration<number>[],
): ConfigurationContribution<number> {
	return {
		kind: 'computed',
		configuration,
		dependencies,
		compute: ({ getConfig }) =>
			dependencies.reduce((sum, dependency) => sum + getConfig(dependency), 0),
	};
}

function captureCycleError(
	values: readonly ConfigurationContribution[],
): ConfigurationCycleError {
	try {
		assertNoDeclaredConfigurationCycles(values);
	} catch (error) {
		expect(error).toBeInstanceOf(ConfigurationCycleError);
		return error as ConfigurationCycleError;
	}

	throw new Error('Expected ConfigurationCycleError');
}

describe('assertNoDeclaredConfigurationCycles', () => {
	it('accepts an empty graph', () => {
		expect(() => assertNoDeclaredConfigurationCycles([])).not.toThrow();
	});

	it('accepts static-only configurations', () => {
		const first = numberConfiguration('first');
		const second = numberConfiguration('second');

		expect(() =>
			assertNoDeclaredConfigurationCycles([
				staticValue(first),
				staticValue(second),
			]),
		).not.toThrow();
	});

	it('accepts acyclic chains', () => {
		const first = numberConfiguration('first');
		const second = numberConfiguration('second');
		const third = numberConfiguration('third');

		expect(() =>
			assertNoDeclaredConfigurationCycles([
				computedValue(first, [second]),
				computedValue(second, [third]),
			]),
		).not.toThrow();
	});

	it('accepts acyclic fan-in and fan-out graphs', () => {
		const root = numberConfiguration('root');
		const left = numberConfiguration('left');
		const right = numberConfiguration('right');
		const leaf = numberConfiguration('leaf');

		expect(() =>
			assertNoDeclaredConfigurationCycles([
				computedValue(root, [left, right]),
				computedValue(left, [leaf]),
				computedValue(right, [leaf]),
			]),
		).not.toThrow();
	});

	it('rejects self-cycles', () => {
		const first = numberConfiguration('first');
		const error = captureCycleError([computedValue(first, [first])]);

		expect(error.cycle.map((entry) => entry.name)).toEqual(['first', 'first']);
	});

	it('rejects two-node cycles', () => {
		const first = numberConfiguration('first');
		const second = numberConfiguration('second');
		const error = captureCycleError([
			computedValue(first, [second]),
			computedValue(second, [first]),
		]);

		expect(error.cycle.map((entry) => entry.name)).toEqual([
			'first',
			'second',
			'first',
		]);
	});

	it('disambiguates duplicate configuration names in cycle messages', () => {
		const first = numberConfiguration('duplicate');
		const second = numberConfiguration('duplicate');
		const error = captureCycleError([
			computedValue(first, [second]),
			computedValue(second, [first]),
		]);

		expect(error.message).toBe(
			'Circular configuration computation: duplicate#1 -> duplicate#2 -> duplicate#1',
		);
		expect(error.cycle.map((entry) => entry.configuration)).toEqual([
			first,
			second,
			first,
		]);
	});

	it('rejects longer cycles', () => {
		const first = numberConfiguration('first');
		const second = numberConfiguration('second');
		const third = numberConfiguration('third');
		const error = captureCycleError([
			computedValue(first, [second]),
			computedValue(second, [third]),
			computedValue(third, [first]),
		]);

		expect(error.cycle.map((entry) => entry.name)).toEqual([
			'first',
			'second',
			'third',
			'first',
		]);
	});

	it('rejects cycles in disconnected components', () => {
		const acyclic = numberConfiguration('acyclic');
		const dependency = numberConfiguration('dependency');
		const first = numberConfiguration('first');
		const second = numberConfiguration('second');
		const error = captureCycleError([
			computedValue(acyclic, [dependency]),
			computedValue(first, [second]),
			computedValue(second, [first]),
		]);

		expect(error.cycle.map((entry) => entry.name)).toEqual([
			'first',
			'second',
			'first',
		]);
	});

	it('rejects cycles across duplicate contributions for one configuration', () => {
		const first = numberConfiguration('first');
		const second = numberConfiguration('second');
		const third = numberConfiguration('third');
		const error = captureCycleError([
			computedValue(first, [second]),
			computedValue(first, [third]),
			computedValue(third, [first]),
		]);

		expect(error.cycle.map((entry) => entry.name)).toEqual([
			'first',
			'third',
			'first',
		]);
	});
});

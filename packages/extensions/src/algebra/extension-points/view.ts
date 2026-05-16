import type { API } from '../api/types.js';
import type {
	EffectForName,
	EffectName,
	EffectValueForName,
	Registry,
} from './registry.js';

export type RegistryView<A extends API, Runtime extends A['In']> = {
	effectsFor<Name extends EffectName<A, Runtime>>(
		name: Name,
	): EffectForName<A, Runtime, Name>[];
	valuesFor<Name extends EffectName<A, Runtime>>(
		name: Name,
	): EffectValueForName<A, Runtime, Name>[];
	argsFor<Name extends EffectName<A, Runtime>>(
		name: Name,
	): EffectValueForName<A, Runtime, Name>[];
};

export function createRegistryView<A extends API, Runtime extends A['In']>(
	registry: Registry<A, Runtime>,
): RegistryView<A, Runtime> {
	const effectsFor = <Name extends EffectName<A, Runtime>>(
		name: Name,
	): EffectForName<A, Runtime, Name>[] =>
		registry.effects.filter((effect) => effect.name === name) as EffectForName<
			A,
			Runtime,
			Name
		>[];

	const valuesFor = <Name extends EffectName<A, Runtime>>(
		name: Name,
	): EffectValueForName<A, Runtime, Name>[] =>
		effectsFor(name).map((effect) => effect.value) as EffectValueForName<
			A,
			Runtime,
			Name
		>[];

	return {
		effectsFor,
		valuesFor,
		argsFor: valuesFor,
	};
}

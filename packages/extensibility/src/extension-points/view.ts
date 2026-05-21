import type { Signature } from '../api/types.js';
import type {
	EffectForName,
	EffectName,
	EffectValue,
	EffectValueForName,
	Registry,
} from './registry.js';

export type RegistryView<S extends Signature, Runtime extends S['In']> = {
	effectsFor<Name extends EffectName<S, Runtime>>(
		name: Name,
	): EffectForName<S, Runtime, Name>[];
	valuesFor<Name extends EffectName<S, Runtime>>(
		name: Name,
	): EffectValueForName<S, Runtime, Name>[];
	argsFor<Name extends EffectName<S, Runtime>>(
		name: Name,
	): EffectValueForName<S, Runtime, Name>[];
};

export function createRegistryView<
	S extends Signature,
	Runtime extends S['In'],
>(registry: Registry<S, Runtime>): RegistryView<S, Runtime> {
	const byPriorityThenSequence = (a: EffectValue, b: EffectValue): number => {
		const priority = b.meta.priority - a.meta.priority;
		if (priority !== 0) return priority;
		return a.sequence - b.sequence;
	};

	const effectsFor = <Name extends EffectName<S, Runtime>>(
		name: Name,
	): EffectForName<S, Runtime, Name>[] =>
		registry.effects
			.filter((effect) => effect.name === name)
			.sort(byPriorityThenSequence) as EffectForName<S, Runtime, Name>[];

	const valuesFor = <Name extends EffectName<S, Runtime>>(
		name: Name,
	): EffectValueForName<S, Runtime, Name>[] =>
		effectsFor(name).map((effect) => effect.value) as EffectValueForName<
			S,
			Runtime,
			Name
		>[];

	return {
		effectsFor,
		valuesFor,
		argsFor: valuesFor,
	};
}

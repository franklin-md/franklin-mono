import type { Signature } from '../api/types.js';
import type { EffectValueFor, Registry } from './registry.js';

export type RegistryWriter<S extends Signature, Runtime extends S['In']> = (
	effect: EffectValueFor<S, Runtime>,
) => void;

export type RegistryBinding<S extends Signature, Runtime extends S['In']> = {
	readonly registry: Registry<S, Runtime>;
	readonly writer: RegistryWriter<S, Runtime>;
};

export function createRegistry<
	S extends Signature,
	Runtime extends S['In'],
>(): RegistryBinding<S, Runtime> {
	const effects: EffectValueFor<S, Runtime>[] = [];
	const registry: Registry<S, Runtime> = { effects };
	return {
		registry,
		writer(effect) {
			effects.push(effect);
		},
	};
}

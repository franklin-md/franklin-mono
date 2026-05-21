import type { Signature } from '../api/types.js';
import type { EffectInputFor, EffectValueFor, Registry } from './registry.js';
import { normalizeRegistrationMeta } from './registry.js';

export type RegistryWriter<S extends Signature, Runtime extends S['In']> = (
	effect: EffectInputFor<S, Runtime>,
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
	let sequence = 0;
	return {
		registry,
		writer(effect) {
			effects.push({
				...effect,
				meta: normalizeRegistrationMeta(effect.meta),
				sequence: sequence++,
			} as EffectValueFor<S, Runtime>);
		},
	};
}

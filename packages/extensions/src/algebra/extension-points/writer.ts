import type { API } from '../api/types.js';
import type { EffectValueFor, Registry } from './registry.js';

export type RegistryWriter<A extends API, Runtime extends A['In']> = (
	effect: EffectValueFor<A, Runtime>,
) => void;

export type RegistryBinding<A extends API, Runtime extends A['In']> = {
	readonly registry: Registry<A, Runtime>;
	readonly writer: RegistryWriter<A, Runtime>;
};

export function createRegistry<
	A extends API,
	Runtime extends A['In'],
>(): RegistryBinding<A, Runtime> {
	const effects: EffectValueFor<A, Runtime>[] = [];
	const registry: Registry<A, Runtime> = { effects };
	return {
		registry,
		writer(effect) {
			effects.push(effect);
		},
	};
}

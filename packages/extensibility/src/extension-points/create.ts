import type { Signature } from '../api/types.js';
import type { ExtensionPoint as ExtensionPoint } from './types.js';
import type { EffectName } from './registry.js';

// This returns a union over the keys
type ExtensionPointName<S extends Signature> = EffectName<S, any>;

// This turns that union into a record that requires every name to be present
type ExtensionPointNames<S extends Signature> = [
	ExtensionPointName<S>,
] extends [never]
	? Record<string, never>
	: { readonly [K in ExtensionPointName<S>]: true };

export function createExtensionPoint<S extends Signature>(
	names: ExtensionPointNames<S>,
): ExtensionPoint<S> {
	const contributionNames = Reflect.ownKeys(names);
	return ((writer) => {
		const entries = contributionNames.map((name) => [
			name,
			(...args: unknown[]) => {
				writer({ name, value: args } as never);
			},
		]);
		return Object.fromEntries(entries);
	}) as ExtensionPoint<S>;
}

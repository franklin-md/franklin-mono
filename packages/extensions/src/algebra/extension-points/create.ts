import type { API } from '../api/types.js';
import type { ExtensionPoint as ExtensionPoint } from './types.js';
import type { EffectName } from './registry.js';

// This returns a union over the keys
type ExtensionPointName<A extends API> = EffectName<A, any>;

// This turns that union into a record that requires every name to be present
type ExtensionPointNames<A extends API> = [ExtensionPointName<A>] extends [
	never,
]
	? Record<string, never>
	: { readonly [K in ExtensionPointName<A>]: true };

export function createExtensionPoint<A extends API>(
	names: ExtensionPointNames<A>,
): ExtensionPoint<A> {
	const contributionNames = Object.keys(names);
	return ((writer) => {
		const entries = contributionNames.map((name) => [
			name,
			(...args: unknown[]) => {
				writer({ name, value: args } as never);
			},
		]);
		return Object.fromEntries(entries);
	}) as ExtensionPoint<A>;
}

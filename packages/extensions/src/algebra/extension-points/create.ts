import type { Apply } from '@franklin/lib';
import type { API } from '../api/types.js';
import type { Registry } from './registry.js';
import type { ExtensionPoint as ExtensionPoint } from './types.js';

export type ExtensionPointName<A extends API> = Extract<
	keyof Apply<A, any>,
	string
>;

export type ExtensionPointNames<A extends API> = [
	ExtensionPointName<A>,
] extends [never]
	? Record<string, never>
	: { readonly [K in ExtensionPointName<A>]: true };

type WritableRegistry = Record<string, unknown[][]>;

export function createExtensionPoint<A extends API>(
	names: ExtensionPointNames<A>,
): ExtensionPoint<A> {
	const contributionNames = Object.keys(names);
	return {
		createRegistry: () => {
			const entries = contributionNames.map((name) => [name, []]);
			return Object.fromEntries(entries) as Registry<A>;
		},
		createApi<R extends A['In']>(registry: Registry<A>): Apply<A, R> {
			const writableRegistry = registry as unknown as WritableRegistry;
			const entries = contributionNames.map((name) => [
				name,
				(...args: unknown[]) => {
					const contributions = writableRegistry[name];
					if (contributions === undefined) {
						throw new Error(`Missing registry contribution list: ${name}`);
					}
					contributions.push(args);
				},
			]);
			return Object.fromEntries(entries) as Apply<A, R>;
		},
	};
}

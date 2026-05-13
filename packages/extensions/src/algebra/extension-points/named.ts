import type { API } from '../api/types.js';
import type { Registry } from './registry.js';
import type { ExtensionPoint as ExtensionPoint } from './types.js';

// TODO: The typing rule isn't quite right. 'Name' in theory could be a union, which violates the 1 entry record idea.

type ExtensionPointSignature<Name extends string, T extends any[]> = {
	[K in Name]: (...args: T) => void;
};

interface ExtensionPointAPI<Name extends string, T extends any[]> extends API {
	readonly Out: ExtensionPointSignature<Name, T>;
}

export function createExtensionPoint<Name extends string, T extends any[]>(
	name: Name,
): ExtensionPoint<ExtensionPointAPI<Name, T>> {
	return {
		createRegistry: () => {
			const registry = { [name]: [] as T[] } as Registry<
				ExtensionPointAPI<Name, T>
			>;
			return registry;
		},
		createApi: (registry) => {
			const contributions = registry[name] as T[];
			return {
				[name]: (...args: T) => {
					contributions.push(args);
				},
			} as ExtensionPointSignature<Name, T>;
		},
	};
}

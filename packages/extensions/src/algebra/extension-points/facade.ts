import type { API, BoundAPI } from '../api/types.js';
import type { ExtensionPoint } from './types.js';
import type { RegistryWriter } from './writer.js';

const API_FACADE: unique symbol = Symbol('franklin.extension-api.facade');

type FacadeInternals<A extends API, Runtime extends A['In']> = {
	readonly writer: RegistryWriter<A, Runtime>;
	readonly derive: (
		transform: (
			writer: RegistryWriter<A, Runtime>,
		) => RegistryWriter<A, Runtime>,
	) => BoundAPI<A, Runtime>;
};

export function createApi<A extends API, Runtime extends A['In']>(
	extensionPoint: ExtensionPoint<A>,
	writer: RegistryWriter<A, Runtime>,
): BoundAPI<A, Runtime> {
	const api = extensionPoint<Runtime>(writer);
	Object.defineProperty(api, API_FACADE, {
		value: {
			writer,
			derive(transform) {
				return createApi<A, Runtime>(extensionPoint, transform(writer));
			},
		} satisfies FacadeInternals<A, Runtime>,
		enumerable: false,
		configurable: false,
	});
	return api;
}

export function deriveApi<A extends API, Runtime extends A['In']>(
	api: BoundAPI<A, Runtime>,
	transform: (writer: RegistryWriter<A, Runtime>) => RegistryWriter<A, Runtime>,
): BoundAPI<A, Runtime> {
	const internals = (
		api as Partial<Record<typeof API_FACADE, FacadeInternals<A, Runtime>>>
	)[API_FACADE];
	if (internals === undefined) {
		throw new Error('Cannot derive a non-Franklin extension API facade');
	}
	return internals.derive(transform);
}

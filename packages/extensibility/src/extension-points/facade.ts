import type { API, Signature } from '../api/types.js';
import type { ExtensionPoint } from './types.js';
import type { RegistryWriter } from './writer.js';

const API_FACADE: unique symbol = Symbol('franklin.extension-api.facade');

type FacadeInternals<S extends Signature, Runtime extends S['In']> = {
	readonly writer: RegistryWriter<S, Runtime>;
	readonly derive: (
		transform: (
			writer: RegistryWriter<S, Runtime>,
		) => RegistryWriter<S, Runtime>,
	) => API<S, Runtime>;
};

export function createApi<S extends Signature, Runtime extends S['In']>(
	extensionPoint: ExtensionPoint<S>,
	writer: RegistryWriter<S, Runtime>,
): API<S, Runtime> {
	const api = extensionPoint<Runtime>(writer);
	Object.defineProperty(api, API_FACADE, {
		value: {
			writer,
			derive(transform) {
				return createApi<S, Runtime>(extensionPoint, transform(writer));
			},
		} satisfies FacadeInternals<S, Runtime>,
		enumerable: false,
		configurable: false,
	});
	return api;
}

export function deriveApi<S extends Signature, Runtime extends S['In']>(
	api: API<S, Runtime>,
	transform: (writer: RegistryWriter<S, Runtime>) => RegistryWriter<S, Runtime>,
): API<S, Runtime> {
	const internals = (
		api as Partial<Record<typeof API_FACADE, FacadeInternals<S, Runtime>>>
	)[API_FACADE];
	if (internals === undefined) {
		throw new Error('Cannot derive a non-Franklin extension API facade');
	}
	return internals.derive(transform);
}

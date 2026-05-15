import type { Apply } from '@franklin/lib';
import type { API as APIFamily } from '../api/types.js';
import type { Registry } from './registry.js';

export type ExtensionPoint<API extends APIFamily> = {
	createRegistry(): Registry<API>;
	createApi<R extends API['In']>(registry: Registry<API>): Apply<API, R>;
};

/*
The extension-point algorithm:

const registry = EP.createRegistry()
const api = EP.createApi(registry) // api writes to registry
extension(api) // run the extension to register values

The populated registry is then passed to a compiler to materialise a runtime.
*/

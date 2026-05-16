import type { API as APIFamily, BoundAPI } from '../api/types.js';
import type { RegistryWriter } from './writer.js';

export type ExtensionPoint<API extends APIFamily> = <Runtime extends API['In']>(
	writer: RegistryWriter<API, Runtime>,
) => BoundAPI<API, Runtime>;

/*
The extension-point algorithm:

const { registry, writer } = createRegistry<MyAPI, Runtime>()
const api = createApi(extensionPoint, writer) // api writes through writer
extension(api) // run the extension to register values

The populated registry is then passed to a compiler to materialise a runtime.
*/

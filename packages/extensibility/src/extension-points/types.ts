import type { API, Signature } from '../api/types.js';
import type { RegistryWriter } from './writer.js';

export type ExtensionPoint<S extends Signature> = <Runtime extends S['In']>(
	writer: RegistryWriter<S, Runtime>,
) => API<S, Runtime>;

/*
The extension-point algorithm:

const { registry, writer } = createRegistry<MySignature, Runtime>()
const api = createApi(extensionPoint, writer) // api writes through writer
extension(api) // run the extension to register values

The populated registry is then passed to a compiler to materialise a runtime.
*/

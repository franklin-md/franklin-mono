import type { API, Signature } from '../api/index.js';
import type { Extension } from '../extension/index.js';
import type { ExtensionPoint } from '../extension-points/types.js';
import type { Registry } from '../extension-points/registry.js';
import { createApi } from '../extension-points/facade.js';
import { createRegistryView } from '../extension-points/view.js';
import { createRegistry } from '../extension-points/writer.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { Compiler } from './types.js';

export function register<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	extensionPoint: ExtensionPoint<S>,
	extension: Extension<API<S, Runtime>>,
): Registry<S, Runtime> {
	const { registry, writer } = createRegistry<S, Runtime>();
	const api = createApi<S, Runtime>(extensionPoint, writer);
	extension(api);
	return registry;
}

export async function build<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	registry: Registry<S, Runtime>,
	compiler: Compiler<S, Runtime>,
): Promise<Runtime> {
	// Mutable cell: handlers capture `getRuntime` during registration, then
	// `build` populates the cell once compiler compilation resolves.
	const cell: { value?: Runtime } = {};
	const getRuntime = (): Runtime => {
		if (cell.value === undefined) {
			throw new Error(
				'getRuntime() called before build returned — handlers must only read runtime at invocation time, not during build',
			);
		}
		return cell.value;
	};
	cell.value = await compiler.compile<Runtime>(
		createRegistryView(registry),
		getRuntime,
	);
	return cell.value;
}

export async function compile<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	extensionPoint: ExtensionPoint<S>,
	compiler: Compiler<S, Runtime>,
	extension: Extension<API<S, Runtime>>,
): Promise<Runtime> {
	const registry = register(extensionPoint, extension);
	return build(registry, compiler);
}

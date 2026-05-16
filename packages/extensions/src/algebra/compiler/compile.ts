import type { API, BoundAPI } from '../api/index.js';
import type { Extension } from '../extension/index.js';
import type { ExtensionPoint } from '../extension-points/types.js';
import type { Registry } from '../extension-points/registry.js';
import { createApi } from '../extension-points/facade.js';
import { createRegistryView } from '../extension-points/view.js';
import { createRegistry } from '../extension-points/writer.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { Compiler } from './types.js';

export function register<A extends API, Runtime extends BaseRuntime & A['In']>(
	extensionPoint: ExtensionPoint<A>,
	extension: Extension<BoundAPI<A, Runtime>>,
): Registry<A, Runtime> {
	const { registry, writer } = createRegistry<A, Runtime>();
	const api = createApi<A, Runtime>(extensionPoint, writer);
	extension(api);
	return registry;
}

export async function build<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	registry: Registry<A, Runtime>,
	compiler: Compiler<A, Runtime>,
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
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	extensionPoint: ExtensionPoint<A>,
	compiler: Compiler<A, Runtime>,
	extension: Extension<BoundAPI<A, Runtime>>,
): Promise<Runtime> {
	const registry = register(extensionPoint, extension);
	return build(registry, compiler);
}

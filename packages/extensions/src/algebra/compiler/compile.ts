import type { API, BoundAPI } from '../api/index.js';
import type { Extension } from '../extension/index.js';
import type { ExtensionPoint } from '../extension-points/types.js';
import type { Registry } from '../extension-points/registry.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { Compiler } from './types.js';

/**
 * Compile a single extension — create the extension-point registry, bind the
 * API facade, run extension registration, then tie the Y-combinator.
 */
export async function compile<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	extensionPoint: ExtensionPoint<A>,
	compiler: Compiler<A, Runtime>,
	extension: Extension<BoundAPI<A, Runtime>>,
): Promise<Runtime> {
	// TODO: The question is do we split this out into 2 phase functions?
	// Phase 1: Registration
	const registry = extensionPoint.createRegistry();
	const api = extensionPoint.createApi<Runtime>(registry);
	extension(api);
	// Phase 2: Interprettation
	return tie(compiler, registry as Registry<A, Runtime>);
}

async function tie<A extends API, Runtime extends BaseRuntime & A['In']>(
	compiler: Compiler<A, Runtime>,
	registry: Registry<A, Runtime>,
): Promise<Runtime> {
	// Mutable cell — handler closures capture `getRuntime` at registration,
	// `compileAll`/`compile` populates `cell.value` once compiler compilation
	// resolves.
	const cell: { value?: Runtime } = {};
	const getRuntime = (): Runtime => {
		if (cell.value === undefined) {
			throw new Error(
				'getRuntime() called before build returned — handlers must only read runtime at invocation time, not during build',
			);
		}
		return cell.value;
	};
	cell.value = await compiler.compile<Runtime>(registry, getRuntime);
	return cell.value;
}

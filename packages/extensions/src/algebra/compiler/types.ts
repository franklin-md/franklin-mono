import type { API } from '../api/index.js';
import type { RegistryView } from '../extension-points/view.js';
import type { BaseRuntime } from '../runtime/index.js';

/**
 * A compiler interprets a populated extension-point registry view and materialises
 * a runtime. Stateful modules configure compilers during
 * `StateExtensionModule.instantiate(state)` and capture state in the compiler's
 * closure — it never appears in the compiler's type.
 *
 * `A` is the API family. Compile helpers bind an extension point to a registry
 * writer, run the extension, then pass a typed view of the populated effect log
 * to the compiler.
 */
export type Compiler<A extends API, Runtime extends BaseRuntime & A['In']> = {
	readonly compile: <ContextRuntime extends BaseRuntime & A['In']>(
		registry: RegistryView<A, ContextRuntime>,
		getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
	) => Promise<Runtime>;
};

import type { Signature } from '../api/index.js';
import type { RegistryView } from '../extension-points/view.js';
import type { BaseRuntime } from '../runtime/index.js';

/**
 * A compiler interprets a populated extension-point registry view and materialises
 * a runtime. Stateful modules configure compilers during
 * `StateExtensionModule.instantiate(state)` and capture state in the compiler's
 * closure — it never appears in the compiler's type.
 *
 * `S` is the API signature. Compile helpers bind an extension point to a
 * registry writer, run the extension, then pass a typed view of the populated
 * effect log to the compiler.
 */
export type Compiler<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
> = {
	readonly compile: <ContextRuntime extends BaseRuntime & S['In']>(
		registry: RegistryView<S, ContextRuntime>,
		getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
	) => Promise<Runtime>;
};

import type { API } from '../api/index.js';
import type { Registry } from '../extension-points/registry.js';
import type { BaseRuntime } from '../runtime/index.js';

/**
 * A compiler interprets a populated extension-point registry and materialises
 * a runtime. Stateful modules configure compilers during
 * `StateExtensionModule.instantiate(state)` and capture state in the compiler's
 * closure — it never appears in the compiler's type.
 *
 * `A` is the API family. Extension points create erased registries and APIs;
 * compile helpers re-specialise the populated registry to the chosen
 * `ContextRuntime` before invoking the compiler.
 */
export type Compiler<A extends API, Runtime extends BaseRuntime & A['In']> = {
	readonly compile: <ContextRuntime extends BaseRuntime & A['In']>(
		registry: Registry<A, ContextRuntime>,
		getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
	) => Promise<Runtime>;
};

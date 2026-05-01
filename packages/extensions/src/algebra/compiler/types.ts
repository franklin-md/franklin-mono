import type { API, BoundAPI } from '../api/index.js';
import type { BaseRuntime } from '../runtime/index.js';

/**
 * A compiler captures registrations and materialises a runtime. State is
 * configured at compiler-creation time by the system
 * (`RuntimeSystem.createCompiler(state)`) and captured in the compiler's
 * closure — it never appears in the compiler's type.
 *
 * `A` is the API family. `createApi` and `build` bind that family to the
 * chosen `ContextRuntime`; callers should use the compile helpers/combinators
 * so API context and build runtime stay coordinated. `build` still
 * materialises this compiler's own `Runtime`.
 */
export type Compiler<A extends API, Runtime extends BaseRuntime & A['In']> = {
	// ContextRuntime is selected by the compiler consumer (`compile` or a
	// compiler combinator) so runtime-aware APIs can bind to the full context.
	readonly createApi: <
		ContextRuntime extends BaseRuntime & A['In'],
	>() => BoundAPI<A, ContextRuntime>;
	readonly build: <ContextRuntime extends BaseRuntime & A['In']>(
		getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
	) => Promise<Runtime>;
};

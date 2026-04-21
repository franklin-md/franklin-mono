import type { CoreAPI } from './api/api.js';
import { createCoreCompiler, type SpawnFn } from './compile/compiler.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import type { CoreState } from './state.js';
import { emptyCoreState } from './state.js';
import type { CoreRuntime } from './runtime/index.js';

/**
 * `CoreSystem<Runtime>` parameterises Core by the eventual fully-tied
 * Runtime that handlers receive. `Runtime extends CoreRuntime` ensures
 * Runtime at least exposes Core's surface; the assembler names the
 * combined Runtime explicitly when composing with other systems.
 */
export type CoreSystem<Runtime extends CoreRuntime = CoreRuntime> =
	RuntimeSystem<CoreState, CoreAPI<Runtime>, Runtime>;

export function createCoreSystem<Runtime extends CoreRuntime = CoreRuntime>(
	spawn: SpawnFn,
): CoreSystem<Runtime> {
	return {
		emptyState: emptyCoreState,
		createCompiler: () => createCoreCompiler<Runtime>(spawn),
	};
}

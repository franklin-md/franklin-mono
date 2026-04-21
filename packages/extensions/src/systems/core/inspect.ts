import type { Simplify } from '@franklin/lib';
import type { Ctx } from '@franklin/mini-acp';
import type { InferState } from '../../algebra/system/types.js';
import type { CoreRuntime } from './runtime/index.js';

type InspectDump<RT extends CoreRuntime> = Simplify<
	Omit<InferState<RT>, 'core'> & { core: Ctx }
>;

/**
 * Debug/inspection dump of a runtime: its full persistable state with the
 * `core` slot replaced by the live `Ctx` snapshot (systemPrompt, tools, and
 * config shape — fields that `state.get()` drops because they're recomputed on
 * fork). The copied config is redacted so inspect dumps never expose the live
 * provider API key. Produces one "truth" document for the debug UI.
 *
 * Parameterized on `RT extends CoreRuntime` so that when a combined runtime
 * (`CoreRuntime & TodosRuntime & …`) is passed, the returned dump preserves
 * the full state surface with only `core` widened to `Ctx`.
 */
export async function inspectRuntime<RT extends CoreRuntime>(
	runtime: RT,
): Promise<InspectDump<RT>> {
	const state = await runtime.state.get();
	return {
		...state,
		core: redactInspectContext(runtime.context()),
	} as InspectDump<RT>;
}

function redactInspectContext(ctx: Ctx): Ctx {
	const { apiKey: _apiKey, ...config } = ctx.config;
	return { ...ctx, config };
}

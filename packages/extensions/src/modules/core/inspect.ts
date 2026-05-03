import type { Simplify } from '@franklin/lib';
import type { Ctx } from '@franklin/mini-acp';
import type { StateHandle } from '../../algebra/runtime/index.js';
import type { CoreRuntime } from './runtime/index.js';
import type { CoreState } from './state.js';

type InspectDump<S extends CoreState> = Simplify<
	Omit<S, 'core'> & { core: Ctx }
>;

/**
 * Debug/inspection dump of a runtime: its full persistable state with the
 * `core` slot replaced by the live `Ctx` snapshot (systemPrompt, tools, and
 * config shape — fields that the state projection drops because they're
 * recomputed on fork). The copied config is redacted so inspect dumps never
 * expose the live provider API key. Produces one "truth" document for the
 * debug UI.
 *
 * Caller supplies the state projection — typically `module.state(runtime)`
 * for the combined module, so the dump reflects every slot the runtime
 * was built with. Core-only callers can pass `coreStateHandle(runtime)`.
 */
export async function inspectRuntime<S extends CoreState>(
	runtime: CoreRuntime,
	state: StateHandle<S>,
): Promise<InspectDump<S>> {
	const snapshot = await state.get();
	return {
		...snapshot,
		core: redactInspectContext(runtime.context()),
	} as InspectDump<S>;
}

function redactInspectContext(ctx: Ctx): Ctx {
	const { apiKey: _apiKey, ...config } = ctx.config;
	return { ...ctx, config };
}

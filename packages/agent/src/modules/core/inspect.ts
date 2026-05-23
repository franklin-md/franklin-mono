import type { Simplify } from '@franklin/lib';
import type { Context } from '@franklin/mini-acp';
import { getContextManager } from './runtime/context-manager.js';
import type { CoreRuntime } from './runtime/index.js';

type InspectDump = Simplify<{ core: Context }>;

/**
 * Debug/inspection dump of a core runtime. The dump uses the live Mini-ACP
 * `Context` because inspect needs runtime-only fields such as systemPrompt and
 * tools, but the config is redacted so API keys never leave the runtime.
 */
export async function inspectRuntime(
	runtime: CoreRuntime,
): Promise<InspectDump> {
	return {
		core: redactInspectContext(getContextManager(runtime).getAgentContext()),
	};
}

function redactInspectContext(context: Context): Context {
	const { apiKey: _apiKey, ...config } = context.config;
	return { ...context, config };
}

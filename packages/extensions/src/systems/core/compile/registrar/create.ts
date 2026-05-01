import type { CoreAPI } from '../../api/api.js';
import type { ExtensionToolDefinition } from '../../api/tool.js';
import type { ToolSpec } from '../../api/tool-spec.js';
import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import type { CoreRegistrar } from './types.js';

function normalizeTool<Runtime extends BaseRuntime>(
	specOrTool: ToolSpec | ExtensionToolDefinition<unknown, Runtime>,
	execute?: (params: any, runtime: Runtime) => any,
): ExtensionToolDefinition<unknown, Runtime> {
	if (!execute) {
		return specOrTool as ExtensionToolDefinition<unknown, Runtime>;
	}
	const spec = specOrTool as ToolSpec;
	return {
		name: spec.name,
		description: spec.description,
		schema: spec.schema,
		execute,
	};
}

/**
 * Create an empty `CoreRegistrar` together with the `api` surface that
 * mutates it. Registration is pure accumulation — nothing here touches
 * runtime, transport, or middleware. `assemble(registered, getRuntime)`
 * turns the result into wire-ready middleware + system prompt handlers.
 */
export function createCoreRegistrar<Runtime extends BaseRuntime>(): {
	api: CoreAPI<Runtime>;
	registered: CoreRegistrar<Runtime>;
} {
	const registered: CoreRegistrar<Runtime> = {
		prompt: [],
		cancel: [],
		systemPrompt: [],
		turnStart: [],
		chunk: [],
		update: [],
		turnEnd: [],
		toolCall: [],
		toolResult: [],
		tools: [],
	};

	type EventKey = Exclude<keyof CoreRegistrar<Runtime>, 'tools'>;

	const api: CoreAPI<Runtime> = {
		on(event: string, handler: (...args: any[]) => any) {
			(registered[event as EventKey] as unknown[]).push(handler);
		},
		registerTool(
			specOrTool: ToolSpec | ExtensionToolDefinition<unknown, Runtime>,
			execute?: (params: any, runtime: Runtime) => any,
		) {
			registered.tools.push(normalizeTool(specOrTool, execute));
		},
	};

	return { api, registered };
}

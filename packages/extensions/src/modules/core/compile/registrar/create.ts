import type { BoundAPI } from '../../../../algebra/api/index.js';
import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import type { CoreAPI } from '../../api/api.js';
import type { ExtensionToolDefinition } from '../../api/tool.js';
import type { ToolSpec } from '../../api/tool-spec.js';
import type { CoreRegistrar, CoreRegistrations } from './types.js';

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

export function createCoreRegistrations(): CoreRegistrations {
	return {
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
}

export function asCoreRegistrar<Runtime extends BaseRuntime>(
	registrations: CoreRegistrations,
): CoreRegistrar<Runtime> {
	return registrations as unknown as CoreRegistrar<Runtime>;
}

export function createCoreApi<Runtime extends BaseRuntime>(
	registrations: CoreRegistrations,
): BoundAPI<CoreAPI, Runtime> {
	type EventKey = Exclude<keyof CoreRegistrar<Runtime>, 'tools'>;

	return {
		on(event: string, handler: (...args: any[]) => any) {
			registrations[event as EventKey].push(handler);
		},
		registerTool(
			specOrTool: ToolSpec | ExtensionToolDefinition<unknown, Runtime>,
			execute?: (params: any, runtime: Runtime) => any,
		) {
			registrations.tools.push(normalizeTool(specOrTool, execute));
		},
	};
}

/**
 * Create an empty `CoreRegistrar` together with the `api` surface that
 * mutates it. Registration is pure accumulation — nothing here touches
 * runtime, transport, or middleware. `assemble(registrations, getRuntime)`
 * turns the result into wire-ready middleware + system prompt handlers.
 */
export function createCoreRegistrar<Runtime extends BaseRuntime>(): {
	api: BoundAPI<CoreAPI, Runtime>;
	registrations: CoreRegistrar<Runtime>;
} {
	const registrations = createCoreRegistrations();
	return {
		api: createCoreApi<Runtime>(registrations),
		registrations: asCoreRegistrar<Runtime>(registrations),
	};
}

import type { Extension } from '@franklin/agent';
import type { ExtensionToolDefinition } from '../types/tool.js';

export function onTool<TInput, TOutput>(
	extension: Extension,
	tool: ExtensionToolDefinition<TInput, TOutput>,
	call: (params: TInput, next: typeof tool.execute) => Promise<TOutput>,
): Extension {
	return {
		name: extension.name,
		async setup(api) {
			const registerTool = api.registerTool.bind(api);
			api.registerTool = (toolDef: ExtensionToolDefinition<any, any>) => {
				if (toolDef.name === tool.name) {
					const execute = toolDef.execute.bind(toolDef);
					registerTool({
						...toolDef,
						execute: (params: TInput) => call(params, execute),
					});
				} else {
					registerTool(toolDef);
				}
			};
			await extension.setup(api);
			// Restore the original registerTool function
			api.registerTool = registerTool;
		},
	};
}

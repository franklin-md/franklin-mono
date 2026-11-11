import type { JsonObject } from '@franklin/lib';
import type { ToolSource, ToolSourceTool } from '../api/tool-source.js';
import { defaultToolRenderOutput } from '../api/tool.js';
import type { BoundTool } from '../registrations/tools.js';

function bindSourceTool(tool: ToolSourceTool): BoundTool {
	return {
		name: tool.definition.name,
		description: tool.definition.description,
		inputSchema: tool.definition.inputSchema,
		parse: (args) => args,
		async run(args, invocation) {
			if (!invocation)
				throw new Error('Tool source invocation requires an active operation');
			const output = await tool.execute(args as JsonObject, invocation);
			return {
				output,
				rendered: tool.render
					? await tool.render(output)
					: defaultToolRenderOutput(output),
			};
		},
	};
}

export function createToolSources(factories: readonly (() => ToolSource)[]) {
	let sources: ToolSource[] | undefined;
	return {
		async prepare(signal: AbortSignal): Promise<BoundTool[]> {
			sources ??= factories.flatMap((factory) => {
				try {
					return [factory()];
				} catch {
					return [];
				}
			});
			const results = await Promise.allSettled(
				sources.map((source) => source.prepare(signal)),
			);
			signal.throwIfAborted();
			return results.flatMap((result) =>
				result.status === 'fulfilled' ? result.value.map(bindSourceTool) : [],
			);
		},
		async dispose() {
			await Promise.allSettled(
				(sources ?? []).map((source) => source.dispose()),
			);
		},
	};
}

import type { ToolSpec } from '../../types.js';

/** A tool that echoes its arguments back as JSON text. */

export function echoTool(name = 'echo'): ToolSpec {
	return {
		definition: {
			name,
			description: `Echoes arguments back as JSON`,
			inputSchema: { type: 'object' },
		},
		handler: (call) => ({
			toolCallId: call.id,
			content: [{ type: 'text', text: JSON.stringify(call.arguments) }],
		}),
	};
}

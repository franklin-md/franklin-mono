import type { ToolSpec } from '../../types.js';

/** A tool that always returns an error. */
export function failingTool(name = 'failing', error = 'Tool failed'): ToolSpec {
	return {
		definition: {
			name,
			description: `Always fails with an error`,
			inputSchema: { type: 'object' },
		},
		handler: (call) => ({
			toolCallId: call.id,
			content: [{ type: 'text', text: error }],
			isError: true,
		}),
	};
}

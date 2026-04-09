import type { MiniACPAgent } from '@franklin/mini-acp';

export const fallbackAgent: MiniACPAgent = {
	toolExecute: async (params) => ({
		toolCallId: params.call.id,
		content: [{ type: 'text', text: `Unknown tool: ${params.call.name}` }],
		isError: true,
	}),
};

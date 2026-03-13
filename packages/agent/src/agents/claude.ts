import type { StdioTransportOptions } from '../transport/index.js';

export const claudeAgentSpec = {
	command: 'npx',
	args: ['@zed-industries/claude-agent-acp'],
} satisfies StdioTransportOptions;

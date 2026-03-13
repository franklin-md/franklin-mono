import type { StdioTransportOptions } from '../transport/index.js';

export const codexAgentSpec = {
	command: 'npx',
	args: ['@zed-industries/codex-acp'],
} satisfies StdioTransportOptions;

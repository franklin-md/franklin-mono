import type { AgentSpec } from '@franklin/agent';

export const claudeAgentSpec = {
	command: 'npx',
	args: ['@zed-industries/claude-agent-acp'],
} satisfies AgentSpec;

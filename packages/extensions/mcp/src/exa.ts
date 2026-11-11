import type { MCPServerConfig } from '@franklin/agent';

export const EXA_RESEARCH_TOOLS = [
	'web_search_exa',
	'web_fetch_exa',
	'web_search_advanced_exa',
] as const;

export function createExaConnection(): MCPServerConfig {
	const id = crypto.randomUUID();
	const headerId = crypto.randomUUID();
	return {
		id,
		name: 'Exa',
		preset: 'exa',
		url: 'https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa,agent_run',
		enabled: true,
		authentication: {
			kind: 'headers',
			headers: [
				{
					id: headerId,
					name: 'x-api-key',
					credentialId: `mcp-${id}-${headerId}`,
				},
			],
		},
		enabledTools: [...EXA_RESEARCH_TOOLS],
	};
}

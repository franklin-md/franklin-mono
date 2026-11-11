import type { Tool, CallToolResult } from '@modelcontextprotocol/client';
import type { MCPServerConfig } from '@franklin/agent';
import { createExaConnection } from '../exa.js';
import type { MCPConnectionOptions } from '../types.js';

export function createMCPFixture() {
	let servers: MCPServerConfig[] = [createExaConnection()];
	let key: string | undefined = 'secret-exa-key';
	const configuration = new Set<() => void>();
	const credentials = new Set<(id: string) => void>();
	const requests: Array<{
		method: string;
		headers: Headers;
		params: Record<string, unknown>;
	}> = [];
	let result: CallToolResult = {
		content: [{ type: 'text', text: 'secret-exa-key' }],
		structuredContent: {
			rows: [{ name: 'Example', url: 'https://example.com' }],
		},
	};
	let tools: Tool[] = [
		{
			name: 'web_search_exa',
			description: 'Search',
			inputSchema: {
				type: 'object',
				properties: { query: { type: 'string', minLength: 1 } },
				required: ['query'],
			},
		},
		{ name: 'agent_run', inputSchema: { type: 'object' } },
	];
	let responseStatus = 200;
	const fetch: typeof globalThis.fetch = async (_input, init) => {
		if (init?.method === 'GET') return new Response(null, { status: 405 });
		if (init?.method === 'DELETE') return new Response(null, { status: 204 });
		if (typeof init?.body !== 'string')
			throw new Error('Expected an SDK JSON request body');
		const message = JSON.parse(init.body) as {
			id?: number;
			method: string;
			params?: Record<string, unknown>;
		};
		requests.push({
			method: message.method,
			headers: new Headers(init.headers),
			params: message.params ?? {},
		});
		if (responseStatus !== 200)
			return new Response('untrusted secret-exa-key', {
				status: responseStatus,
			});
		if (message.id === undefined) return new Response(null, { status: 202 });
		const reply =
			message.method === 'initialize'
				? {
						protocolVersion: '2025-11-25',
						capabilities: { tools: {} },
						serverInfo: { name: 'fixture', version: '1' },
					}
				: message.method === 'tools/list'
					? { tools }
					: result;
		return new Response(
			JSON.stringify({ jsonrpc: '2.0', id: message.id, result: reply }),
			{ headers: { 'content-type': 'application/json' } },
		);
	};
	const options: MCPConnectionOptions = {
		getServers: () => servers,
		getCredential: async () => key,
		subscribeConfiguration: (listener) => {
			configuration.add(listener);
			return () => configuration.delete(listener);
		},
		subscribeCredentials: (listener) => {
			credentials.add(listener);
			return () => credentials.delete(listener);
		},
		createFetch: () => fetch,
	};
	return {
		options,
		requests,
		get server() {
			const first = servers[0];
			if (!first) throw new Error('No fixture server');
			return first;
		},
		setServers(value: MCPServerConfig[]) {
			servers = value;
			for (const listener of configuration) listener();
		},
		setKey(value: string | undefined) {
			key = value;
			const server = servers[0];
			if (server?.authentication.kind === 'headers')
				for (const listener of credentials) {
					const header = server.authentication.headers[0];
					if (header) listener(header.credentialId);
				}
		},
		setTools(value: Tool[]) {
			tools = value;
		},
		setResult(value: CallToolResult) {
			result = value;
		},
		setStatus(value: number) {
			responseStatus = value;
		},
	};
}

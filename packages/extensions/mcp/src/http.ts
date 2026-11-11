import type { MCPServerConfig } from '@franklin/agent';
import type { NetworkPermissions } from '@franklin/lib';
import type { MCPConnectionOptions } from './types.js';
import { MCPConnectionError } from './errors.js';

export function authenticatedFetch(
	server: MCPServerConfig,
	options: MCPConnectionOptions,
	getPermissions: () => Promise<NetworkPermissions>,
	secrets: Set<string>,
	signal: AbortSignal,
): typeof fetch {
	const send = options.createFetch(getPermissions);
	return async (input, init) => {
		signal.throwIfAborted();
		const url = input instanceof Request ? input.url : String(input);
		if (new URL(url).href !== new URL(server.url).href)
			throw new MCPConnectionError(
				'MCP transport attempted to access a different endpoint.',
			);
		const headers = new Headers(
			init?.headers ?? (input instanceof Request ? input.headers : undefined),
		);
		if (server.authentication.kind === 'headers') {
			for (const header of server.authentication.headers) {
				const value = await options.getCredential(header.credentialId);
				if (!value)
					throw new MCPConnectionError(
						'Missing credentials. Add a key in Franklin Connections settings.',
					);
				if (/[\r\n]/.test(value))
					throw new MCPConnectionError('Invalid credential header value.');
				secrets.add(value);
				headers.set(header.name, value);
				const sent = headers.get(header.name) ?? value;
				secrets.add(sent);
				if (header.name.toLowerCase() === 'authorization') {
					const token = /^(?:Bearer|Basic)\s+(.+)$/i.exec(sent)?.[1];
					if (token) secrets.add(token);
				}
			}
		}
		signal.throwIfAborted();
		const response = await send(input, {
			...init,
			headers,
			redirect: 'manual',
			credentials: 'omit',
			signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]),
		});
		if (response.status >= 300 && response.status < 400) {
			await response.arrayBuffer().catch(() => {});
			throw new MCPConnectionError(
				'MCP redirects are unsupported. Configure the final endpoint.',
			);
		}
		if ([401, 403, 429].includes(response.status)) {
			await response.arrayBuffer().catch(() => {});
			throw new MCPConnectionError(
				response.status === 429
					? 'MCP rate limit reached. Retry later.'
					: 'MCP access denied. Check credentials and tool access in Connections settings.',
			);
		}
		return response;
	};
}

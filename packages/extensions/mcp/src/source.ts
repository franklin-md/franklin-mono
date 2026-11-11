import type {
	MCPServerConfig,
	ToolSource,
	ToolSourceTool,
} from '@franklin/agent';
import type { NetworkPermissions } from '@franklin/lib';
import { MCPConnection } from './connection.js';
import { connectionErrorMessage, MCPConnectionError } from './errors.js';
import { EXA_RESEARCH_TOOLS } from './exa.js';
import type {
	MCPConnectionOptions,
	MCPConnectionStatus,
	MCPConsumer,
} from './types.js';

export class MCPToolSource implements ToolSource {
	private readonly connections = new Map<string, MCPConnection>();
	private readonly unsubscribe: Array<() => void>;
	private disposed = false;

	constructor(
		private readonly options: MCPConnectionOptions,
		private readonly getPermissions: () => Promise<NetworkPermissions>,
		private readonly consumer: MCPConsumer,
		private readonly status: (id: string, status: MCPConnectionStatus) => void,
	) {
		this.unsubscribe = [
			options.subscribeConfiguration(() => this.reconcile()),
			options.subscribeCredentials((id) => this.reconcile(id)),
		];
	}

	private servers(): readonly MCPServerConfig[] {
		return this.options
			.getServers()
			.filter(
				(server) =>
					server.enabled &&
					(this.consumer === 'chat' || server.preset === 'exa'),
			);
	}

	private reconcile(credentialId?: string): void {
		const servers = this.servers();
		for (const [id, connection] of this.connections) {
			const next = servers.find((server) => server.id === id);
			const credentialChanged =
				credentialId &&
				connection.config.authentication.kind === 'headers' &&
				connection.config.authentication.headers.some(
					(header) => header.credentialId === credentialId,
				);
			if (
				!next ||
				JSON.stringify(next) !== JSON.stringify(connection.config) ||
				credentialChanged
			) {
				connection.abort();
				this.connections.delete(id);
				this.status(id, { state: 'disconnected' });
			}
		}
	}

	async prepare(signal: AbortSignal): Promise<ToolSourceTool[]> {
		if (this.disposed) return [];
		this.reconcile();
		const results = await Promise.all(
			this.servers().map(async (server) => {
				let connection = this.connections.get(server.id);
				if (!connection) {
					const snapshot = structuredClone(server);
					connection = new MCPConnection(
						snapshot,
						this.options,
						this.getPermissions,
						() => {
							const current = this.servers().find(
								(item) => item.id === server.id,
							);
							if (
								!current ||
								JSON.stringify(current) !== JSON.stringify(snapshot)
							)
								throw new MCPConnectionError(
									'Connection settings changed. Retry on the next turn.',
								);
						},
					);
					this.connections.set(server.id, connection);
				}
				try {
					if (connection.dirty) {
						this.status(server.id, { state: 'connecting' });
						await connection.discover(signal);
						this.status(server.id, {
							state: 'connected',
							checkedAt: Date.now(),
							tools: connection.catalog(),
						});
					}
					return connection.descriptors(
						(name) =>
							this.consumer === 'chat' ||
							(EXA_RESEARCH_TOOLS as readonly string[]).includes(name),
					);
				} catch (error) {
					this.status(server.id, {
						state: 'error',
						checkedAt: Date.now(),
						message: connectionErrorMessage(error),
					});
					connection.abort();
					this.connections.delete(server.id);
					return [];
				}
			}),
		);
		return results.flat();
	}

	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		for (const unsubscribe of this.unsubscribe) unsubscribe();
		await Promise.allSettled(
			[...this.connections.values()].map((connection) => connection.dispose()),
		);
		this.connections.clear();
	}
}

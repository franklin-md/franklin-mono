import type { MCPServerConfig } from '@franklin/agent';
import type { NetworkPermissions } from '@franklin/lib';

export type MCPConnectionStatus = {
	state: 'disconnected' | 'connecting' | 'connected' | 'error';
	message?: string;
	checkedAt?: number;
	tools?: Array<{ name: string; description: string }>;
};

export type MCPConnectionOptions = {
	getServers(): readonly MCPServerConfig[];
	getCredential(id: string): Promise<string | undefined>;
	subscribeConfiguration(listener: () => void): () => void;
	subscribeCredentials(listener: (credentialId: string) => void): () => void;
	createFetch(getPermissions: () => Promise<NetworkPermissions>): typeof fetch;
};

export type MCPConsumer = 'chat' | 'research';

import type {
	LocalMcpOptions,
	LocalMcpTransport,
	McpServerConfig,
} from './types.js';

export interface LocalMcp {
	readonly config: McpServerConfig;
	dispose(): Promise<void>;
}

export async function createLocalMcp(
	options: LocalMcpOptions,
	transport: LocalMcpTransport,
): Promise<LocalMcp> {
	const config = await transport.start(options.tools);

	return {
		config: { ...config, name: options.name },
		async dispose() {
			await transport.dispose();
		},
	};
}

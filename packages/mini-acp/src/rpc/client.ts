import { bindJsonRpcClient } from '@franklin/lib/transport';
import type { ClientBinding, MiniACPRpcProtocol } from './types.js';
import {
	miniACPRpcClientDescriptor,
	miniACPRpcServerDescriptor,
} from './manifest.js';

export function bindMiniACPRpcClient(
	duplex: MiniACPRpcProtocol,
): ClientBinding {
	const connection = bindJsonRpcClient({
		duplex,
		server: miniACPRpcServerDescriptor,
		client: miniACPRpcClientDescriptor,
	});
	return {
		...connection,
		bind(server) {
			return connection.bind({
				...server,
				prepareContext: async (params) => {
					await server.prepareContext?.(params);
				},
			});
		},
	};
}

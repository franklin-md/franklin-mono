import { bindJsonRpcClient } from '@franklin/lib/transport';
import type { ClientBinding, MiniACPRpcProtocol } from './types.js';
import {
	miniACPRpcClientDescriptor,
	miniACPRpcServerDescriptor,
} from './manifest.js';

export function bindMiniACPRpcClient(
	duplex: MiniACPRpcProtocol,
): ClientBinding {
	return bindJsonRpcClient({
		duplex,
		server: miniACPRpcServerDescriptor,
		client: miniACPRpcClientDescriptor,
	});
}

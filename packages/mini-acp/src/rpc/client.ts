import { bindJsonRpcClient } from '@franklin/lib/transport';
import type { ClientBinding, ClientProtocol } from './types.js';
import {
	miniACPRpcClientDescriptor,
	miniACPRpcServerDescriptor,
} from './manifest.js';

export function bindMiniACPRpcClient(duplex: ClientProtocol): ClientBinding {
	return bindJsonRpcClient({
		duplex,
		server: miniACPRpcServerDescriptor,
		client: miniACPRpcClientDescriptor,
	});
}

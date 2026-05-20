import { bindJsonRpcServer } from '@franklin/lib/transport';
import type { AgentBinding, MiniACPRpcProtocol } from './types.js';
import {
	miniACPRpcClientDescriptor,
	miniACPRpcServerDescriptor,
} from './manifest.js';

export function bindMiniACPRpcAgent(duplex: MiniACPRpcProtocol): AgentBinding {
	return bindJsonRpcServer({
		duplex,
		server: miniACPRpcServerDescriptor,
		client: miniACPRpcClientDescriptor,
	});
}

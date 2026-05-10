import { bindJsonRpcServer } from '@franklin/lib/transport';
import type { AgentBinding, AgentProtocol } from './types.js';
import {
	miniACPRpcClientDescriptor,
	miniACPRpcServerDescriptor,
} from './manifest.js';

export function bindMiniACPRpcAgent(duplex: AgentProtocol): AgentBinding {
	return bindJsonRpcServer({
		duplex,
		server: miniACPRpcServerDescriptor,
		client: miniACPRpcClientDescriptor,
	});
}

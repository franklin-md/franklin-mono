import type {
	Duplex,
	JsonRpcMessage,
	PeerBinding,
} from '@franklin/lib/transport';
import type { MuAgent, MuClient } from '../protocol/types.js';

export type MiniACPRpcProtocol = Duplex<JsonRpcMessage>;

export type ClientBinding = PeerBinding<MuClient, MuAgent>;
export type AgentBinding = PeerBinding<MuAgent, MuClient>;

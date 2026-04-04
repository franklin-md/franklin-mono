import type { TurnClient, TurnServer } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { JsonRpcMessage, Duplex } from '@franklin/transport';

// Agent side (client calls agent)
export interface MuClient extends TurnClient {
	// Session management
	initialize(): Promise<void>;
	setContext(ctx: Partial<Ctx>): Promise<void>;
}

export type MuAgent = TurnServer;

// TODO: Can we regain the types again?
export type ClientProtocol = Duplex<JsonRpcMessage>;
export type AgentProtocol = Duplex<JsonRpcMessage>;

export type MuProtocol = ClientProtocol;

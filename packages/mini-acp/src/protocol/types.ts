import type { TurnClient, TurnServer } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { JsonRpcMessage, Duplex } from '@franklin/transport';

export type AgentCtx = { ctx: Partial<Ctx> };
export type InitializeParams = Record<string, never>;
export type InitializeResult = Record<string, never>;

// Agent side (client calls agent)
export interface MuClient extends TurnClient {
	// Session management
	initialize(params: InitializeParams): Promise<InitializeResult>;
	setContext(params: AgentCtx): Promise<InitializeResult>;
}

export type MuAgent = TurnServer;

// TODO: Can we regain the types again?
export type ClientProtocol = Duplex<JsonRpcMessage>;
export type AgentProtocol = Duplex<JsonRpcMessage>;

export type MuProtocol = ClientProtocol;

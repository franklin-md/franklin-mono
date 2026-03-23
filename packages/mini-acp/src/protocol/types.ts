import type { TurnClient, TurnAgent } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { Protocol, ReadType, WriteType } from '@franklin/transport';

export type AgentCtx = { ctx: Partial<Ctx> };
export type InitializeParams = Record<string, never>;
export type InitializeResult = Record<string, never>;

// Agent side (client calls agent)
export interface MuClient extends TurnClient {
	// Session management
	initialize(params: InitializeParams): Promise<InitializeResult>;
	setContext(params: AgentCtx): Promise<InitializeResult>;
}

export type MuAgent = TurnAgent;

export type ClientProtocol = Protocol<MuClient, MuAgent>;
export type AgentProtocol = Protocol<MuAgent, MuClient>;

export type MuClientWrite = WriteType<ClientProtocol>;
export type MuClientReceive = ReadType<ClientProtocol>;

export type MuProtocol = ClientProtocol;

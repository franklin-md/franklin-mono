import type { TurnClient, TurnAgent } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { Protocol, ReadType, WriteType } from '@franklin/transport';

export type AgentCtx = { ctx: Partial<Ctx> };
export type InitializeParams = Record<string, never>;
export type InitializeResult = Record<string, never>;

// Agent side (client calls agent)
export interface MiniACPClient extends TurnClient {
	// Session management
	initialize(params: InitializeParams): Promise<InitializeResult>;
	setContext(params: AgentCtx): Promise<InitializeResult>;
}

export type MiniACPAgent = TurnAgent;

export type ClientProtocol = Protocol<MiniACPClient, MiniACPAgent>;
export type AgentProtocol = Protocol<MiniACPAgent, MiniACPClient>;

export type MiniACPProtocol = ClientProtocol;

export type MiniACPAgentSide = WriteType<MiniACPProtocol>;
export type MiniACPClientSide = ReadType<MiniACPProtocol>;

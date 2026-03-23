import type { TurnClient, TurnAgent } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { Protocol, ReadType, WriteType } from '@franklin/transport';

type AgentCtx = { ctx: Partial<Ctx> };
type InitializeParams = Record<string, never>;

// Agent side (client calls agent)
export interface MiniACPClient extends TurnClient {
	// Session management
	initialize(params: InitializeParams): Promise<void>;
	setContext(params: AgentCtx): Promise<void>;
}

export type MiniACPAgent = TurnAgent;
export type MiniACPProtocol = Protocol<MiniACPClient, MiniACPAgent>;

export type MiniACPAgentSide = WriteType<MiniACPProtocol>;
export type MiniACPClientSide = ReadType<MiniACPProtocol>;

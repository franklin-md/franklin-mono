import type { TurnClient, TurnServer } from '../base/types.js';
import type { CtxPatch } from '../types/context.js';

// Agent side (client calls agent)
export interface MuClient extends TurnClient {
	// Session management
	initialize(): Promise<void>;
	setContext(ctx: CtxPatch): Promise<void>;
}

export type MuAgent = TurnServer;

export type MiniACPClientHandle = MuClient & { dispose(): Promise<void> };

export type MiniACPConnector = (
	server: MuAgent,
) => MiniACPClientHandle | Promise<MiniACPClientHandle>;

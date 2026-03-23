import type { Multiplexer, MuxPacket } from '@franklin/transport';
import type { MiniACPAgentSide, MiniACPClientSide } from '@franklin/mini-acp';

export type AgentServerMux = Multiplexer<MiniACPClientSide, MiniACPAgentSide>; // Server Side = Side that handles toolExecute
export type AgentClientMux = Multiplexer<MiniACPAgentSide, MiniACPClientSide>; // Client Side = Side that handles prompt
export type AgentMuxUp = MuxPacket<MiniACPAgentSide>;
export type AgentMuxDown = MuxPacket<MiniACPClientSide>;

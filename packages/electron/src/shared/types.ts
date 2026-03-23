import type { Multiplexer, MuxPacket } from '@franklin/transport';
import type { MiniACPAgentSide, MiniACPClientSide } from '@franklin/mini-acp';

export type ClientMux = Multiplexer<MiniACPAgentSide, MiniACPClientSide>;
export type ServerMux = Multiplexer<MiniACPClientSide, MiniACPAgentSide>;

export type ClientSendMux = MuxPacket<MiniACPClientSide>;
export type ClientReceiveMux = MuxPacket<MiniACPAgentSide>;

export type ServerSendMux = ClientReceiveMux;
export type ServerReceiveMux = ClientSendMux;

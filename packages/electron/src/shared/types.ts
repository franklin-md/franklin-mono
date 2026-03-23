import type { Multiplexer, MuxPacket } from '@franklin/transport';
import type { MiniACPAgentSide, MiniACPClientSide } from '@franklin/mini-acp';
import type {
	DownMessages,
	UpMessages,
} from 'packages/lib/transport/src/jsonrpc/protocol/messages.js';

export type ClientMux = Multiplexer<MiniACPClientSide, MiniACPAgentSide>;
export type ServerMux = Multiplexer<MiniACPAgentSide, MiniACPClientSide>;

export type ClientSendMux = MuxPacket<
	UpMessages<MiniACPClientSide, MiniACPAgentSide>
>;
export type ClientReceiveMux = MuxPacket<
	DownMessages<MiniACPClientSide, MiniACPAgentSide>
>;

export type ServerSendMux = ClientReceiveMux;
export type ServerReceiveMux = ClientSendMux;

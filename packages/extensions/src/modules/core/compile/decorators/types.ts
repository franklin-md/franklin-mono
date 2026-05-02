import type { MiniACPAgent, MiniACPClient } from '@franklin/mini-acp';

export type ProtocolDecorator = {
	readonly name: string;
	readonly server: (server: MiniACPAgent) => Promise<MiniACPAgent>;
	readonly client: (client: MiniACPClient) => Promise<MiniACPClient>;
};

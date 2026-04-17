import type { MiniACPClient, MiniACPAgent } from '@franklin/mini-acp';
import type { Middleware } from '@franklin/lib/middleware';

export type ClientMiddleware = Middleware<MiniACPClient>;
export type ServerMiddleware = Middleware<MiniACPAgent>;

export type FullMiddleware = {
	client: ClientMiddleware;
	server: ServerMiddleware;
};

import { createServer } from 'node:http';

import type { Server } from 'node:http';

import { portManager } from '../port-manager.js';
import { createJsonHandler } from './json-handler.js';

export type Options = {
	handler?: Handler;
	port?: number;
};

export type Handler = (body: unknown) => Promise<unknown>;

export interface HttpCallbackServer {
	readonly port: number;
	readonly url: string;
	onRequest(handler: Handler): void;
	dispose(): Promise<void>;
}

export async function createJSONServer(
	options: Options = {},
): Promise<HttpCallbackServer> {
	const port = options.port ?? (await portManager.allocate());
	let handler = options.handler;
	let disposed = false;

	const server: Server = createServer(createJsonHandler(() => handler));

	await new Promise<void>((resolve) => {
		server.listen(port, '127.0.0.1', () => resolve());
	});

	return {
		port,
		url: `http://127.0.0.1:${port}`,
		onRequest(nextHandler) {
			handler = nextHandler;
		},
		async dispose() {
			if (disposed) return;
			disposed = true;
			portManager.release(port);

			if (!server.listening) return;

			await new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
}

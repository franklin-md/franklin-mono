import { createServer } from 'node:http';

import type { Server } from 'node:http';

import { portManager } from './port-manager.js';
import { createJsonHandler } from './json-handler.js';

export type Options = {
	handler: (body: unknown) => Promise<unknown>;
	port?: number;
};

export interface HttpCallbackServer {
	readonly port: number;
	readonly url: string;
	dispose(): Promise<void>;
}

// Creates a server that listens for JSON requests and then dispatches them to a callback

export async function createJSONServer(
	options: Options,
): Promise<HttpCallbackServer> {
	const port = options.port ?? (await portManager.allocate());

	const server: Server = createServer(createJsonHandler(options.handler));

	await new Promise<void>((resolve) => {
		server.listen(port, '127.0.0.1', () => resolve());
	});

	return {
		port,
		url: `http://127.0.0.1:${port}`,

		async dispose() {
			portManager.release(port);
			await new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
}

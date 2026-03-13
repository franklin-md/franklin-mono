import { createServer } from 'node:http';

import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import { portManager } from './port-manager.js';

export interface HttpCallbackServer {
	readonly port: number;
	readonly url: string;
	onRequest(handler: (body: unknown) => Promise<unknown>): void;
	dispose(): Promise<void>;
}

export async function createHttpCallbackServer(options?: {
	port?: number;
}): Promise<HttpCallbackServer> {
	const port = options?.port ?? (await portManager.allocate());

	let handler: ((body: unknown) => Promise<unknown>) | undefined;

	const server: Server = createServer(
		(req: IncomingMessage, res: ServerResponse) => {
			if (req.method !== 'POST') {
				res.writeHead(405, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Method not allowed' }));
				return;
			}

			const chunks: Buffer[] = [];
			req.on('data', (chunk: Buffer) => chunks.push(chunk));
			req.on('end', () => {
				void (async () => {
					try {
						const body: unknown = JSON.parse(Buffer.concat(chunks).toString());

						if (!handler) {
							res.writeHead(503, {
								'Content-Type': 'application/json',
							});
							res.end(JSON.stringify({ error: 'No handler registered' }));
							return;
						}

						const result: unknown = await handler(body);
						res.writeHead(200, {
							'Content-Type': 'application/json',
						});
						res.end(JSON.stringify(result));
					} catch (err) {
						res.writeHead(500, {
							'Content-Type': 'application/json',
						});
						res.end(
							JSON.stringify({
								error: err instanceof Error ? err.message : 'Internal error',
							}),
						);
					}
				})();
			});
		},
	);

	await new Promise<void>((resolve) => {
		server.listen(port, '127.0.0.1', () => resolve());
	});

	return {
		port,
		url: `http://127.0.0.1:${port}`,
		onRequest(h) {
			handler = h;
		},
		async dispose() {
			portManager.release(port);
			await new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
}

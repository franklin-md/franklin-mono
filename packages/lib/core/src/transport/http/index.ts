import { createServer } from 'node:http';

import type { Server } from 'node:http';

import { createJsonHandler } from './json-handler.js';

export type HttpServerOptions = {
	port: number;
};

type Handler = (body: unknown) => Promise<unknown>;
export class HttpJsonServer {
	public readonly url: string;
	private readonly port: number;
	private server: Server | undefined;
	private handler: Handler | undefined;

	constructor(options: HttpServerOptions) {
		this.url = `http://127.0.0.1:${options.port}`;
		this.port = options.port;
	}

	public onRequest(handler: Handler): void {
		this.handler = handler;
	}

	async start(): Promise<void> {
		if (!this.handler) {
			throw new Error('Handler not set');
		}
		const server = createServer(createJsonHandler(this.handler));
		this.server = server;
		await new Promise<void>((resolve) => {
			server.listen(this.port, '127.0.0.1', () => resolve());
		});
	}

	async stop(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			if (!this.server) {
				resolve();
				return;
			}
			this.server.close((err) => (err ? reject(err) : resolve()));
		});
	}
}

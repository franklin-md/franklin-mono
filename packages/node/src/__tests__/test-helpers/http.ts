import { createServer, type Server, type RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface HttpTestServer {
	close(): Promise<void>;
	url(path?: string): string;
}

export async function createHttpTestServer(
	handler: RequestListener,
): Promise<HttpTestServer> {
	const server = createServer(handler);
	await listen(server);

	const address = server.address();
	if (!address || typeof address === 'string') {
		await closeServer(server);
		throw new Error('Expected server to listen on a TCP port');
	}

	return {
		async close() {
			await closeServer(server);
		},
		url(path: string = '/') {
			return new URL(path, originFromAddress(address)).toString();
		},
	};
}

async function listen(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		const onError = (error: Error) => {
			server.off('listening', onListening);
			reject(error);
		};
		const onListening = () => {
			server.off('error', onError);
			resolve();
		};

		server.once('error', onError);
		server.once('listening', onListening);
		server.listen(0, '127.0.0.1');
	});
}

async function closeServer(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

function originFromAddress(address: AddressInfo): string {
	return `http://127.0.0.1:${address.port}`;
}

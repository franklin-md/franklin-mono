import type { Server } from 'node:http';

export async function listen(
	server: Server,
	port: number,
	host: string,
): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const onError = (err: Error): void => {
			server.off('listening', onListening);
			reject(err);
		};
		const onListening = (): void => {
			server.off('error', onError);
			const address = server.address();
			if (typeof address !== 'object' || address === null) {
				reject(new Error('failed to read bound port from server address'));
				return;
			}
			resolve(address.port);
		};
		server.once('error', onError);
		server.once('listening', onListening);
		server.listen(port, host);
	});
}

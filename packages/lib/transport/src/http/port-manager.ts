import { createServer } from 'node:net';

/**
 * Allocates OS-assigned ephemeral ports.
 *
 * Uses net.createServer().listen(0) to let the OS pick a free port,
 * then immediately closes the server and returns the port number.
 */
export class PortManager {
	private readonly allocated = new Set<number>();

	async allocate(): Promise<number> {
		const port = await new Promise<number>((resolve, reject) => {
			const server = createServer();
			server.listen(0, '127.0.0.1', () => {
				const addr = server.address();
				if (typeof addr !== 'object' || addr === null) {
					server.close();
					reject(new Error('Failed to get port from server address'));
					return;
				}
				const { port: assignedPort } = addr;
				server.close(() => resolve(assignedPort));
			});
			server.on('error', reject);
		});

		this.allocated.add(port);
		return port;
	}

	release(port: number): void {
		this.allocated.delete(port);
	}
}

export const portManager = new PortManager();

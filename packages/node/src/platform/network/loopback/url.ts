import type { IncomingMessage } from 'node:http';

export function buildRequestUrl(
	request: IncomingMessage,
	host: string,
	port: number,
): string {
	return `http://${host}:${port}${request.url ?? '/'}`;
}

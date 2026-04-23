import type { IncomingMessage } from 'node:http';

export async function readBody(
	request: IncomingMessage,
): Promise<string | undefined> {
	if (request.method === 'GET' || request.method === 'HEAD') return undefined;
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(chunk as Buffer);
	}
	if (chunks.length === 0) return undefined;
	return Buffer.concat(chunks).toString('utf8');
}

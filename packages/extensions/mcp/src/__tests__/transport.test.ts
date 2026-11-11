import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from 'node:http';
import { once } from 'node:events';
import {
	Client,
	StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { nodeHttpFetch } from '@franklin/node';
import { expect, it } from 'vitest';

it('runs the real SDK over renderer-safe JSON and split SSE responses without retrying a failed tool call', async () => {
	const calls: string[] = [];
	const handle = async (req: IncomingMessage, res: ServerResponse) => {
		if (req.method === 'GET') {
			res.writeHead(405).end();
			return;
		}
		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		const message = JSON.parse(Buffer.concat(chunks).toString()) as {
			method: string;
			id?: number;
		};
		calls.push(message.method);
		expect(req.headers['x-api-key']).toBe('fixture-key');
		if (!('id' in message)) {
			res.writeHead(202).end();
			return;
		}
		if (message.method === 'tools/call') {
			res.writeHead(500).end('uncertain submission');
			return;
		}
		const result =
			message.method === 'initialize'
				? {
						protocolVersion: '2025-11-25',
						capabilities: { tools: {} },
						serverInfo: { name: 'fixture', version: '1' },
					}
				: { tools: [{ name: 'search', inputSchema: { type: 'object' } }] };
		const body = JSON.stringify({ jsonrpc: '2.0', id: message.id, result });
		if (message.method === 'tools/list') {
			res.writeHead(200, { 'content-type': 'text/event-stream' });
			res.write('data: ' + body.slice(0, 20));
			setTimeout(() => res.end(body.slice(20) + '\n\n'), 5);
		} else res.writeHead(200, { 'content-type': 'application/json' }).end(body);
	};
	const server = createServer((req, res) => {
		void handle(req, res).catch((error: unknown) =>
			res.destroy(error as Error),
		);
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('no port');
	const client = new Client({ name: 'franklin-test', version: '1' });
	try {
		await client.connect(
			new StreamableHTTPClientTransport(
				new URL(`http://127.0.0.1:${address.port}/mcp`),
				{
					fetch: nodeHttpFetch,
					requestInit: { headers: { 'x-api-key': 'fixture-key' } },
				},
			),
		);
		expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
			'search',
		]);
		await expect(
			client.callTool({ name: 'search', arguments: {} }),
		).rejects.toThrow();
		expect(calls.filter((c) => c === 'tools/call')).toHaveLength(1);
	} finally {
		await client.close();
		server.closeAllConnections();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
});

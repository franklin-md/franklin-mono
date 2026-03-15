import type { IncomingMessage, ServerResponse } from 'http';

export function createJsonHandler(
	callback: (body: unknown) => Promise<unknown>,
) {
	return (req: IncomingMessage, res: ServerResponse) => {
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

					const result: unknown = await callback(body);
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
	};
}

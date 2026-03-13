import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { HttpLocalMcpTransport } from '../transports/http/index.js';

import type { ToolDefinition } from '../tools/types.js';

const echoSchema = z.object({ message: z.string() });

function echoTool(
	handler: (args: z.infer<typeof echoSchema>) => Promise<{ echo: string }>,
): ToolDefinition<z.infer<typeof echoSchema>> {
	return {
		name: 'echo',
		description: 'Echo back the input',
		schema: echoSchema,
		handler,
	};
}

describe('HttpLocalMcpTransport', () => {
	const transports: HttpLocalMcpTransport[] = [];

	afterEach(async () => {
		while (transports.length > 0) {
			const t = transports.pop();
			if (t) await t.dispose();
		}
	});

	it('starts a callback server and returns relay config', async () => {
		const transport = new HttpLocalMcpTransport();
		transports.push(transport);

		const config = await transport.start([
			echoTool(async (args) => ({ echo: args.message })),
		]);

		expect(config.command).toBe(process.execPath);
		expect(config.args).toHaveLength(1);
		expect(config.env).toHaveLength(2);

		const callbackUrl = config.env.find(
			(e) => e.name === 'FRANKLIN_CALLBACK_URL',
		);
		expect(callbackUrl).toBeDefined();
		expect(callbackUrl!.value).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	});

	it('dispatches tool calls to the right handler via HTTP', async () => {
		const handler = vi.fn(async (args: z.infer<typeof echoSchema>) => ({
			echo: args.message,
		}));

		const transport = new HttpLocalMcpTransport();
		transports.push(transport);

		const config = await transport.start([echoTool(handler)]);

		const callbackUrl = config.env.find(
			(e) => e.name === 'FRANKLIN_CALLBACK_URL',
		)!.value;

		// Simulate what the relay would do: POST to the callback URL
		const response = await fetch(callbackUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tool: 'echo', arguments: { message: 'hello' } }),
		});

		expect(response.status).toBe(200);
		const result = (await response.json()) as { echo: string };
		expect(result.echo).toBe('hello');
		expect(handler).toHaveBeenCalledWith({ message: 'hello' });
	});
});

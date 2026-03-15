import { spawn } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import { StdioTransport } from '../stdio.js';

describe('StdioTransport', () => {
	const transports: StdioTransport[] = [];

	afterEach(async () => {
		while (transports.length > 0) {
			const t = transports.pop();
			if (t) await t.close();
		}
	});

	it('spawns a subprocess and exposes readable/writable streams', () => {
		const transport = new StdioTransport({ command: 'cat' });
		transports.push(transport);

		expect(transport.readable).toBeDefined();
		expect(transport.writable).toBeDefined();
	});

	it('child_process kill works in vitest (sanity check)', async () => {
		const p = spawn('cat', [], { stdio: ['pipe', 'pipe', 'inherit'] });
		const exited = new Promise<void>((resolve) => {
			p.on('exit', () => resolve());
		});
		p.kill();
		await exited;
	});

	it('close kills the subprocess', async () => {
		const transport = new StdioTransport({ command: 'cat' });
		await transport.close();
		// Calling close again is a no-op (process already exited)
		await transport.close();
	});

	it('round-trips a JSON-RPC message through cat', async () => {
		const transport = new StdioTransport({ command: 'cat' });
		transports.push(transport);

		const writer = transport.writable.getWriter();
		const reader = transport.readable.getReader();

		const msg = { jsonrpc: '2.0' as const, method: 'test/ping', id: 1 };
		await writer.write(msg);

		const { value } = await reader.read();
		expect(value).toEqual(msg);

		reader.releaseLock();
		writer.releaseLock();
	});
});

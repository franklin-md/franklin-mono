import { describe, expect, it } from 'vitest';

import { bridge } from '../duplex/bridge.js';
import { serve } from '../duplex/serve.js';
import { createMemoryStream } from '../../in-memory/index.js';
import type { BridgeRequest, BridgeResponse } from '../duplex/bridge.js';

/**
 * Wires a bridge (caller) to a serve (handler) via in-memory streams.
 */
function createBridgeServePair<Req, Res>(
	handler: (request: Req) => Promise<Res>,
) {
	const { handler: call, duplex: callerDuplex } = bridge<Req, Res>();

	const toServer = createMemoryStream<BridgeRequest<Req>, BridgeRequest<Req>>();
	const toClient = createMemoryStream<
		BridgeResponse<Res>,
		BridgeResponse<Res>
	>();

	// caller.readable → toServer → server.readable
	// server.writable → toClient → caller.writable
	void callerDuplex.readable.pipeTo(toServer.writable);
	void toClient.readable.pipeTo(callerDuplex.writable);

	serve(
		{
			readable: toServer.readable,
			writable: toClient.writable,
			close: async () => {
				await toServer.close();
				await toClient.close();
			},
		},
		handler,
	);

	return {
		call,
		close: async () => {
			await callerDuplex.close();
			await toServer.close().catch(() => {});
			await toClient.close().catch(() => {});
		},
	};
}

describe('serve', () => {
	it('dispatches requests to the handler and returns responses', async () => {
		const { call, close } = createBridgeServePair<string, string>(
			async (req) => `echo: ${req}`,
		);

		const result = await call('hello');
		expect(result).toBe('echo: hello');

		await close();
	});

	it('handler errors become BridgeErrorResponse', async () => {
		const { call, close } = createBridgeServePair<string, string>(async () => {
			throw new Error('boom');
		});

		await expect(call('fail')).rejects.toThrow('boom');

		await close();
	});

	it('handles multiple concurrent requests', async () => {
		const { call, close } = createBridgeServePair<number, number>(
			async (n) => n * 2,
		);

		const results = await Promise.all([call(1), call(2), call(3)]);
		expect(results).toEqual([2, 4, 6]);

		await close();
	});

	it('locks the writable — second serve() on the same duplex throws', () => {
		const duplex = {
			readable: new ReadableStream<BridgeRequest<string>>(),
			writable: new WritableStream<BridgeResponse<string>>(),
			close: async () => {},
		};

		// First serve() locks the writable via callable()
		serve(duplex, async (req) => `echo: ${req}`);

		// Second serve() on the same duplex should throw because writable is locked
		expect(() => {
			serve(duplex, async (req) => `echo2: ${req}`);
		}).toThrow();
	});
});

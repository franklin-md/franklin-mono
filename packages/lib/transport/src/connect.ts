import type { Pipe } from './pipe.js';

export interface Connection {
	/** Stops both pump directions and closes the connected streams. */
	dispose(): Promise<void>;
}

/**
 * Bidirectionally connects two Pipes by pumping bytes between them:
 *
 *   a.readable → b.writable
 *   b.readable → a.writable
 *
 * Returns a Connection whose `dispose()` cancels both directions
 * and cleanly closes the destination writables (so readers see EOF,
 * not an abort error).
 */
export function connect(a: Pipe, b: Pipe): Connection {
	const abort = new AbortController();

	const aToB = pump(a.readable, b.writable, abort.signal);
	const bToA = pump(b.readable, a.writable, abort.signal);

	return {
		async dispose() {
			abort.abort();
			await Promise.all([aToB, bToA]);
		},
	};
}

async function pump(
	readable: ReadableStream<Uint8Array>,
	writable: WritableStream<Uint8Array>,
	signal: AbortSignal,
): Promise<void> {
	const reader = readable.getReader();
	const writer = writable.getWriter();

	// Cancel the reader when abort fires — unblocks any pending read()
	const onAbort = (): void => void reader.cancel();
	signal.addEventListener('abort', onAbort, { once: true });

	try {
		let result = await reader.read();
		while (!result.done) {
			await writer.write(result.value);
			result = await reader.read();
		}
	} catch {
		// Reader cancelled or writer errored — expected during dispose
	} finally {
		signal.removeEventListener('abort', onAbort);
		reader.releaseLock();
		await writer.close().catch(() => {});
		writer.releaseLock();
	}
}

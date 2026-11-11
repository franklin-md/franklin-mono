import type { Readable } from 'node:stream';

/** Bridge by demand so cancellation cannot race a queued Node data-event enqueue. */
export function toWebBody(
	body: Readable,
): ReadableStream<Uint8Array<ArrayBuffer>> {
	const iterator = body[Symbol.asyncIterator]() as AsyncIterator<Uint8Array>;
	let cancelled = false;
	return new ReadableStream({
		async pull(controller) {
			try {
				const next = await iterator.next();
				if (cancelled) return;
				if (next.done) controller.close();
				else controller.enqueue(new Uint8Array(next.value));
			} catch (error) {
				if (!cancelled) controller.error(error);
			}
		},
		async cancel() {
			cancelled = true;
			body.destroy();
			try {
				await iterator.return?.();
			} catch {
				/* A pending read may have been aborted by destroy. */
			}
		},
	});
}
